import Decimal from 'decimal.js';
import {
  BalanceEvaluationDto,
  BalanceStatus,
  EggPreference,
  LedgerType,
  MealType,
  MessDto,
  SlotType,
  getDhakaDateString
} from '@mess/shared';
import { getPool } from './db';

export interface MealDefaultRow {
  membership_id: string;
  meal_type: string;
  half_slot: string | null;
  egg_preference: string;
  is_active: boolean;
  toggle_from_date: string | null;
}

export interface MealOverrideRow {
  membership_id: string;
  date: string;
  slot: string;
  status: boolean;
  egg_preference: string;
  guest_count: number;
  is_manager_override: boolean;
}

export interface ResolvedSlot {
  status: boolean;
  isAutoOff: boolean;
  guestCount: number;
  eggPreference: EggPreference;
}

/**
 * Resolves a single meal slot (LUNCH or DINNER) for a member on a specific date.
 * Precedence: Single-day/Force Override > Continuous Toggle > Permanent Default.
 */
export function resolveSlot(
  def: MealDefaultRow | undefined,
  override: MealOverrideRow | undefined,
  date: string,
  slot: SlotType
): ResolvedSlot {
  if (override) {
    return {
      status: Boolean(override.status),
      isAutoOff: false,
      guestCount: Number(override.guest_count || 0),
      eggPreference: (override.egg_preference as EggPreference) || EggPreference.NONE
    };
  }

  if (def && def.is_active === false) {
    if (!def.toggle_from_date || def.toggle_from_date <= date) {
      return {
        status: false,
        isAutoOff: false,
        guestCount: 0,
        eggPreference: EggPreference.NONE
      };
    }
  }

  if (def && def.meal_type === MealType.HALF) {
    return {
      status: def.half_slot === slot,
      isAutoOff: false,
      guestCount: 0,
      eggPreference: (def.egg_preference as EggPreference) || EggPreference.NONE
    };
  }

  return {
    status: true,
    isAutoOff: false,
    guestCount: 0,
    eggPreference: (def?.egg_preference as EggPreference) || EggPreference.NONE
  };
}

/**
 * Maps a raw mm_messes DB row into MessDto.
 */
