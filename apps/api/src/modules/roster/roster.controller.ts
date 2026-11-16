import { Controller, Post, Get, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RosterService } from './roster.service';
import { VoteShoppingDayDto, RequestSwapDto, ReviewSwapDto } from './dto/roster.dto';
import { CurrentMembership } from '../../common/decorators/current-mess.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { MembershipDto, MembershipRole, ShoppingRosterDto, SwapRequestDto } from '@mess/shared';

@ApiTags('Shopping Roster')
@ApiBearerAuth()
@Controller('messes/:messId/roster')
export class RosterController {
  constructor(private rosterService: RosterService) {}

  @Post('vote')
  @ApiOperation({ summary: 'Vote for a preferred shopping date' })
  async voteDate(
    @Param('messId', ParseUUIDPipe) messId: string,
    @CurrentMembership() membership: MembershipDto,
    @Body() dto: VoteShoppingDayDto
  ): Promise<ShoppingRosterDto> {
    return this.rosterService.voteDate(messId, membership.id, dto);
  }

  @Post('swap')
  @ApiOperation({ summary: 'Request shopping duty swap with another member' })
  async requestSwap(
    @CurrentMembership() membership: MembershipDto,
    @Body() dto: RequestSwapDto
  ): Promise<SwapRequestDto> {
    return this.rosterService.requestSwap(membership.id, dto);
  }

  @Post('swap/:swapId/review')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Approve or reject swap request (Manager only)' })
  async reviewSwap(
    @Param('swapId', ParseUUIDPipe) swapId: string,
    @Body() dto: ReviewSwapDto
  ): Promise<SwapRequestDto> {
    return this.rosterService.reviewSwap(swapId, dto);
  }

  @Post('auto-shuffle')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Auto-shuffle unassigned shopping days (Manager only)' })
  @ApiQuery({ name: 'month', required: true, example: '2026-11' })
  async autoShuffle(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Query('month') month: string
  ): Promise<ShoppingRosterDto[]> {
    return this.rosterService.autoShuffleMonth(messId, month);
  }

  @Get()
  @ApiOperation({ summary: 'Get monthly shopping roster' })
  @ApiQuery({ name: 'month', required: true, example: '2026-11' })
  async getRoster(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Query('month') month: string
  ): Promise<ShoppingRosterDto[]> {
    return this.rosterService.findMonthRoster(messId, month);
  }
}
