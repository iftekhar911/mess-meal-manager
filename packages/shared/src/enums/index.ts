/**
 * Roles scoped per mess membership.
 */
export enum MembershipRole {
  MANAGER = 'MANAGER',
  BOARDER = 'BOARDER'
}

/**
 * Meal type preference for standard daily schedules.
 */
export enum MealType {
  FULL = 'FULL',
  HALF = 'HALF'
}

/**
 * Daily slots in Bangladesh messes.
 */
export enum SlotType {
  LUNCH = 'LUNCH',
  DINNER = 'DINNER'
}

/**
 * Protein and egg preferences for specific slots.
 */
export enum EggPreference {
  NONE = 'NONE',
  INSTEAD_OF_FISH = 'INSTEAD_OF_FISH',
  INSTEAD_OF_CHICKEN = 'INSTEAD_OF_CHICKEN'
}

/**
 * Classification of meal rules.
 */
export enum RuleKind {
  TOGGLE = 'TOGGLE',
  RANGE = 'RANGE'
}

/**
 * Origin of a meal override.
 */
export enum OverrideSource {
  BOARDER = 'BOARDER',
  MANAGER_FORCE = 'MANAGER_FORCE'
}

/**
 * Protein served in daily shopper menu.
 */
export enum ProteinType {
  FISH = 'FISH',
  CHICKEN = 'CHICKEN',
  OTHER = 'OTHER'
}

/**
 * Append-only financial ledger transaction categories.
 */
export enum LedgerType {
  DEPOSIT = 'DEPOSIT',
  MEAL = 'MEAL',
  FUEL = 'FUEL',
  COOK_BILL = 'COOK_BILL',
  GUEST = 'GUEST',
  ADJUSTMENT = 'ADJUSTMENT',
  REFUND = 'REFUND'
}

/**
 * Source of shopping duty assignment.
 */
export enum RosterSource {
  VOTE = 'VOTE',
  AUTO = 'AUTO',
  SWAP = 'SWAP'
}

/**
 * State of a shopping duty swap request.
 */
export enum SwapStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

/**
 * Verification state of shopper market expenses.
 */
export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

/**
 * Visual status indicator based on remaining balance days.
 * Visible only to the boarder and the manager.
 */
export enum BalanceStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  GRACE = 'GRACE',
  AUTO_OFF = 'AUTO_OFF'
}
