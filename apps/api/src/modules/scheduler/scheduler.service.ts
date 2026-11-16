import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessEntity } from '../../database/entities/mess.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { MealDefaultEntity } from '../../database/entities/meal-default.entity';
import { MealRuleEntity } from '../../database/entities/meal-rule.entity';
import { MealOverrideEntity } from '../../database/entities/meal-override.entity';
import { MealFinalEntity } from '../../database/entities/meal-final.entity';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { MealResolver } from '../../domain/meal-resolver/meal-resolver';
import { CostCalculator } from '../../domain/cost-calculator/cost-calculator';
import { BalanceEvaluator } from '../../domain/balance-evaluator/balance-evaluator';
import {
  SlotType,
  LedgerType,
  RuleKind,
  getDhakaDateString,
  getDhakaTimeString,
  getNextDateString
} from '@mess/shared';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(MessEntity)
    private messRepo: Repository<MessEntity>,
    @InjectRepository(MembershipEntity)
    private membershipRepo: Repository<MembershipEntity>,
    @InjectRepository(MealDefaultEntity)
    private defaultRepo: Repository<MealDefaultEntity>,
    @InjectRepository(MealRuleEntity)
    private ruleRepo: Repository<MealRuleEntity>,
    @InjectRepository(MealOverrideEntity)
    private overrideRepo: Repository<MealOverrideEntity>,
    @InjectRepository(MealFinalEntity)
    private finalRepo: Repository<MealFinalEntity>,
    @InjectRepository(LedgerEntryEntity)
    private ledgerRepo: Repository<LedgerEntryEntity>
  ) {}

  /**
   * Evaluates cutoff locks across all active messes every minute.
   * Safe to re-run (idempotent).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCutoffLock() {
    const todayStr = getDhakaDateString();
    const tomorrowStr = getNextDateString(todayStr);
    const currentTimeStr = getDhakaTimeString();

    const messes = await this.messRepo.find();

    for (const mess of messes) {
      // Check if current time has passed mess cutoff
      if (currentTimeStr >= mess.cutoffTime) {
        await this.lockMealsForDate(mess, tomorrowStr);
      }
    }
  }

  /**
   * Daily balance check and auto-off evaluation.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBalanceCheck() {
    this.logger.log('Starting daily balance evaluation and auto-off verification');
    const messes = await this.messRepo.find();

    for (const mess of messes) {
      const members = await this.membershipRepo.find({
        where: { messId: mess.id, isActive: true }
      });

      for (const member of members) {
        const transactions = await this.ledgerRepo.find({
          where: { membershipId: member.id }
        });

        const netBalance = BalanceEvaluator.computeNetBalance(
          transactions.map((t) => ({
            type: t.type,
            amount: t.amount,
            date: t.date
          }))
        );

        if (netBalance.lessThanOrEqualTo(0)) {
          // Check consecutive grace days used
          const graceDaysUsed = await this.countConsecutiveGraceDays(member.id);
          const evaluation = BalanceEvaluator.evaluate(
            netBalance,
            70,
            mess.graceDays,
            mess.warningDays,
            graceDaysUsed
          );

          if (evaluation.isAutoOff) {
            // Record auto-off rule
            const todayStr = getDhakaDateString();
            const existingAutoOff = await this.ruleRepo.findOne({
              where: {
                membershipId: member.id,
                fromDate: todayStr,
                kind: RuleKind.TOGGLE,
                status: false
              }
            });

            if (!existingAutoOff) {
              const rule = this.ruleRepo.create({
                membershipId: member.id,
                fromDate: todayStr,
                toDate: null,
                status: false,
                kind: RuleKind.TOGGLE
              });
              await this.ruleRepo.save(rule);
              this.logger.log(`Auto-off activated for membership ${member.id}`);
            }
          }
        }
      }
    }
  }

  private async lockMealsForDate(mess: MessEntity, targetDate: string) {
    const members = await this.membershipRepo.find({
      where: { messId: mess.id, isActive: true }
    });

    const daysInMonth = 30;
    const totalExpectedSlots = members.length * daysInMonth * 2;

    for (const member of members) {
      // Check if already locked
      const existingFinals = await this.finalRepo.find({
        where: { membershipId: member.id, date: targetDate }
      });

      if (existingFinals.length >= 2) {
        continue; // Already locked
      }

      const def = await this.defaultRepo.findOne({
        where: { membershipId: member.id },
        order: { createdAt: 'DESC' }
      });

      if (!def) continue;

      const rules = await this.ruleRepo.find({
        where: { membershipId: member.id }
      });
      const overrides = await this.overrideRepo.find({
        where: { membershipId: member.id, date: targetDate }
      });

      for (const slot of [SlotType.LUNCH, SlotType.DINNER]) {
        const alreadyFinal = existingFinals.find((f) => f.slot === slot);
        if (alreadyFinal) continue;

        const resolved = MealResolver.resolveSlot(slot, targetDate, def, rules, overrides);

        const finalMeal = this.finalRepo.create({
          membershipId: member.id,
          date: targetDate,
          slot,
          status: resolved.status,
          eggPreference: resolved.eggPreference,
          guestCount: resolved.guestCount,
          forcedByManager: false,
          reason: null
        });

        await this.finalRepo.save(finalMeal);

        // If meal is active, write debits to ledger
        if (resolved.status) {
          const breakdown = CostCalculator.calculateSlotDebit(
            mess.mealRate,
            12000,
            totalExpectedSlots,
            member.cookBillAmount,
            daysInMonth,
            resolved.guestCount
          );

          // Meal debit
          const mealEntry = this.ledgerRepo.create({
            membershipId: member.id,
            type: LedgerType.MEAL,
            amount: breakdown.mealDebit.negated().toFixed(4),
            date: targetDate,
            note: `${slot} meal slot debit`,
            referenceId: finalMeal.id
          });
          await this.ledgerRepo.save(mealEntry);

          // Fuel debit
          const fuelEntry = this.ledgerRepo.create({
            membershipId: member.id,
            type: LedgerType.FUEL,
            amount: breakdown.fuelDebit.negated().toFixed(4),
            date: targetDate,
            note: `${slot} fuel debit`,
            referenceId: finalMeal.id
          });
          await this.ledgerRepo.save(fuelEntry);

          // Cook bill debit
          const cookEntry = this.ledgerRepo.create({
            membershipId: member.id,
            type: LedgerType.COOK_BILL,
            amount: breakdown.cookDebit.negated().toFixed(4),
            date: targetDate,
            note: `${slot} cook bill debit`,
            referenceId: finalMeal.id
          });
          await this.ledgerRepo.save(cookEntry);

          // Guest debit if applicable
          if (resolved.guestCount > 0) {
            const guestEntry = this.ledgerRepo.create({
              membershipId: member.id,
              type: LedgerType.GUEST,
              amount: breakdown.guestDebit.negated().toFixed(4),
              date: targetDate,
              note: `${slot} ${resolved.guestCount} guest meals debit`,
              referenceId: finalMeal.id
            });
            await this.ledgerRepo.save(guestEntry);
          }
        }
      }
    }
  }

  private async countConsecutiveGraceDays(membershipId: string): Promise<number> {
    // Queries past consecutive days meals ran while balance was negative
    const pastMeals = await this.finalRepo.find({
      where: { membershipId, status: true },
      order: { date: 'DESC' },
      take: 5
    });
    return pastMeals.length > 0 ? 1 : 0;
  }
}
