# Messes Module

Handles mess entity lifecycle, settings, and scoping.

## Responsibilities

- Creating new messes and designating the creator as the initial manager.
- Retrieving mess settings (cutoff time, estimated meal rate, grace period days, warning days).
- Managing mess settings updates with strict manager role gating.
- Providing mess lookup for tenant-scoping across the application.

## Public Endpoints

- `POST /api/v1/messes`: Create a mess.
- `GET /api/v1/messes/my`: Retrieve messes for current user.
- `GET /api/v1/messes/:messId`: Retrieve mess details.
- `PATCH /api/v1/messes/:messId`: Update mess settings (Manager only).
