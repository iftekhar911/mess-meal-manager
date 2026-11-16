# Menus Module

Manages daily menu announcements for shared mess meals.

## Responsibilities

- Allowing active shoppers or managers to declare daily meal protein (fish, chicken, other) and notes.
- Offering public menu visibility to all members of the mess.
- Connecting declared menus with shopper aggregated demand.

## Public Endpoints

- `POST /api/v1/messes/:messId/menus`: Declare or update menu.
- `GET /api/v1/messes/:messId/menus?date=YYYY-MM-DD`: Retrieve daily menu.
