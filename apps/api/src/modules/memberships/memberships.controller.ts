import { Controller, Post, Get, Patch, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MembershipsService } from './memberships.service';
import { AddBoarderDto, UpdateMembershipDto } from './dto/membership.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { MembershipDto, MembershipRole } from '@mess/shared';

@ApiTags('Memberships')
@ApiBearerAuth()
@Controller('messes/:messId/members')
export class MembershipsController {
  constructor(private membershipsService: MembershipsService) {}

  @Post()
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Add a boarder to the mess (Manager only)' })
  async addBoarder(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Body() dto: AddBoarderDto
  ): Promise<MembershipDto> {
    return this.membershipsService.addBoarder(messId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all members of the mess' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  async listMembers(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Query('activeOnly') activeOnly?: string
  ): Promise<MembershipDto[]> {
    const filterActive = activeOnly === undefined ? true : activeOnly === 'true';
    return this.membershipsService.findByMess(messId, filterActive);
  }

  @Patch(':membershipId')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Update membership role or cook bill (Manager only)' })
  async update(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: UpdateMembershipDto
  ): Promise<MembershipDto> {
    return this.membershipsService.update(membershipId, dto);
  }
}
