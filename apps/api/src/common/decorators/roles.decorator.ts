import { SetMetadata } from '@nestjs/common';
import { MembershipRole } from '@mess/shared';

export const ROLES_KEY = 'roles';

/**
 * Attaches required membership roles metadata to an endpoint.
 *
 * @param roles - One or more membership roles required.
 */
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);
