import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RosterService } from './roster.service';
import { RosterController } from './roster.controller';
import { ShoppingRosterEntity } from '../../database/entities/shopping-roster.entity';
import { SwapRequestEntity } from '../../database/entities/swap-request.entity';
import { MessEntity } from '../../database/entities/mess.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { MealRuleEntity } from '../../database/entities/meal-rule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShoppingRosterEntity,
      SwapRequestEntity,
      MessEntity,
      MembershipEntity,
      MealRuleEntity
    ])
  ],
  controllers: [RosterController],
  providers: [RosterService],
  exports: [RosterService]
})
export class RosterModule {}
