import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { MealRuleEntity } from '../../database/entities/meal-rule.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LedgerEntryEntity, MembershipEntity, MealRuleEntity, AuditLogEntity])
  ],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService]
})
export class LedgerModule {}
