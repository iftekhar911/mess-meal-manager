import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { MessEntity } from '../../database/entities/mess.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { MealDefaultEntity } from '../../database/entities/meal-default.entity';
import { MealRuleEntity } from '../../database/entities/meal-rule.entity';
import { MealOverrideEntity } from '../../database/entities/meal-override.entity';
import { MealFinalEntity } from '../../database/entities/meal-final.entity';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessEntity,
      MembershipEntity,
      MealDefaultEntity,
      MealRuleEntity,
      MealOverrideEntity,
      MealFinalEntity,
      LedgerEntryEntity
    ])
  ],
  providers: [SchedulerService],
  exports: [SchedulerService]
})
export class SchedulerModule {}
