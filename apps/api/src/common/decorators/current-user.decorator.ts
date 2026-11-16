import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDto } from '@mess/shared';

/**
 * Extracts the authenticated user from the execution context.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserDto | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
