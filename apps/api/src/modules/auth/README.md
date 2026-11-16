# Auth Module

Handles authentication, session security, and credential management for Mess Meal Manager.

## Responsibilities

- User registration and login using phone number and password.
- Password hashing with Argon2id.
- Issuing short-lived JWT access tokens (15-minute validity).
- Cryptographic SHA-256 rotating refresh tokens stored in HTTP-only secure cookies.
- Refresh token reuse detection: immediately revoking all user sessions if a compromised or previously rotated token is presented.
- Session revocation (single device logout or all devices logout).

## Public Endpoints

- `POST /api/v1/auth/register`: Create account.
- `POST /api/v1/auth/login`: Authenticate and receive tokens.
- `POST /api/v1/auth/refresh`: Rotate refresh token and issue new access token.
- `POST /api/v1/auth/logout`: Revoke active session.
- `POST /api/v1/auth/revoke-all`: Invalidate all sessions.
- `GET /api/v1/auth/me`: Retrieve active profile.
