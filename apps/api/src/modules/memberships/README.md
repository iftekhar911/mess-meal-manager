# Memberships Module

Manages user associations within messes, including roles and billing rates.

## Responsibilities

- Adding boarders to messes by phone number.
- Assigning and toggling membership roles (`MANAGER`, `BOARDER`).
- Customizing individual cook bill (khala) amounts.
- Deactivating and reactivating boarders.

## Public Endpoints

- `POST /api/v1/messes/:messId/members`: Add a new boarder (Manager only).
- `GET /api/v1/messes/:messId/members`: List mess members.
- `PATCH /api/v1/messes/:messId/members/:membershipId`: Update member role or status (Manager only).
