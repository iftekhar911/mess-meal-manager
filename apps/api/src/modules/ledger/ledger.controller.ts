import { Controller, Post, Get, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { RecordDepositDto, CreateAdjustmentDto } from './dto/ledger.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserDto, MembershipRole, LedgerEntryDto, BalanceEvaluationDto } from '@mess/shared';

@ApiTags('Ledger')
@ApiBearerAuth()
@Controller('messes/:messId/ledger')
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Post('deposit')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Record deposit for a member (Manager only)' })
  async recordDeposit(
    @Param('messId', ParseUUIDPipe) messId: string,
    @CurrentUser() user: UserDto,
    @Body() dto: RecordDepositDto
  ): Promise<LedgerEntryDto> {
    return this.ledgerService.recordDeposit(messId, user.id, dto);
  }

  @Post('adjustment')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Create append-only reversing adjustment entry (Manager only)' })
  async createAdjustment(
    @Param('messId', ParseUUIDPipe) messId: string,
    @CurrentUser() user: UserDto,
    @Body() dto: CreateAdjustmentDto
  ): Promise<LedgerEntryDto> {
    return this.ledgerService.createAdjustment(messId, user.id, dto);
  }

  @Get('balance/:membershipId')
  @ApiOperation({ summary: 'Get computed real-time balance and health status' })
  async getBalance(
    @Param('membershipId', ParseUUIDPipe) membershipId: string
  ): Promise<BalanceEvaluationDto> {
    return this.ledgerService.getBalanceEvaluation(membershipId);
  }

  @Get('statement/:membershipId')
  @ApiOperation({ summary: 'Get itemized transaction statement for a member' })
  async getStatement(
    @Param('membershipId', ParseUUIDPipe) membershipId: string
  ): Promise<LedgerEntryDto[]> {
    return this.ledgerService.getStatement(membershipId);
  }
}
