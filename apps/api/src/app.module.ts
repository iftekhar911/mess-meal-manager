import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MessesModule } from './modules/messes/messes.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { MealsModule } from './modules/meals/meals.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { MenusModule } from './modules/menus/menus.module';
import { NoticesModule } from './modules/notices/notices.module';
import { AuditModule } from './modules/audit/audit.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { RosterModule } from './modules/roster/roster.module';
import { ExpensesModule } from './modules/expenses/expenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100
      }
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    MessesModule,
    MembershipsModule,
    MealsModule,
    LedgerModule,
    MenusModule,
    NoticesModule,
    AuditModule,
    SchedulerModule,
    RosterModule,
    ExpensesModule
  ]
})
export class AppModule {}
