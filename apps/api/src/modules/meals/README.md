# Meals Module

Coordinates boarder meal preferences, rules, overrides, lock policies, and heatmap generation.

## Responsibilities

- Resolving slot states based on domain priority: single-day override > range leave > continuous toggle > default profile.
- Enforcing cutoff time lock: boarders cannot modify locked upcoming meals.
- Empowering managers to apply locked exceptions with mandatory audit reasons.
- Generating aggregated daily shopper statistics (meals, egg counts, guest counts).
- Serving monthly meal heatmap grid data.

## Public Endpoints

- `POST /api/v1/messes/:messId/meals/default/:membershipId`: Update default profile.
- `POST /api/v1/messes/:messId/meals/toggle/:membershipId`: Toggle continuous meal status.
- `POST /api/v1/messes/:messId/meals/range/:membershipId`: Set leave date range.
- `POST /api/v1/messes/:messId/meals/override/:membershipId`: Set single-slot override.
- `POST /api/v1/messes/:messId/meals/manager-force`: Force meal change with reason (Manager only).
- `GET /api/v1/messes/:messId/meals/shopper-summary`: Daily shopper breakdown.
- `GET /api/v1/messes/:messId/meals/heatmap`: Monthly meal matrix.
