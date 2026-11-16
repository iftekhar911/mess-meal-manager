import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { MonthlySettingsEntity } from '../../database/entities/monthly-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MonthlySettingsEntity])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService]
})
export class BillingModule {}
