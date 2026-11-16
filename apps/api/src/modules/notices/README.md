# Notices Module

Operates the shared notice board for mess announcements and communications.

## Responsibilities

- Allowing managers to post notices with titles and details.
- Displaying announcements to all active mess members in reverse chronological order.

## Public Endpoints

- `POST /api/v1/messes/:messId/notices`: Create notice (Manager only).
- `GET /api/v1/messes/:messId/notices`: Retrieve all notices.
