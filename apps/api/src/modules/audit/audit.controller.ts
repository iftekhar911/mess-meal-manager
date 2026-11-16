import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { MembershipRole, AuditLogDto } from '@mess/shared';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('messes/:messId/audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'List audit trail of manager exceptions (Manager only)' })
  async getAuditLogs(@Param('messId', ParseUUIDPipe) messId: string): Promise<AuditLogDto[]> {
    return this.auditService.findByMess(messId);
  }
}
