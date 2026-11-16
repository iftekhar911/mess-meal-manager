# Expenses Module

Manages shopping market expenses, line items, receipt photos, and shared fuel expenses.

## Responsibilities

- Enabling shoppers to submit itemized receipts and total expenditure.
- Gating expense publicity until verified and approved by the manager.
- Maintaining transparency: approved market expenses and fuel purchases are public to all mess boarders.

## Public Endpoints

- `POST /api/v1/messes/:messId/expenses/shopping`: Submit shopper expense report.
- `POST /api/v1/messes/:messId/expenses/shopping/:expenseId/approve`: Approve expense (Manager only).
- `POST /api/v1/messes/:messId/expenses/fuel`: Record fuel/gas cost (Manager only).
- `GET /api/v1/messes/:messId/expenses/shopping?month=YYYY-MM`: List public approved expenses.
- `GET /api/v1/messes/:messId/expenses/fuel?month=YYYY-MM`: List fuel costs.
