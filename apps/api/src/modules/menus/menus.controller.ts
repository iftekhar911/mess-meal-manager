import { Controller, Post, Get, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { SetDailyMenuDto } from './dto/menu.dto';
import { CurrentMembership } from '../../common/decorators/current-mess.decorator';
import { MembershipDto, DailyMenuDto } from '@mess/shared';

@ApiTags('Menus')
@ApiBearerAuth()
@Controller('messes/:messId/menus')
export class MenusController {
  constructor(private menusService: MenusService) {}

  @Post()
  @ApiOperation({ summary: 'Declare or update daily menu (Shopper/Manager)' })
  async setMenu(
    @Param('messId', ParseUUIDPipe) messId: string,
    @CurrentMembership() membership: MembershipDto | undefined,
    @Body() dto: SetDailyMenuDto
  ): Promise<DailyMenuDto> {
    return this.menusService.setMenu(messId, membership?.id || null, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get declared daily menu for a date' })
  @ApiQuery({ name: 'date', required: true, example: '2026-11-20' })
  async getMenu(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Query('date') date: string
  ): Promise<DailyMenuDto | null> {
    return this.menusService.getMenu(messId, date);
  }
}
