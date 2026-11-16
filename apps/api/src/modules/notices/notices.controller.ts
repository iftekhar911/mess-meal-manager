import { Controller, Post, Get, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NoticesService } from './notices.service';
import { CreateNoticeDto } from './dto/notice.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserDto, MembershipRole, NoticeDto } from '@mess/shared';

@ApiTags('Notices')
@ApiBearerAuth()
@Controller('messes/:messId/notices')
export class NoticesController {
  constructor(private noticesService: NoticesService) {}

  @Post()
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Post notice to the mess board (Manager only)' })
  async create(
    @Param('messId', ParseUUIDPipe) messId: string,
    @CurrentUser() user: UserDto,
    @Body() dto: CreateNoticeDto
  ): Promise<NoticeDto> {
    return this.noticesService.create(messId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List notices for the mess' })
  async list(@Param('messId', ParseUUIDPipe) messId: string): Promise<NoticeDto[]> {
    return this.noticesService.findByMess(messId);
  }
}
