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

/**
 * Evaluates a member's real-time balance from ledger entries and resolved meals in the current month.
 */
export async function evaluateMemberBalance(
  mess: MessDto,
  membershipId: string
): Promise<BalanceEvaluationDto> {
  const pool = getPool();
  const today = getDhakaDateString();
  const currentMonth = today.slice(0, 7);
  const currentDay = Number(today.slice(8, 10)) || 1;

  const [ledgerRes, defRes, ovRes, memRes] = await Promise.all([
    pool.query(`SELECT type, amount FROM mm_ledger_entries WHERE membership_id = $1`, [
      membershipId
    ]),
    pool.query(`SELECT * FROM mm_meal_defaults WHERE membership_id = $1`, [membershipId]),
    pool.query(`SELECT * FROM mm_meal_overrides WHERE membership_id = $1 AND date LIKE $2`, [
      membershipId,
      `${currentMonth}-%`
    ]),
    pool.query(`SELECT joined_at FROM mm_memberships WHERE id = $1`, [membershipId])
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
      // Negative adjustment reduces balance, positive adjustment increases balance
      deposits = deposits.plus(amt);
    } else {
      otherDebits = otherDebits.plus(amt.abs());
    }
  }

  // Count meals taken from member's join day (or day 1 of current month) up to today
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

  let mealUnits = new Decimal(0);
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
    if (lunch.status) mealUnits = mealUnits.plus(0.5 + lunch.guestCount * 0.5);
    if (dinner.status) mealUnits = mealUnits.plus(0.5 + dinner.guestCount * 0.5);
  }

  const mealRate = new Decimal(mess.mealRate);
  const estimatedMealCost = mealUnits.times(mealRate);
  const currentBalance = deposits.minus(otherDebits).minus(estimatedMealCost);
  const dailyEstimatedCost = mealRate.gt(0) ? mealRate : new Decimal(50);
  const daysRemaining = dailyEstimatedCost.gt(0)
    ? currentBalance.div(dailyEstimatedCost).floor().toNumber()
    : 0;

  let status = BalanceStatus.HEALTHY;
  if (daysRemaining <= 0) {
    status =
      Math.abs(daysRemaining) > mess.graceDays ? BalanceStatus.AUTO_OFF : BalanceStatus.GRACE;
  } else if (daysRemaining <= mess.warningDays) {
    status = BalanceStatus.WARNING;
  }

  return {
    currentBalance: currentBalance.toFixed(2),
    dailyEstimatedCost: dailyEstimatedCost.toFixed(2),
    daysRemaining: Math.max(0, daysRemaining),
    status,
    graceDaysUsed: daysRemaining < 0 ? Math.min(mess.graceDays, Math.abs(daysRemaining)) : 0,
    graceDaysLeft:
      daysRemaining < 0 ? Math.max(0, mess.graceDays - Math.abs(daysRemaining)) : mess.graceDays,
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
