import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { MembershipDto } from '@mess/shared';

/**
 * Extracts the current mess membership context verified by MessMembershipGuard.
 */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MembershipDto | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.membership;
  }
);
