import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { MonthlySettingsEntity } from '../../database/entities/monthly-settings.entity';
import { UpsertMonthlySettingsDto } from './dto/billing.dto';

/**
 * Service managing monthly estimated fuel budgets and meal rate settings.
 */
@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(MonthlySettingsEntity)
    private settingsRepo: Repository<MonthlySettingsEntity>
  ) {}

  /**
   * Retrieves monthly settings for a mess and month.
   */
  async getSettings(messId: string, month: string): Promise<MonthlySettingsEntity | null> {
    return this.settingsRepo.findOne({ where: { messId, month } });
  }

  /**
   * Creates or updates monthly billing estimates for a mess.
   */
  async upsertSettings(
    messId: string,
    dto: UpsertMonthlySettingsDto
  ): Promise<MonthlySettingsEntity> {
    let settings = await this.settingsRepo.findOne({
      where: { messId, month: dto.month }
    });

    if (settings) {
      settings.estFuelTotal = new Decimal(dto.estFuelTotal).toFixed(4);
      settings.estMealRate = new Decimal(dto.estMealRate).toFixed(4);
    } else {
      settings = this.settingsRepo.create({
        messId,
        month: dto.month,
        estFuelTotal: new Decimal(dto.estFuelTotal).toFixed(4),
        estMealRate: new Decimal(dto.estMealRate).toFixed(4)
      });
    }

    return this.settingsRepo.save(settings);
  }
}
