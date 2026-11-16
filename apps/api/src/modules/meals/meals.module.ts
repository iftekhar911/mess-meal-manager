import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealsService } from './meals.service';
import { MealsController } from './meals.controller';
import { MealDefaultEntity } from '../../database/entities/meal-default.entity';
import { MealRuleEntity } from '../../database/entities/meal-rule.entity';
import { MealOverrideEntity } from '../../database/entities/meal-override.entity';
import { MealFinalEntity } from '../../database/entities/meal-final.entity';
import { MessEntity } from '../../database/entities/mess.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MealDefaultEntity,
      MealRuleEntity,
      MealOverrideEntity,
      MealFinalEntity,
      MessEntity,
      MembershipEntity,
      AuditLogEntity
    ])
  ],
  controllers: [MealsController],
  providers: [MealsService],
  exports: [MealsService]
})
export class MealsModule {}
