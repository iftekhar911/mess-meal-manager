# Common Module

Provides cross-cutting infrastructure, guards, decorators, interceptors, and error filters for the backend application.

## Responsibilities

- Sanitizing all API errors through `GlobalHttpExceptionFilter` (no leaked stack traces).
- Standardizing responses with `TransformInterceptor`.
- Logging incoming requests and durations via `LoggingInterceptor`.
- Enforcing authentication via `JwtAuthGuard`.
- Enforcing tenant isolation and IDOR protection via `MessMembershipGuard`.
- Enforcing role permissions via `RolesGuard`.

## Public Decorators

- `@Public()`: Marks route handlers open to unauthenticated users.
- `@CurrentUser()`: Injects the authenticated user.
- `@CurrentMembership()`: Injects the validated mess membership.
- `@Roles(MembershipRole.MANAGER)`: Restricts route to specific membership roles.
