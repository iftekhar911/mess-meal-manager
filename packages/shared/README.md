# @mess/shared

Shared library providing common TypeScript contracts, enums, validation schemas, and calculation utilities for the Mess Meal Manager monorepo.

## Responsibilities

- Centralize domain enums (roles, meal slots, egg preferences, ledger transaction categories).
- Export Zod validation schemas for cross-tier validation (API and client forms).
- Provide time utilities strictly evaluating against the Asia/Dhaka timezone.
- Export exact decimal financial formula helpers using decimal.js.

## Public API

- Constants: `ASIA_DHAKA_TZ`, `DEFAULT_CUTOFF_TIME`, `DEFAULT_GRACE_DAYS`, `MEAL_UNITS_PER_SLOT`.
- Enums: `MembershipRole`, `MealType`, `SlotType`, `EggPreference`, `LedgerType`, `BalanceStatus`.
- Schemas: `RegisterSchema`, `LoginSchema`, `CreateMessSchema`, `SetMealOverrideSchema`, etc.
- Functions: `getDhakaDateString()`, `calculateFuelCostPerSlot()`, `calculateCookBillPerSlot()`, `calculateMealCostPerSlot()`.
