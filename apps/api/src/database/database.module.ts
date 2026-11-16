import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { MessEntity } from './entities/mess.entity';
import { MembershipEntity } from './entities/membership.entity';
import { MealDefaultEntity } from './entities/meal-default.entity';
import { MealRuleEntity } from './entities/meal-rule.entity';
import { MealOverrideEntity } from './entities/meal-override.entity';
import { MealFinalEntity } from './entities/meal-final.entity';
import { DailyMenuEntity } from './entities/daily-menu.entity';
import { LedgerEntryEntity } from './entities/ledger-entry.entity';
import { MonthlySettingsEntity } from './entities/monthly-settings.entity';
import { NoticeEntity } from './entities/notice.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { ShoppingRosterEntity } from './entities/shopping-roster.entity';
import { SwapRequestEntity } from './entities/swap-request.entity';
import { ShoppingExpenseEntity } from './entities/shopping-expense.entity';
import { ExpenseItemEntity } from './entities/expense-item.entity';
import { FuelExpenseEntity } from './entities/fuel-expense.entity';
import { MonthCloseEntity } from './entities/month-close.entity';

const ALL_ENTITIES = [
  UserEntity,
  RefreshTokenEntity,
  MessEntity,
  MembershipEntity,
  MealDefaultEntity,
  MealRuleEntity,
  MealOverrideEntity,
  MealFinalEntity,
  DailyMenuEntity,
  LedgerEntryEntity,
  MonthlySettingsEntity,
  NoticeEntity,
  AuditLogEntity,
  ShoppingRosterEntity,
  SwapRequestEntity,
  ShoppingExpenseEntity,
  ExpenseItemEntity,
  FuelExpenseEntity,
  MonthCloseEntity
];

/**
 * Database module configuring PostgreSQL with TypeORM.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isTest = config.get<string>('NODE_ENV') === 'test';
        if (isTest) {
          return {
            type: 'better-sqlite3' as const,
            database: ':memory:',
            dropSchema: true,
            entities: ALL_ENTITIES,
            synchronize: true,
            logging: false
          };
        }
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USER', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'mess_meal_manager'),
          entities: ALL_ENTITIES,
          synchronize: false,
          logging: config.get<string>('NODE_ENV') === 'development'
        };
      }
    }),
    TypeOrmModule.forFeature(ALL_ENTITIES)
  ],
  exports: [TypeOrmModule]
})
export class DatabaseModule {}
