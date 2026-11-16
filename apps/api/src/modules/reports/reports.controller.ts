import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CloseMonthDto } from './dto/report.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  MembershipRole,
  UserDto,
  MonthStatementDto,
  MonthCloseDto,
  AuditLogDto
} from '@mess/shared';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('messes/:messId/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('statement')
  @ApiOperation({ summary: 'Get monthly financial statement with member summaries' })
  @ApiQuery({ name: 'month', required: true, example: '2026-11' })
  async getMonthStatement(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Query('month') month: string
  ): Promise<MonthStatementDto> {
    return this.reportsService.getMonthStatement(messId, month);
  }

  @Post('close-month')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Finalize, reconcile fuel, and lock month accounting (Manager only)' })
  async closeMonth(
    @Param('messId', ParseUUIDPipe) messId: string,
    @CurrentUser() user: UserDto,
    @Body() dto: CloseMonthDto
  ): Promise<MonthCloseDto> {
    return this.reportsService.closeMonth(messId, user.id, dto);
  }

  @Get('manager-liability')
  @ApiOperation({ summary: 'Manager liability report for forced overrides and adjustments' })
  @ApiQuery({ name: 'month', required: true, example: '2026-11' })
  async getManagerLiabilityReport(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Query('month') month: string
  ): Promise<AuditLogDto[]> {
    return this.reportsService.getManagerLiabilityReport(messId, month);
  }
}
