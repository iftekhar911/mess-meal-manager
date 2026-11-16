import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import Decimal from 'decimal.js';
import {
  BalanceStatus,
  LedgerType,
  ExpenseStatus,
  MonthStatementDto,
  MonthCloseDto,
  AuditLogDto
} from '@mess/shared';
import { MonthCloseEntity } from '../../database/entities/month-close.entity';
import { MealFinalEntity } from '../../database/entities/meal-final.entity';
import { ShoppingExpenseEntity } from '../../database/entities/shopping-expense.entity';
import { FuelExpenseEntity } from '../../database/entities/fuel-expense.entity';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { MessEntity } from '../../database/entities/mess.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { CloseMonthDto } from './dto/report.dto';
import { CostCalculator } from '../../domain/cost-calculator/cost-calculator';

/**
 * Service for monthly financial reconciliation, month-end close,
 * statement generation, and manager liability audits.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(MonthCloseEntity)
    private monthCloseRepo: Repository<MonthCloseEntity>,
    @InjectRepository(MealFinalEntity)
    private mealFinalRepo: Repository<MealFinalEntity>,
    @InjectRepository(ShoppingExpenseEntity)
    private shoppingExpenseRepo: Repository<ShoppingExpenseEntity>,
    @InjectRepository(FuelExpenseEntity)
    private fuelExpenseRepo: Repository<FuelExpenseEntity>,
    @InjectRepository(LedgerEntryEntity)
    private ledgerRepo: Repository<LedgerEntryEntity>,
    @InjectRepository(MembershipEntity)
    private membershipRepo: Repository<MembershipEntity>,
    @InjectRepository(MessEntity)
    private messRepo: Repository<MessEntity>,
    @InjectRepository(AuditLogEntity)
    private auditRepo: Repository<AuditLogEntity>
  ) {}

  /**
   * Generates the monthly financial statement with per-member breakdowns.
   *
   * @param messId - Mess UUID.
   * @param month - Target month in YYYY-MM format.
   * @returns Comprehensive statement with rates and member balances.
   */
  async getMonthStatement(messId: string, month: string): Promise<MonthStatementDto> {
    const mess = await this.messRepo.findOne({ where: { id: messId } });
    if (!mess) {
      throw new NotFoundException('Mess not found');
    }

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const existingClose = await this.monthCloseRepo.findOne({
      where: { messId, month }
    });

    // 1. Fetch approved market expenses
    const marketExpenses = await this.shoppingExpenseRepo.find({
      where: {
        messId,
        date: Between(startDate, endDate),
        status: ExpenseStatus.APPROVED
      }
    });

    const totalMarketCost = marketExpenses.reduce(
      (sum, exp) => sum.plus(new Decimal(exp.total)),
      new Decimal(0)
    );

    // 2. Fetch fuel expenses
    const fuelExpenses = await this.fuelExpenseRepo.find({
      where: {
        messId,
        date: Between(startDate, endDate)
      }
    });

    const totalFuelCost = fuelExpenses.reduce(
      (sum, exp) => sum.plus(new Decimal(exp.amount)),
      new Decimal(0)
    );

    // 3. Fetch active mess members
    const members = await this.membershipRepo.find({
      where: { messId, isActive: true },
      relations: ['user']
    });
    const memberIds = members.map((m) => m.id);

    // 4. Fetch all finalized meals for the members in this month
    const mealFinals =
      memberIds.length > 0
        ? await this.mealFinalRepo.find({
            where: {
              membershipId: In(memberIds),
              date: Between(startDate, endDate)
            }
          })
        : [];

    let totalMealsCount = new Decimal(0);
    const memberMealsMap = new Map<string, Decimal>();

    for (const final of mealFinals) {
      if (final.status) {
        // Active slot = 0.5 meal + 0.5 * guestCount
        const slotMealWeight = new Decimal(0.5).plus(new Decimal(0.5).times(final.guestCount || 0));
        totalMealsCount = totalMealsCount.plus(slotMealWeight);

        const currentMemberMeals = memberMealsMap.get(final.membershipId) || new Decimal(0);
        memberMealsMap.set(final.membershipId, currentMemberMeals.plus(slotMealWeight));
      }
    }

    // 5. Determine meal rate (actual vs estimated)
    const estimatedMealRate = new Decimal(mess.mealRate);
    const actualMealRate =
      totalMealsCount.isPositive() && !totalMealsCount.isZero()
        ? totalMarketCost.dividedBy(totalMealsCount)
        : estimatedMealRate;

    const effectiveRate = existingClose
      ? new Decimal(existingClose.actualMealRate)
      : actualMealRate;

    let overallDeposits = new Decimal(0);

    const memberSummaries = await Promise.all(
      members.map(async (m) => {
        const memberMeals = memberMealsMap.get(m.id) || new Decimal(0);
        const mealCost = memberMeals.times(effectiveRate);
        const cookBill = new Decimal(m.cookBillAmount || 0);

        // Fetch member deposits in this month
        const deposits = await this.ledgerRepo.find({
          where: {
            membershipId: m.id,
            type: LedgerType.DEPOSIT,
            date: Between(startDate, endDate)
          }
        });

        const totalMemberDeposits = deposits.reduce(
          (sum, d) => sum.plus(new Decimal(d.amount)),
          new Decimal(0)
        );
        overallDeposits = overallDeposits.plus(totalMemberDeposits);

        // Fetch fuel debits and adjustments
        const otherEntries = await this.ledgerRepo.find({
          where: {
            membershipId: m.id,
            date: Between(startDate, endDate)
          }
        });

        let fuelCost = new Decimal(0);
        let otherDebits = new Decimal(0);

        for (const entry of otherEntries) {
          if (entry.type === LedgerType.FUEL) {
            fuelCost = fuelCost.plus(new Decimal(entry.amount));
          } else if (entry.type === LedgerType.ADJUSTMENT || entry.type === LedgerType.GUEST) {
            otherDebits = otherDebits.plus(new Decimal(entry.amount));
          }
        }

        const totalDebits = mealCost.plus(fuelCost).plus(cookBill).plus(otherDebits);
        const finalBalance = totalMemberDeposits.minus(totalDebits);

        let status = BalanceStatus.HEALTHY;
        if (finalBalance.isNegative()) {
          status = BalanceStatus.GRACE;
        }

        return {
          membershipId: m.id,
          userName: m.user?.name || 'Unknown',
          userPhone: m.user?.phone || '',
          totalMeals: Number(memberMeals.toFixed(1)),
          mealCost: mealCost.toFixed(2),
          fuelCost: fuelCost.toFixed(2),
          cookBill: cookBill.toFixed(2),
          otherDebits: otherDebits.toFixed(2),
          totalDebits: totalDebits.toFixed(2),
          totalDeposits: totalMemberDeposits.toFixed(2),
          finalBalance: finalBalance.toFixed(2),
          status
        };
      })
    );

    return {
      month,
      messName: mess.name,
      isClosed: !!existingClose,
      closedAt: existingClose?.closedAt ? existingClose.closedAt.toISOString() : undefined,
      actualMealRate: effectiveRate.toFixed(2),
      estimatedMealRate: estimatedMealRate.toFixed(2),
      totalMeals: Number(totalMealsCount.toFixed(1)),
      totalMarketCost: totalMarketCost.toFixed(2),
      totalFuelCost: totalFuelCost.toFixed(2),
      totalDeposits: overallDeposits.toFixed(2),
      members: memberSummaries
    };
  }

  /**
   * Finalizes and locks monthly accounting, reconciling fuel difference.
   *
   * @param messId - Mess UUID.
   * @param managerUserId - User UUID performing close.
   * @param dto - Month close details.
   * @returns Sealed month close record.
   */
  async closeMonth(
    messId: string,
    managerUserId: string,
    dto: CloseMonthDto
  ): Promise<MonthCloseDto> {
    const existing = await this.monthCloseRepo.findOne({
      where: { messId, month: dto.month }
    });

    if (existing) {
      throw new BadRequestException('Month is already closed and locked');
    }

    const statement = await this.getMonthStatement(messId, dto.month);

    const actualFuel =
      dto.actualFuelCost !== undefined
        ? new Decimal(dto.actualFuelCost)
        : new Decimal(statement.totalFuelCost);

    // Calculate collected fuel from member summaries
    const collectedFuel = statement.members.reduce(
      (sum, m) => sum.plus(new Decimal(m.fuelCost)),
      new Decimal(0)
    );

    const fuelDiffPerSlot = CostCalculator.calculateExtraFuelAdjustmentPerSlot({
      actualTotalFuelCost: actualFuel,
      totalFuelCollected: collectedFuel,
      totalActiveSlotsInMess: Math.round(statement.totalMeals * 2)
    });

    // If actual fuel exceeds collected fuel, distribute append-only adjustment entries
    if (fuelDiffPerSlot.isPositive() && !fuelDiffPerSlot.isZero()) {
      for (const member of statement.members) {
        const slotsCount = Math.round(member.totalMeals * 2);
        const adjustmentAmount = fuelDiffPerSlot.times(slotsCount);

        if (adjustmentAmount.isPositive() && !adjustmentAmount.isZero()) {
          const adjEntry = this.ledgerRepo.create({
            membershipId: member.membershipId,
            amount: adjustmentAmount.toFixed(4),
            type: LedgerType.ADJUSTMENT,
            note: `Fuel deficit adjustment for ${dto.month}`,
            date: `${dto.month}-28`,
            createdBy: managerUserId
          });
          await this.ledgerRepo.save(adjEntry);
        }
      }
    }

    const closed = this.monthCloseRepo.create({
      messId,
      month: dto.month,
      closedById: managerUserId,
      totalMeals: new Decimal(statement.totalMeals).toFixed(4),
      totalMarketCost: new Decimal(statement.totalMarketCost).toFixed(4),
      actualMealRate: new Decimal(statement.actualMealRate).toFixed(4),
      estimatedMealRate: new Decimal(statement.estimatedMealRate).toFixed(4),
      totalFuelCost: actualFuel.toFixed(4),
      estimatedFuelCost: collectedFuel.toFixed(4),
      fuelDiffReconciliation: fuelDiffPerSlot.toFixed(4),
      totalCookBill: statement.members
        .reduce((sum, m) => sum.plus(new Decimal(m.cookBill)), new Decimal(0))
        .toFixed(4),
      isLocked: true,
      closedAt: new Date()
    });

    const savedClose = await this.monthCloseRepo.save(closed);

    // Write audit trail entry
    const audit = this.auditRepo.create({
      messId,
      actorId: managerUserId,
      action: 'MONTH_CLOSE',
      entity: 'month_closes',
      before: null,
      after: {
        month: dto.month,
        actualMealRate: savedClose.actualMealRate,
        totalMeals: savedClose.totalMeals,
        totalMarketCost: savedClose.totalMarketCost
      },
      reason: `Month ${dto.month} closed and ledger reconciled`
    });
    await this.auditRepo.save(audit);

    return {
      id: savedClose.id,
      messId: savedClose.messId,
      month: savedClose.month,
      closedById: savedClose.closedById,
      totalMeals: savedClose.totalMeals,
      totalMarketCost: savedClose.totalMarketCost,
      actualMealRate: savedClose.actualMealRate,
      estimatedMealRate: savedClose.estimatedMealRate,
      totalFuelCost: savedClose.totalFuelCost,
      estimatedFuelCost: savedClose.estimatedFuelCost,
      fuelDiffReconciliation: savedClose.fuelDiffReconciliation,
      totalCookBill: savedClose.totalCookBill,
      isLocked: savedClose.isLocked,
      closedAt: savedClose.closedAt.toISOString(),
      createdAt: savedClose.createdAt.toISOString()
    };
  }

  /**
   * Retrieves audit logs specifically for manager liability exceptions
   * (force overrides and ledger adjustments with mandatory explanations).
   *
   * @param messId - Mess UUID.
   * @param month - Target month in YYYY-MM format.
   * @returns Audit records for manager exceptions.
   */
  async getManagerLiabilityReport(messId: string, month: string): Promise<AuditLogDto[]> {
    const startDate = new Date(`${month}-01T00:00:00Z`);
    const endDate = new Date(`${month}-31T23:59:59Z`);

    const logs = await this.auditRepo.find({
      where: {
        messId,
        createdAt: Between(startDate, endDate)
      },
      order: { createdAt: 'DESC' }
    });

    return logs.map((l) => ({
      id: l.id,
      messId: l.messId,
      actorId: l.actorId,
      action: l.action,
      entity: l.entity,
      before: l.before,
      after: l.after,
      reason: l.reason,
      createdAt: l.createdAt.toISOString()
    }));
  }
}
