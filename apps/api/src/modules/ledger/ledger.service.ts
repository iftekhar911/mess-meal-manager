import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { MealRuleEntity } from '../../database/entities/meal-rule.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { BalanceEvaluator } from '../../domain/balance-evaluator/balance-evaluator';
import { CostCalculator } from '../../domain/cost-calculator/cost-calculator';
import { RecordDepositDto, CreateAdjustmentDto } from './dto/ledger.dto';
import { LedgerType, RuleKind, LedgerEntryDto, BalanceEvaluationDto } from '@mess/shared';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntryEntity)
    private ledgerRepo: Repository<LedgerEntryEntity>,
    @InjectRepository(MembershipEntity)
    private membershipRepo: Repository<MembershipEntity>,
    @InjectRepository(MealRuleEntity)
    private ruleRepo: Repository<MealRuleEntity>,
    @InjectRepository(AuditLogEntity)
    private auditRepo: Repository<AuditLogEntity>
  ) {}

  /**
   * Records a member deposit into the append-only ledger.
   * If requested, restores auto-off meals by turning continuous toggle back ON.
   */
  async recordDeposit(
    messId: string,
    actorId: string,
    dto: RecordDepositDto
  ): Promise<LedgerEntryDto> {
    const membership = await this.membershipRepo.findOne({
      where: { id: dto.membershipId, messId }
    });

    if (!membership) {
      throw new NotFoundException('Membership not found in this mess');
    }

    const entry = this.ledgerRepo.create({
      membershipId: dto.membershipId,
      type: LedgerType.DEPOSIT,
      amount: new Decimal(dto.amount).toFixed(4),
      date: dto.date,
      note: dto.note || null,
      createdBy: actorId
    });

    const saved = await this.ledgerRepo.save(entry);

    // If restoreAutoOffMeals requested, record a TOGGLE rule turning meals ON
    if (dto.restoreAutoOffMeals) {
      const toggleRule = this.ruleRepo.create({
        membershipId: dto.membershipId,
        fromDate: dto.date,
        toDate: null,
        status: true,
        kind: RuleKind.TOGGLE
      });
      await this.ruleRepo.save(toggleRule);
    }

    const audit = this.auditRepo.create({
      messId,
      actorId,
      action: 'RECORD_DEPOSIT',
      entity: 'ledger_entries',
      before: null,
      after: { ...saved } as unknown as Record<string, unknown>,
      reason: dto.note || 'Member deposit'
    });
    await this.auditRepo.save(audit);

    return this.toDto(saved);
  }

  /**
   * Records a financial adjustment / reversing entry into the ledger.
   */
  async createAdjustment(
    messId: string,
    actorId: string,
    dto: CreateAdjustmentDto
  ): Promise<LedgerEntryDto> {
    const membership = await this.membershipRepo.findOne({
      where: { id: dto.membershipId, messId }
    });

    if (!membership) {
      throw new NotFoundException('Membership not found in this mess');
    }

    const entry = this.ledgerRepo.create({
      membershipId: dto.membershipId,
      type: LedgerType.ADJUSTMENT,
      amount: new Decimal(dto.amount).toFixed(4),
      date: dto.date,
      note: dto.note,
      referenceId: dto.referenceId || null,
      createdBy: actorId
    });

    const saved = await this.ledgerRepo.save(entry);

    const audit = this.auditRepo.create({
      messId,
      actorId,
      action: 'CREATE_ADJUSTMENT',
      entity: 'ledger_entries',
      before: null,
      after: { ...saved } as unknown as Record<string, unknown>,
      reason: dto.note
    });
    await this.auditRepo.save(audit);

    return this.toDto(saved);
  }

  /**
   * Evaluates real-time balance and health for a member.
   */
  async getBalanceEvaluation(membershipId: string): Promise<BalanceEvaluationDto> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId },
      relations: ['mess']
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const entries = await this.ledgerRepo.find({
      where: { membershipId },
      order: { date: 'ASC', createdAt: 'ASC' }
    });

    const netBalance = BalanceEvaluator.computeNetBalance(
      entries.map((e) => ({
        type: e.type,
        amount: e.amount,
        date: e.date
      }))
    );

    // Compute estimated daily cost: 2 slots
    const mess = membership.mess;
    const daysInMonth = 30; // standard approximation for daily estimate
    const totalSlots = 30 * daysInMonth * 2;
    const slotCost = CostCalculator.calculateSlotDebit(
      mess.mealRate,
      12000,
      totalSlots,
      membership.cookBillAmount,
      daysInMonth
    );
    const dailyEstimatedCost = slotCost.mealDebit
      .plus(slotCost.fuelDebit)
      .plus(slotCost.cookDebit)
      .times(2);

    const evaluation = BalanceEvaluator.evaluate(
      netBalance,
      dailyEstimatedCost,
      mess.graceDays,
      mess.warningDays,
      0
    );

    return {
      currentBalance: evaluation.currentBalance.toFixed(2),
      dailyEstimatedCost: evaluation.dailyEstimatedCost.toFixed(2),
      daysRemaining: evaluation.daysRemaining,
      status: evaluation.status,
      graceDaysUsed: evaluation.graceDaysUsed,
      graceDaysLeft: evaluation.graceDaysLeft,
      isAutoOff: evaluation.isAutoOff
    };
  }

  /**
   * Retrieves statement of ledger transactions for a member.
   */
  async getStatement(membershipId: string): Promise<LedgerEntryDto[]> {
    const entries = await this.ledgerRepo.find({
      where: { membershipId },
      order: { date: 'DESC', createdAt: 'DESC' }
    });
    return entries.map((e) => this.toDto(e));
  }

  private toDto(entry: LedgerEntryEntity): LedgerEntryDto {
    return {
      id: entry.id,
      membershipId: entry.membershipId,
      type: entry.type,
      amount: entry.amount,
      date: entry.date,
      referenceId: entry.referenceId,
      note: entry.note,
      createdBy: entry.createdBy,
      createdAt: entry.createdAt.toISOString()
    };
  }
}
