import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import Decimal from 'decimal.js';
import { MealDefaultEntity } from '../../database/entities/meal-default.entity';
import { MealRuleEntity } from '../../database/entities/meal-rule.entity';
import { MealOverrideEntity } from '../../database/entities/meal-override.entity';
import { MealFinalEntity } from '../../database/entities/meal-final.entity';
import { MessEntity } from '../../database/entities/mess.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { MealResolver } from '../../domain/meal-resolver/meal-resolver';
import {
  SetMealDefaultDto,
  SetMealToggleDto,
  SetMealRangeDto,
  SetMealOverrideDto,
  ManagerForceMealDto
} from './dto/meal.dto';
import {
  SlotType,
  RuleKind,
  OverrideSource,
  getDhakaDateString,
  getDhakaTimeString,
  getNextDateString,
  ShopperDailySummaryDto
} from '@mess/shared';

@Injectable()
export class MealsService {
  constructor(
    @InjectRepository(MealDefaultEntity)
    private defaultRepo: Repository<MealDefaultEntity>,
    @InjectRepository(MealRuleEntity)
    private ruleRepo: Repository<MealRuleEntity>,
    @InjectRepository(MealOverrideEntity)
    private overrideRepo: Repository<MealOverrideEntity>,
    @InjectRepository(MealFinalEntity)
    private finalRepo: Repository<MealFinalEntity>,
    @InjectRepository(MessEntity)
    private messRepo: Repository<MessEntity>,
    @InjectRepository(MembershipEntity)
    private membershipRepo: Repository<MembershipEntity>,
    @InjectRepository(AuditLogEntity)
    private auditRepo: Repository<AuditLogEntity>
  ) {}

  /**
   * Sets or updates permanent default meal preferences.
   */
  async setDefault(membershipId: string, dto: SetMealDefaultDto) {
    let def = await this.defaultRepo.findOne({
      where: { membershipId },
      order: { createdAt: 'DESC' }
    });

    const todayStr = getDhakaDateString();

    if (!def) {
      def = this.defaultRepo.create({
        membershipId,
        mealType: dto.mealType,
        halfSlot: dto.halfSlot ?? null,
        eggPreference: dto.eggPreference,
        effectiveFrom: todayStr
      });
    } else {
      def.mealType = dto.mealType;
      def.halfSlot = dto.halfSlot ?? null;
      if (dto.eggPreference) def.eggPreference = dto.eggPreference;
      def.effectiveFrom = todayStr;
    }

    return this.defaultRepo.save(def);
  }

  /**
   * Sets continuous on/off toggle.
   */
  async setToggle(membershipId: string, dto: SetMealToggleDto) {
    const fromDate = dto.fromDate || getDhakaDateString();
    const rule = this.ruleRepo.create({
      membershipId,
      fromDate,
      toDate: null,
      status: dto.status,
      kind: RuleKind.TOGGLE
    });
    return this.ruleRepo.save(rule);
  }

  /**
   * Sets date range leave rule.
   */
  async setRange(membershipId: string, dto: SetMealRangeDto) {
    if (dto.fromDate > dto.toDate) {
      throw new BadRequestException('From date cannot be after to date');
    }
    const rule = this.ruleRepo.create({
      membershipId,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      status: dto.status,
      kind: RuleKind.RANGE
    });
    return this.ruleRepo.save(rule);
  }

  /**
   * Sets a single-day slot override.
   * Enforces cut-off lock: if the target date is today or tomorrow and current time >= cutoff,
   * boarders cannot modify.
   */
  async setOverride(membershipId: string, dto: SetMealOverrideDto) {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId },
      relations: ['mess']
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    this.verifyNotLocked(membership.mess, dto.date);

    let override = await this.overrideRepo.findOne({
      where: {
        membershipId,
        date: dto.date,
        slot: dto.slot
      }
    });

    if (!override) {
      override = this.overrideRepo.create({
        membershipId,
        date: dto.date,
        slot: dto.slot,
        status: dto.status,
        eggPreference: dto.eggPreference,
        guestCount: dto.guestCount ?? 0,
        source: OverrideSource.BOARDER
      });
    } else {
      override.status = dto.status;
      if (dto.eggPreference) override.eggPreference = dto.eggPreference;
      if (dto.guestCount !== undefined) override.guestCount = dto.guestCount;
      override.source = OverrideSource.BOARDER;
    }

