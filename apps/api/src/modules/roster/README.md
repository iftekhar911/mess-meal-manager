# Roster Module

Coordinates shopping duty reservations, voting deadlines, fair auto-shuffling, and swap requests.

## Responsibilities

- Permitting boarders to vote for open shopping dates up to monthly limits.
- First-come-first-served seat caps matching `mess.shoppersPerDay`.
- Auto-shuffling unassigned dates fairly using `RosterShuffler` (excluding absent members).
- Processing duty swap requests between boarders with manager approval.

## Public Endpoints

- `POST /api/v1/messes/:messId/roster/vote`: Vote for a shopping date.
- `POST /api/v1/messes/:messId/roster/swap`: Request duty swap.
- `POST /api/v1/messes/:messId/roster/swap/:swapId/review`: Approve/reject swap (Manager only).
- `POST /api/v1/messes/:messId/roster/auto-shuffle`: Trigger auto-shuffle (Manager only).
- `GET /api/v1/messes/:messId/roster?month=YYYY-MM`: View monthly roster.
