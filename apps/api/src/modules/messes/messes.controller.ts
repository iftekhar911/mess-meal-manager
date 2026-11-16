import { Controller, Post, Get, Patch, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessesService } from './messes.service';
import { CreateMessDto, UpdateMessDto } from './dto/mess.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserDto, MessDto, MembershipRole } from '@mess/shared';

@ApiTags('Messes')
@ApiBearerAuth()
@Controller('messes')
export class MessesController {
  constructor(private messesService: MessesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new mess' })
  async create(@CurrentUser() user: UserDto, @Body() dto: CreateMessDto): Promise<MessDto> {
    return this.messesService.create(user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'List all messes current user belongs to' })
  async getMyMesses(@CurrentUser() user: UserDto): Promise<MessDto[]> {
    return this.messesService.findByUser(user.id);
  }

  @Get(':messId')
  @ApiOperation({ summary: 'Get mess configuration details' })
  async getById(@Param('messId', ParseUUIDPipe) messId: string): Promise<MessDto> {
    return this.messesService.findById(messId);
  }

  @Patch(':messId')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Update mess settings (Manager only)' })
  async update(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Body() dto: UpdateMessDto
  ): Promise<MessDto> {
    return this.messesService.update(messId, dto);
  }
}