    return this.overrideRepo.save(override);
  }

  /**
   * Manager forces a meal modification after cutoff.
   * Generates audit log and marks record with forcedByManager = true.
   */
  async managerForceMeal(messId: string, actorId: string, dto: ManagerForceMealDto) {
    let finalMeal = await this.finalRepo.findOne({
      where: {
        membershipId: dto.membershipId,
        date: dto.date,
        slot: dto.slot
      }
    });

    const beforeState = finalMeal ? { ...finalMeal } : null;

    if (!finalMeal) {
      finalMeal = this.finalRepo.create({
        membershipId: dto.membershipId,
        date: dto.date,
        slot: dto.slot,
        status: dto.status,
        eggPreference: dto.eggPreference,
        guestCount: dto.guestCount ?? 0,
        forcedByManager: true,
        reason: dto.reason
      });
    } else {
      finalMeal.status = dto.status;
      if (dto.eggPreference) finalMeal.eggPreference = dto.eggPreference;
      if (dto.guestCount !== undefined) finalMeal.guestCount = dto.guestCount;
      finalMeal.forcedByManager = true;
      finalMeal.reason = dto.reason;
    }

    const saved = await this.finalRepo.save(finalMeal);

    // Write audit log
    const audit = this.auditRepo.create({
      messId,
      actorId,
      action: 'MANAGER_FORCE_MEAL',
      entity: 'meal_finals',
      before: beforeState as unknown as Record<string, unknown>,
      after: { ...saved } as unknown as Record<string, unknown>,
      reason: dto.reason
    });
    await this.auditRepo.save(audit);

    return saved;
  }

  /**
   * Generates aggregated summary for shoppers on a given date.
   */
  async getShopperSummary(messId: string, targetDate: string): Promise<ShopperDailySummaryDto> {
    const mess = await this.messRepo.findOne({ where: { id: messId } });
    if (!mess) throw new NotFoundException('Mess not found');

    const members = await this.membershipRepo.find({
      where: { messId, isActive: true }
    });

    let lunchCount = 0;
    let dinnerCount = 0;
    let totalEggCount = 0;
    let totalGuestCount = 0;

    for (const member of members) {
      // Check meal finals first
      const finals = await this.finalRepo.find({
        where: { membershipId: member.id, date: targetDate }
      });

      if (finals.length > 0) {
        for (const f of finals) {
          if (f.status) {
            if (f.slot === SlotType.LUNCH) lunchCount++;
            if (f.slot === SlotType.DINNER) dinnerCount++;
            if (f.eggPreference !== 'NONE') totalEggCount++;
            totalGuestCount += f.guestCount;
          }
        }
      } else {
        // Resolve on the fly if finals not built yet
        const def = await this.defaultRepo.findOne({
          where: { membershipId: member.id },
          order: { createdAt: 'DESC' }
        });
        if (def) {
          const rules = await this.ruleRepo.find({ where: { membershipId: member.id } });
          const overrides = await this.overrideRepo.find({
            where: { membershipId: member.id, date: targetDate }
          });

          const lunch = MealResolver.resolveSlot(SlotType.LUNCH, targetDate, def, rules, overrides);
          if (lunch.status) {
            lunchCount++;
            if (lunch.eggPreference !== 'NONE') totalEggCount++;
            totalGuestCount += lunch.guestCount;
          }

          const dinner = MealResolver.resolveSlot(
            SlotType.DINNER,
            targetDate,
            def,
            rules,
            overrides
          );
          if (dinner.status) {
            dinnerCount++;
            if (dinner.eggPreference !== 'NONE') totalEggCount++;
            totalGuestCount += dinner.guestCount;
          }
        }
      }
    }

    const totalMealUnits = (lunchCount + dinnerCount) * 0.5 + totalGuestCount;
    const estimatedBudget = new Decimal(totalMealUnits).times(mess.mealRate).toFixed(2);

    return {
      date: targetDate,
      messId,
      lunchMeals: lunchCount,
      dinnerMeals: dinnerCount,
      totalMealUnits,
      eggCount: totalEggCount,
      guestCount: totalGuestCount,
      estimatedBudget,
      menu: null
    };
  }

  /**
   * Generates Meal Heatmap matrix for a month.
   */
  async getHeatmap(messId: string, month: string) {
    const startDate = `${month}-01`;
    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year!, m!, 0)).getUTCDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const members = await this.membershipRepo.find({
      where: { messId, isActive: true },
      relations: ['user'],
      order: { joinedAt: 'ASC' }
    });

    const finals = await this.finalRepo.find({
      where: {
        date: Between(startDate, endDate)
      }
    });

    const memberRows = members.map((member) => {
      const memberFinals = finals.filter((f) => f.membershipId === member.id);
      const daysData: Record<string, { lunch: boolean; dinner: boolean; isAutoOff: boolean }> = {};
      let totalMeals = 0;

      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${month}-${String(day).padStart(2, '0')}`;
        const lunchRecord = memberFinals.find(
          (f) => f.date === dateStr && f.slot === SlotType.LUNCH
        );
        const dinnerRecord = memberFinals.find(
          (f) => f.date === dateStr && f.slot === SlotType.DINNER
        );

        const lunch = lunchRecord?.status ?? false;
        const dinner = dinnerRecord?.status ?? false;
        if (lunch) totalMeals += 0.5;
        if (dinner) totalMeals += 0.5;

        daysData[dateStr] = {
          lunch,
          dinner,
          isAutoOff: false
        };
      }

      return {
        member: {
          id: member.id,
          name: member.user?.name || 'Boarder',
          role: member.role
        },
        totalMeals,
        days: daysData
      };
    });

    return {
      month,
      daysInMonth: lastDay,
      rows: memberRows
    };
  }

  private verifyNotLocked(mess: MessEntity, targetDate: string): void {
    const todayStr = getDhakaDateString();
    const tomorrowStr = getNextDateString(todayStr);

    // If date is in the past, always locked
    if (targetDate < todayStr) {
      throw new ForbiddenException('Past meal records are locked and cannot be modified');
    }

    // If date is today, check if cutoff has passed
    const currentTimeStr = getDhakaTimeString();
    if (targetDate === todayStr) {
      throw new ForbiddenException('Today meal changes are locked');
    }

    // If date is tomorrow, check against cutoff time
    if (targetDate === tomorrowStr && currentTimeStr >= mess.cutoffTime) {
      throw new ForbiddenException(
        `Next day meals are locked after the mess cutoff time (${mess.cutoffTime})`
      );
    }
  }
}
