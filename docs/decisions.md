# Architecture and Business Rule Decisions

This document records architectural, money, and privacy decisions for Mess Meal Manager.

## ADR 001: Append-Only Financial Ledger

- Context: Mess accounting requires transparent, auditable records where past numbers cannot be silently altered or deleted.
- Decision: Balances are never stored as a mutable number. Balance is dynamically computed by summing append-only ledger entries. Corrections are recorded as reversing adjustment entries with reference links and audit log rows.
- Consequences: Full financial history is preserved. Double-entry or reversing ledger entries prevent balance corruption.

## ADR 002: Monetary Precision with Decimal.js and Numeric(12,4)

- Context: Meal rate, fuel costs, and cook bills involve fractional division across slots. Floating point operations cause precision leaks.
- Decision: Database columns use `numeric(12,4)`. Backend domain logic evaluates monetary values using `decimal.js`. Display formatting rounds to 2 decimal places using active locale currency formatters.
- Consequences: Exact accounting without floating-point rounding errors.

## ADR 003: Grace Period and Auto-off Rules

- Context: Boarders may run out of balance while continuing to eat, creating debt.
- Decision: When calculated balance runs out (balance <= 0), a 3-day grace period allows meals to continue. On the 2nd grace day, a final warning is sent. After grace days expire without a deposit, meals are switched off automatically (indicated by red cells in the meal heatmap). When a new deposit is recorded, the system prompts the manager to confirm restoring meals.
- Consequences: Protects mess collective funds while offering reasonable flexibility.

## ADR 004: Manager Liability for Locked Overrides

- Context: After the mess cutoff time (default 22:00 Asia/Dhaka), meals are locked. Boarders cannot modify preferences.
- Decision: Only managers can modify locked meals, and a mandatory reason must be supplied. The modification is recorded in the audit log and flagged as a manager liability in the month-end reconciliation report.
- Consequences: Prevents arbitrary off-record adjustments.

## ADR 005: Privacy and Transparency Boundary

- Context: Mess members need operational transparency without violating personal privacy.
- Decision: Daily meal totals, heatmap slot statuses (green/gray/red), menus, notices, and market expense totals are visible to all mess members. Individual deposit amounts, personal balances, and avatar ring colors remain private to the boarder and the manager until month close. Upon month close, all deposits and expense items become public to all members for collective audit.
- Consequences: Balances dignity during the month while guaranteeing total transparency at month close.
