import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ShoppingExpenseEntity } from '../../database/entities/shopping-expense.entity';
import { ExpenseItemEntity } from '../../database/entities/expense-item.entity';
import { FuelExpenseEntity } from '../../database/entities/fuel-expense.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShoppingExpenseEntity,
      ExpenseItemEntity,
      FuelExpenseEntity,
      AuditLogEntity
    ])
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService]
})
export class ExpensesModule {}
