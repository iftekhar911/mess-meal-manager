import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { UpsertMonthlySettingsDto } from './dto/billing.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { MembershipRole } from '@mess/shared';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('messes/:messId/billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get monthly billing settings for a mess' })
  @ApiQuery({ name: 'month', required: true, example: '2026-11' })
  async getSettings(@Param('messId', ParseUUIDPipe) messId: string, @Query('month') month: string) {
    return this.billingService.getSettings(messId, month);
  }

  @Post('settings')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Configure monthly fuel budget and meal rate (Manager only)' })
  async upsertSettings(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Body() dto: UpsertMonthlySettingsDto
  ) {
    return this.billingService.upsertSettings(messId, dto);
  }
}
