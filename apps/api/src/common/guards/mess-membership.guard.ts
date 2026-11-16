import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { DataSource } from 'typeorm';
import { MembershipEntity } from '../../database/entities/membership.entity';

/**
 * Guard that verifies the user belongs to the requested mess.
 * Prevents IDOR by validating membership before any controller action runs.
 */
@Injectable()
export class MessMembershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.id) {
      return true;
    }

    const messId =
      request.params?.messId ||
      request.headers['x-mess-id'] ||
      request.body?.messId ||
      request.query?.messId;

    if (!messId) {
      // If endpoint is not mess-scoped, allow through.
      return true;
    }

    const membershipRepo = this.dataSource.getRepository(MembershipEntity);
    const membership = await membershipRepo.findOne({
      where: {
        userId: user.id,
        messId,
        isActive: true
      },
      relations: ['mess']
    });

    if (!membership) {
      throw new ForbiddenException('You do not have active membership in this mess');
    }

    request.membership = membership;
    return true;
  }
}
