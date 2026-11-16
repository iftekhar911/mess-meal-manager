# Users Module

Manages user profile data and basic account information.

## Responsibilities

- Fetch user profiles.
- Update profile attributes (display name, avatar URL).
- Provide user entity operations for dependent modules.

## Public Endpoints

- `GET /api/v1/users/profile`: Current authenticated profile.
- `PATCH /api/v1/users/profile`: Update user profile details.
