# Scheduler Module

Runs server-side idempotent scheduled background tasks.

## Responsibilities

- Cutoff lock: evaluates each mess cutoff time (in Asia/Dhaka), resolves tomorrow meals, creates meal finals, and writes ledger debits.
- Balance verification: daily evaluation of member balances, grace period consumption, and auto-off triggers.

## Scheduled Jobs

- `handleCutoffLock()`: Every minute, checks and locks pending meals.
- `handleDailyBalanceCheck()`: Midnight daily check for grace period debt and auto-off enforcement.
