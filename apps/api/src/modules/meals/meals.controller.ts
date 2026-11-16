import { Controller, Post, Get, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MealsService } from './meals.service';
import {
  SetMealDefaultDto,
  SetMealToggleDto,
  SetMealRangeDto,
  SetMealOverrideDto,
  ManagerForceMealDto
} from './dto/meal.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserDto, MembershipRole, ShopperDailySummaryDto } from '@mess/shared';

@ApiTags('Meals')
@ApiBearerAuth()
@Controller('messes/:messId/meals')
export class MealsController {
  constructor(private mealsService: MealsService) {}

  @Post('default/:membershipId')
  @ApiOperation({ summary: 'Set permanent meal default profile' })
  async setDefault(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: SetMealDefaultDto
  ) {
    return this.mealsService.setDefault(membershipId, dto);
  }

  @Post('toggle/:membershipId')
  @ApiOperation({ summary: 'Set continuous meal toggle switch' })
  async setToggle(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: SetMealToggleDto
  ) {
    return this.mealsService.setToggle(membershipId, dto);
  }

  @Post('range/:membershipId')
  @ApiOperation({ summary: 'Set meal range leave rule' })
  async setRange(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: SetMealRangeDto
  ) {
    return this.mealsService.setRange(membershipId, dto);
  }

  @Post('override/:membershipId')
  @ApiOperation({ summary: 'Set single-day slot override' })
  async setOverride(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: SetMealOverrideDto
  ) {
    return this.mealsService.setOverride(membershipId, dto);
  }

  @Post('manager-force')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Force meal modification after lock (Manager only with reason)' })
  async managerForceMeal(
    @Param('messId', ParseUUIDPipe) messId: string,
    @CurrentUser() user: UserDto,
    @Body() dto: ManagerForceMealDto
  ) {
    return this.mealsService.managerForceMeal(messId, user.id, dto);
  }

  @Get('shopper-summary')
  @ApiOperation({ summary: 'Get daily summary for shoppers' })
  @ApiQuery({ name: 'date', required: true, example: '2026-11-20' })
  async getShopperSummary(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Query('date') date: string
  ): Promise<ShopperDailySummaryDto> {
    return this.mealsService.getShopperSummary(messId, date);
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Get monthly meal heatmap grid' })
  @ApiQuery({ name: 'month', required: true, example: '2026-11' })
  async getHeatmap(@Param('messId', ParseUUIDPipe) messId: string, @Query('month') month: string) {
    return this.mealsService.getHeatmap(messId, month);
  }
}
