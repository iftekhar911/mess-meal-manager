import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import Decimal from 'decimal.js';
import { ShoppingExpenseEntity } from '../../database/entities/shopping-expense.entity';
import { ExpenseItemEntity } from '../../database/entities/expense-item.entity';
import { FuelExpenseEntity } from '../../database/entities/fuel-expense.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { RecordShoppingExpenseDto, RecordFuelExpenseDto } from './dto/expense.dto';
import { ExpenseStatus, ShoppingExpenseDto } from '@mess/shared';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(ShoppingExpenseEntity)
    private expenseRepo: Repository<ShoppingExpenseEntity>,
    @InjectRepository(ExpenseItemEntity)
    private itemRepo: Repository<ExpenseItemEntity>,
    @InjectRepository(FuelExpenseEntity)
    private fuelRepo: Repository<FuelExpenseEntity>,
    @InjectRepository(AuditLogEntity)
    private auditRepo: Repository<AuditLogEntity>
  ) {}

  /**
   * Shopper records a market shopping expense with itemized rows and receipt photo.
   */
  async recordShoppingExpense(
    messId: string,
    shopperId: string,
    dto: RecordShoppingExpenseDto
  ): Promise<ShoppingExpenseDto> {
    const totalDecimal = dto.items.reduce((sum, item) => sum.plus(item.price), new Decimal(0));

    const expense = this.expenseRepo.create({
      messId,
      date: dto.date,
      shopperId,
      total: totalDecimal.toFixed(4),
      status: ExpenseStatus.PENDING,
      receiptUrl: dto.receiptUrl || null
    });

    const savedExpense = await this.expenseRepo.save(expense);

    const items = dto.items.map((item) =>
      this.itemRepo.create({
        expenseId: savedExpense.id,
        name: item.name,
        quantity: item.quantity || null,
        price: new Decimal(item.price).toFixed(4)
      })
    );

    await this.itemRepo.save(items);
    savedExpense.items = items;

    return this.toDto(savedExpense);
  }

  /**
   * Manager approves shopper expense, making it public to all mess members.
   */
  async approveShoppingExpense(
    messId: string,
    actorId: string,
    expenseId: string
  ): Promise<ShoppingExpenseDto> {
    const expense = await this.expenseRepo.findOne({
      where: { id: expenseId, messId },
      relations: ['items', 'shopper', 'shopper.user']
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    expense.status = ExpenseStatus.APPROVED;
    const updated = await this.expenseRepo.save(expense);

    const audit = this.auditRepo.create({
      messId,
      actorId,
      action: 'APPROVE_EXPENSE',
      entity: 'shopping_expenses',
      before: { status: ExpenseStatus.PENDING },
      after: { status: ExpenseStatus.APPROVED, total: expense.total },
      reason: 'Manager verified receipt and line items'
    });
    await this.auditRepo.save(audit);

    return this.toDto(updated);
  }

  /**
   * Records a fuel and gas expense for the mess.
   */
  async recordFuelExpense(messId: string, dto: RecordFuelExpenseDto) {
    const fuel = this.fuelRepo.create({
      messId,
      date: dto.date,
      kind: dto.kind,
      amount: new Decimal(dto.amount).toFixed(4)
    });
    return this.fuelRepo.save(fuel);
  }

  /**
   * Lists approved shopping expenses for a given month (public to all members).
   */
  async listApprovedShoppingExpenses(messId: string, month: string): Promise<ShoppingExpenseDto[]> {
    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year!, m!, 0)).getUTCDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const expenses = await this.expenseRepo.find({
      where: {
        messId,
        date: Between(startDate, endDate),
        status: ExpenseStatus.APPROVED
      },
      relations: ['items', 'shopper', 'shopper.user'],
      order: { date: 'DESC' }
    });

    return expenses.map((e) => this.toDto(e));
  }

  /**
   * Lists fuel expenses for a given month.
   */
  async listFuelExpenses(messId: string, month: string) {
    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year!, m!, 0)).getUTCDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    return this.fuelRepo.find({
      where: {
        messId,
        date: Between(startDate, endDate)
      },
      order: { date: 'DESC' }
    });
  }

  private toDto(e: ShoppingExpenseEntity): ShoppingExpenseDto {
    return {
      id: e.id,
      messId: e.messId,
      date: e.date,
      shopperId: e.shopperId,
      total: e.total,
      status: e.status,
      receiptUrl: e.receiptUrl,
      items: (e.items || []).map((i) => ({
        id: i.id,
        expenseId: i.expenseId,
        name: i.name,
        quantity: i.quantity,
        price: i.price
      })),
      shopper: e.shopper
        ? {
            id: e.shopper.id,
            userId: e.shopper.userId,
            messId: e.shopper.messId,
            role: e.shopper.role,
            isActive: e.shopper.isActive,
            cookBillAmount: e.shopper.cookBillAmount,
            joinedAt: e.shopper.joinedAt.toISOString(),
            user: e.shopper.user
              ? {
                  id: e.shopper.user.id,
                  name: e.shopper.user.name,
                  phone: e.shopper.user.phone,
                  avatarUrl: e.shopper.user.avatarUrl,
                  createdAt: e.shopper.user.createdAt.toISOString()
                }
              : undefined
          }
        : undefined
    };
  }
}
