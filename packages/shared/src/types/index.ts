import {
  MembershipRole,
  MealType,
  SlotType,
  EggPreference,
  RuleKind,
  OverrideSource,
  ProteinType,
  LedgerType,
  RosterSource,
  SwapStatus,
  ExpenseStatus,
  BalanceStatus
} from '../enums';

/**
 * Basic user profile.
 */
export interface UserDto {
  id: string;
  name: string;
  phone: string;
  avatarUrl: string | null;
  createdAt: string;
}

/**
 * Authentication tokens envelope.
 */
export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
  activeMessId?: string;
}

/**
 * Mess configuration settings.
 */
export interface MessDto {
  id: string;
  name: string;
  cutoffTime: string;
  mealRate: string;
  graceDays: number;
  warningDays: number;
  shoppersPerDay: number;
  shopTimesPerMonth: number;
  createdAt: string;
}

/**
 * Membership representation within a mess.
 */
export interface MembershipDto {
  id: string;
  userId: string;
  messId: string;
  role: MembershipRole;
  isActive: boolean;
  cookBillAmount: string;
  user?: UserDto;
  mess?: MessDto;
  joinedAt: string;
}

/**
 * Meal default profile.
 */
export interface MealDefaultDto {
  id: string;
  membershipId: string;
  mealType: MealType;
  halfSlot: SlotType | null;
  eggPreference: EggPreference;
  effectiveFrom: string;
}

/**
 * Dynamic meal rule (toggle or range).
 */
export interface MealRuleDto {
  id: string;
  membershipId: string;
  fromDate: string;
  toDate: string | null;
  status: boolean;
  kind: RuleKind;
}

/**
 * Single-slot meal override.
 */
export interface MealOverrideDto {
  id: string;
  membershipId: string;
  date: string;
  slot: SlotType;
  status: boolean;
  eggPreference: EggPreference;
  guestCount: number;
  source: OverrideSource;
}

/**
 * Final locked meal record for a slot.
 */
export interface MealFinalDto {
  id: string;
  membershipId: string;
  date: string;
  slot: SlotType;
  status: boolean;
  eggPreference: EggPreference;
  guestCount: number;
  forcedByManager: boolean;
  reason: string | null;
}

/**
 * Shopper menu declared for a date.
 */
export interface DailyMenuDto {
  id: string;
  messId: string;
  date: string;
  shopperId: string | null;
  protein: ProteinType;
  note: string | null;
  lunchProtein?: ProteinType;
  lunchNote?: string | null;
  dinnerProtein?: ProteinType;
  dinnerNote?: string | null;
}

/**
 * Append-only ledger transaction entry.
 */
export interface LedgerEntryDto {
  id: string;
  membershipId: string;
  type: LedgerType;
  amount: string;
  date: string;
  referenceId: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

/**
 * Financial balance and health evaluation.
 */
export interface BalanceEvaluationDto {
  currentBalance: string;
  dailyEstimatedCost: string;
  daysRemaining: number;
  status: BalanceStatus;
  graceDaysUsed: number;
  graceDaysLeft: number;
  isAutoOff: boolean;
}

/**
 * Daily summary for the shopper.
 */
export interface ShopperDailySummaryDto {
  date: string;
  messId: string;
  lunchMeals: number;
  dinnerMeals: number;
  totalMealUnits: number;
  eggCount: number;
  guestCount: number;
  estimatedBudget: string;
  menu: DailyMenuDto | null;
}

/**
 * Shopping roster entry.
 */
export interface ShoppingRosterDto {
  id: string;
  messId: string;
  date: string;
  membershipId: string;
  source: RosterSource;
  member?: MembershipDto;
}

/**
 * Shopping duty swap request.
 */
export interface SwapRequestDto {
  id: string;
  rosterId: string;
  fromMembershipId: string;
  toMembershipId: string;
  status: SwapStatus;
  createdAt: string;
}

/**
 * Shopping expense entry with receipts.
 */
export interface ShoppingExpenseDto {
  id: string;
  messId: string;
  date: string;
  shopperId: string;
  total: string;
  status: ExpenseStatus;
  receiptUrl: string | null;
  items: ExpenseItemDto[];
  shopper?: MembershipDto;
}

/**
 * Line item in shopping expense.
 */
export interface ExpenseItemDto {
  id: string;
  expenseId: string;
  name: string;
  quantity: string | null;
  price: string;
}

/**
 * Notice board posting.
 */
export interface NoticeDto {
  id: string;
  messId: string;
  authorId: string;
  title: string;
  body: string;
  authorName?: string;
  createdAt: string;
}

/**
 * Audit log entry for manager exceptions.
 */
export interface AuditLogDto {
  id: string;
  messId: string;
  actorId: string;
  action: string;
  entity: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
}

/**
 * Closed month accounting statement and record.
 */
export interface MonthCloseDto {
  id: string;
  messId: string;
  month: string;
  closedById: string;
  totalMeals: string;
  totalMarketCost: string;
  actualMealRate: string;
  estimatedMealRate: string;
  totalFuelCost: string;
  estimatedFuelCost: string;
  fuelDiffReconciliation: string;
  totalCookBill: string;
  isLocked: boolean;
  closedAt: string;
  createdAt: string;
}

/**
 * Member summary row in the monthly financial close statement.
 */
export interface MemberMonthSummaryDto {
  membershipId: string;
  userName: string;
  userPhone: string;
  totalMeals: number;
  mealCost: string;
  fuelCost: string;
  cookBill: string;
  otherDebits: string;
  totalDebits: string;
  totalDeposits: string;
  finalBalance: string;
  status: BalanceStatus;
}

/**
 * Complete monthly financial close statement.
 */
export interface MonthStatementDto {
  month: string;
  messName: string;
  isClosed: boolean;
  closedAt?: string;
  actualMealRate: string;
  estimatedMealRate: string;
  totalMeals: number;
  totalMarketCost: string;
  totalFuelCost: string;
  totalDeposits: string;
  members: MemberMonthSummaryDto[];
}

/**
 * Standard API error structure.
 */
export interface ApiErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}
