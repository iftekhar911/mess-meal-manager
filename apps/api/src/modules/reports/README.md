# Reports Module

The Reports Module handles month-end financial reconciliation, actual meal rate calculations, fuel deficit adjustments, statement generation, and manager liability audits.

## Key Responsibilities

- Computes actual meal rate based on total approved market expenses divided by total active meal slots.
- Reconciles fuel costs: distributes deficit adjustments across active boarder slots using pure domain logic.
- Locks the month close record in `month_closes` table to prevent retrospective tampering.
- Provides manager liability audit trails for forced overrides and balance adjustments.

## Endpoints

- `GET /messes/:messId/reports/statement`: Returns monthly financial summary statement.
- `POST /messes/:messId/reports/close-month`: Closes and locks monthly accounting (Manager only).
- `GET /messes/:messId/reports/manager-liability`: Returns audit trail of manager exceptions.
