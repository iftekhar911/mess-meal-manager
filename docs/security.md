# Security Specification and Audit Record

Mess Meal Manager enforces security by design across API and client layers.

## 1. Input Validation and Whitelisting

- Every API endpoint is protected by NestJS `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- All payloads are strictly mapped through Data Transfer Objects (DTOs) with `class-validator` constraints.
- No client-provided user IDs, roles, or mess IDs are trusted. Context is derived from authenticated session tokens.

## 2. Multi-tier Authorization and IDOR Prevention

- Standard guard pipeline: `JwtAuthGuard` -> `MessMembershipGuard` -> `RolesGuard`.
- All database queries must be explicitly scoped by `messId`. Accessing another mess's data results in a 403 Forbidden response.
- Role-based permissions distinguish `MANAGER` actions (deposits, settings, month close, manual overrides) from `BOARDER` actions.

## 3. Cryptography and Session Management

- Passwords hashed using Argon2id with memory cost and time cost parameters.
- Short-lived JWT access tokens (15-minute lifespan).
- Rotating refresh tokens: tokens are stored as cryptographic hashes in the database.
- Refresh tokens are transmitted strictly via `httpOnly`, `secure`, `sameSite=strict` cookies.
- Refresh token reuse detection: if a previously replaced or revoked token is presented, all active sessions for the user are immediately invalidated.

## 4. HTTP and Transport Security

- HTTP security headers powered by `helmet`: Content Security Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options (DENY), X-Content-Type-Options (nosniff).
- CORS policy configured with strict origin allowlist.
- Rate limiting powered by `@nestjs/throttler` with tighter limits on authentication, OTP, and refresh endpoints.

## 5. Audit Logging and Reversals

- Mutating manager actions, meal locks, and deposit entries generate immutable records in the `audit_logs` table.
- Financial corrections are strictly append-only reversal entries; direct deletion or in-place modification of ledger rows is prohibited.

## 6. Month-End Sealing and Immutability

- Month close records in `month_closes` table lock the accounting period permanently (`is_locked: true`).
- Any attempt to modify meal finals, roster votes, or financial entries within a sealed month is rejected.
- All post-lock financial adjustments require new append-only ledger entries in the subsequent open accounting period.
