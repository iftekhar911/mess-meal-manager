import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { AuditLogDto } from '@mess/shared';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private auditRepo: Repository<AuditLogEntity>
  ) {}

  /**
   * Retrieves audit logs for a mess.
   */
  async findByMess(messId: string): Promise<AuditLogDto[]> {
    const logs = await this.auditRepo.find({
      where: { messId },
      order: { createdAt: 'DESC' },
      take: 100
    });

    return logs.map((l) => ({
      id: l.id,
      messId: l.messId,
      actorId: l.actorId,
      action: l.action,
      entity: l.entity,
      before: l.before,
      after: l.after,
      reason: l.reason,
      createdAt: l.createdAt.toISOString()
    }));
  }
}
