import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { MonthCloseEntity } from '../../database/entities/month-close.entity';
import { MealFinalEntity } from '../../database/entities/meal-final.entity';
import { ShoppingExpenseEntity } from '../../database/entities/shopping-expense.entity';
import { FuelExpenseEntity } from '../../database/entities/fuel-expense.entity';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { MessEntity } from '../../database/entities/mess.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonthCloseEntity,
      MealFinalEntity,
      ShoppingExpenseEntity,
      FuelExpenseEntity,
      LedgerEntryEntity,
      MembershipEntity,
      MessEntity,
      AuditLogEntity
    ])
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService]
})
export class ReportsModule {}