export function mapMessRow(row: Record<string, unknown>): MessDto {
  return {
    id: String(row.id),
    name: String(row.name),
    cutoffTime: String(row.cutoff_time),
    mealRate: Number(row.meal_rate).toFixed(2),
    graceDays: Number(row.grace_days),
    warningDays: Number(row.warning_days),
    shoppersPerDay: Number(row.shoppers_per_day),
    shopTimesPerMonth: Number(row.shop_times_per_month),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

export interface RateHistoryRow {
  effective_from: string;
  meal_rate: string | number;
  cook_bill: string | number;
  fuel_bill: string | number;
}

/**
 * Resolves the active mealRate, cookBill, and fuelBill for a specific date YYYY-MM-DD.
 * Uses the latest rate history row whose effective_from <= dateStr.
 */
export function resolveRateForDate(
  history: RateHistoryRow[],
  fallback: { mealRate: string | number; cookBill: string | number; fuelBill: string | number },
  dateStr: string
): { mealRate: Decimal; cookBill: Decimal; fuelBill: Decimal } {
  let matched: RateHistoryRow | undefined;
  for (const row of history) {
    if (row.effective_from <= dateStr) {
      if (!matched || row.effective_from > matched.effective_from) {
        matched = row;
      }
    }
  }
  if (matched) {
    return {
      mealRate: new Decimal(matched.meal_rate),
      cookBill: new Decimal(matched.cook_bill),
      fuelBill: new Decimal(matched.fuel_bill)
    };
  }
  return {
    mealRate: new Decimal(fallback.mealRate),
    cookBill: new Decimal(fallback.cookBill),
    fuelBill: new Decimal(fallback.fuelBill)
  };
}

/**
 * Evaluates a member's real-time balance from ledger entries and effective-dated meal rates.
 */
export async function evaluateMemberBalance(
  mess: MessDto,
  membershipId: string
): Promise<BalanceEvaluationDto> {
  const pool = getPool();
  const today = getDhakaDateString();
  const currentMonth = today.slice(0, 7);
  const currentDay = Number(today.slice(8, 10)) || 1;

  const [ledgerRes, defRes, ovRes, memRes, rateRes] = await Promise.all([
    pool.query(`SELECT type, amount FROM mm_ledger_entries WHERE membership_id = $1`, [
      membershipId
    ]),
    pool.query(`SELECT * FROM mm_meal_defaults WHERE membership_id = $1`, [membershipId]),
    pool.query(`SELECT * FROM mm_meal_overrides WHERE membership_id = $1 AND date LIKE $2`, [
      membershipId,
      `${currentMonth}-%`
    ]),
    pool.query(`SELECT joined_at, cook_bill_amount FROM mm_memberships WHERE id = $1`, [
      membershipId
    ]),
    pool.query(
      `SELECT effective_from, meal_rate, cook_bill, fuel_bill
       FROM mm_rate_history WHERE mess_id = $1 ORDER BY effective_from ASC`,
      [mess.id]
    )
  ]);

  let deposits = new Decimal(0);
  let otherDebits = new Decimal(0);

  for (const row of ledgerRes.rows) {
    const amt = new Decimal(row.amount);
    if (row.type === LedgerType.DEPOSIT) {
      deposits = deposits.plus(amt);
    } else if (row.type === LedgerType.REFUND) {
      deposits = deposits.plus(amt);
    } else if (row.type === LedgerType.ADJUSTMENT) {
      deposits = deposits.plus(amt);
    } else {
      otherDebits = otherDebits.plus(amt.abs());
    }
  }

  const joinedAtDate = memRes.rows[0]?.joined_at
    ? getDhakaDateString(new Date(memRes.rows[0].joined_at))
    : `${currentMonth}-01`;
  const startDay = joinedAtDate.startsWith(currentMonth)
    ? Number(joinedAtDate.slice(8, 10)) || 1
    : 1;

  const def = defRes.rows[0] as MealDefaultRow | undefined;
  const ovMap = new Map<string, MealOverrideRow>();
  for (const ov of ovRes.rows as MealOverrideRow[]) {
    ovMap.set(`${ov.date}:${ov.slot}`, ov);
  }

  const rateHistory = rateRes.rows as RateHistoryRow[];
  const fallbackRates = {
    mealRate: mess.mealRate,
    cookBill: memRes.rows[0]?.cook_bill_amount ?? 250,
    fuelBill: 0
  };

  let estimatedMealCost = new Decimal(0);
  for (let d = startDay; d <= currentDay; d++) {
    const dateStr = `${currentMonth}-${String(d).padStart(2, '0')}`;
    const lunch = resolveSlot(
      def,
      ovMap.get(`${dateStr}:${SlotType.LUNCH}`),
      dateStr,
      SlotType.LUNCH
    );
    const dinner = resolveSlot(
      def,
      ovMap.get(`${dateStr}:${SlotType.DINNER}`),
      dateStr,
      SlotType.DINNER
    );
    let dayUnits = new Decimal(0);
    if (lunch.status) dayUnits = dayUnits.plus(0.5 + lunch.guestCount * 0.5);
    if (dinner.status) dayUnits = dayUnits.plus(0.5 + dinner.guestCount * 0.5);

    if (dayUnits.gt(0)) {
      const dayRate = resolveRateForDate(rateHistory, fallbackRates, dateStr);
      estimatedMealCost = estimatedMealCost.plus(dayUnits.times(dayRate.mealRate));
    }
  }

  const todayRate = resolveRateForDate(rateHistory, fallbackRates, today);
  const currentBalance = deposits.minus(otherDebits).minus(estimatedMealCost);
  const dailyEstimatedCost = todayRate.mealRate.gt(0) ? todayRate.mealRate : new Decimal(50);
  const rawDaysRemaining = dailyEstimatedCost.gt(0)
    ? currentBalance.div(dailyEstimatedCost).floor().toNumber()
    : 0;

  let status = BalanceStatus.HEALTHY;
  let graceDaysUsed = 0;

  if (currentBalance.lt(0)) {
    const deficitDays = dailyEstimatedCost.gt(0)
      ? currentBalance.abs().div(dailyEstimatedCost).ceil().toNumber()
      : 1;
    graceDaysUsed = Math.min(mess.graceDays, deficitDays);
    if (deficitDays > mess.graceDays) {
      status = BalanceStatus.AUTO_OFF;
    } else {
      status = BalanceStatus.GRACE;
    }
  } else if (rawDaysRemaining <= mess.warningDays) {
    status = BalanceStatus.WARNING;
  }

  return {
    currentBalance: currentBalance.toFixed(2),
    dailyEstimatedCost: dailyEstimatedCost.toFixed(2),
    daysRemaining: Math.max(0, rawDaysRemaining),
    status,
    graceDaysUsed,
    graceDaysLeft: Math.max(0, mess.graceDays - graceDaysUsed),
    isAutoOff: status === BalanceStatus.AUTO_OFF
  };
}

/**
 * Writes an entry to the immutable audit trail.
 */
export async function writeAuditLog(params: {
  messId: string;
  actorId: string;
  action: string;
  entity: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO mm_audit_logs (mess_id, actor_id, action, entity, before_data, after_data, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      params.messId,
      params.actorId,
      params.action,
      params.entity,
      params.before ? JSON.stringify(params.before) : null,
      params.after ? JSON.stringify(params.after) : null,
      params.reason || null
    ]
  );
}
