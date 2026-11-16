# Audit Module

Maintains an immutable record of sensitive manager actions and liability exceptions.

## Responsibilities

- Recording manager meal force operations after lock time.
- Logging manual financial adjustments and deposit corrections.
- Providing transparent audit visibility to managers.

## Public Endpoints

- `GET /api/v1/messes/:messId/audit`: Retrieve audit log trail (Manager only).
