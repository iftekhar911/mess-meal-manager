# Ledger Module

Maintains the financial ledger for Mess Meal Manager.

## Responsibilities

- Recording member deposits (credit) and reversing adjustments.
- Recording per-slot meal, fuel, and cook debits.
- Computing net balance dynamically on the fly (never stored as mutable number).
- Evaluating grace periods and auto-off debt thresholds.
- Maintaining an append-only audit trail: zero edits or deletes.

## Public Endpoints

- `POST /api/v1/messes/:messId/ledger/deposit`: Record deposit (Manager only).
- `POST /api/v1/messes/:messId/ledger/adjustment`: Reversing entry (Manager only).
- `GET /api/v1/messes/:messId/ledger/balance/:membershipId`: Member balance evaluation.
- `GET /api/v1/messes/:messId/ledger/statement/:membershipId`: Itemized statement.
