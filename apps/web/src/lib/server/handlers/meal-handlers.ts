import Decimal from 'decimal.js';
import { NextRequest, NextResponse } from 'next/server';
import {
  EggPreference,
  MealType,
  MembershipRole,
  ProteinType,
  ShopperDailySummaryDto,
  SlotType,
  getDhakaDateString
} from '@mess/shared';
import { getPool } from '../db';
import { HttpError, requireAuth, requireMembership } from '../auth';
import {
  MealDefaultRow,
  MealOverrideRow,
  mapMessRow,
  resolveSlot,
  writeAuditLog
} from '../mess-calc';

/**
 * Handles /api/messes/:messId/meals/* and /api/messes/:messId/menus.
 */
export async function handleMealRoute(
  req: NextRequest,
  messId: string,
  subSegments: string[],
  body: Record<string, unknown>
): Promise<NextResponse> {
  const pool = getPool();
  const user = await requireAuth(req);
  const membership = await requireMembership(user.id, messId, false);
  const method = req.method.toUpperCase();
  const resource = subSegments[0];

  // MENUS
  if (resource === 'menus' && method === 'POST') {
    const date = String(body.date || getDhakaDateString());
    const protein = (body.protein as ProteinType) || ProteinType.OTHER;
    const note = body.note !== undefined ? String(body.note).trim() : null;

    // Allow managers or assigned shopper for that date
    if (membership.role !== MembershipRole.MANAGER) {
      const rosterCheck = await pool.query(
        `SELECT id FROM mm_shopping_roster WHERE mess_id = $1 AND date = $2 AND membership_id = $3`,
        [messId, date, membership.id]
      );
      if (!rosterCheck.rows[0]) {
        throw new HttpError(403, 'FORBIDDEN', 'Only today shopper or manager can update the menu');
      }
    }

    const res = await pool.query(
      `INSERT INTO mm_daily_menus (mess_id, date, shopper_id, protein, note, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (mess_id, date)
       DO UPDATE SET protein = EXCLUDED.protein, note = EXCLUDED.note, shopper_id = EXCLUDED.shopper_id, updated_at = NOW()
       RETURNING *`,
      [messId, date, membership.id, protein, note]
    );

    const row = res.rows[0];
    return NextResponse.json({
      data: {
        id: row.id,
        messId: row.mess_id,
        date: row.date,
        shopperId: row.shopper_id,
        protein: row.protein,
        note: row.note
      }
    });
  }

  if (resource !== 'meals') {
    throw new HttpError(404, 'NOT_FOUND', 'Meal route not found');
  }

  const action = subSegments[1];

  // GET /meals/preferences/:membershipId or /meals/default/:membershipId
  if ((action === 'preferences' || action === 'default') && method === 'GET') {
    const targetMemId = subSegments[2] || membership.id;
    const res = await pool.query(`SELECT * FROM mm_meal_defaults WHERE membership_id = $1`, [
      targetMemId
    ]);
    const def = res.rows[0] as MealDefaultRow | undefined;
    return NextResponse.json({
      data: {
        mealType: (def?.meal_type as MealType) || MealType.FULL,
        halfSlot: (def?.half_slot as SlotType | null) || null,
        eggPreference: (def?.egg_preference as EggPreference) || EggPreference.NONE,
        isToggleOn: def ? Boolean(def.is_active) : true
      }
    });
  }

  // POST /meals/toggle/:membershipId
  if (action === 'toggle' && method === 'POST') {
    const targetMemId = subSegments[2] || membership.id;
    if (targetMemId !== membership.id && membership.role !== MembershipRole.MANAGER) {
      throw new HttpError(403, 'FORBIDDEN', 'You can only change your own meals');
    }
    const status = Boolean(body.status);
    const fromDate = String(body.fromDate || getDhakaDateString());

    await pool.query(
      `INSERT INTO mm_meal_defaults (membership_id, is_active, toggle_from_date, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (membership_id)
       DO UPDATE SET is_active = EXCLUDED.is_active, toggle_from_date = EXCLUDED.toggle_from_date, updated_at = NOW()`,
      [targetMemId, status, fromDate]
    );

    // Clear today's non-manager overrides so the continuous toggle immediately reflects on Today Meal Status
    await pool.query(
      `DELETE FROM mm_meal_overrides WHERE membership_id = $1 AND date >= $2 AND is_manager_override = FALSE`,
      [targetMemId, fromDate]
    );

    return NextResponse.json({ data: { success: true, status } });
  }

  // POST /meals/default/:membershipId
  if (action === 'default' && method === 'POST') {
    const targetMemId = subSegments[2] || membership.id;
    if (targetMemId !== membership.id && membership.role !== MembershipRole.MANAGER) {
      throw new HttpError(403, 'FORBIDDEN', 'You can only change your own preferences');
    }

    const mealType = (body.mealType as MealType) || MealType.FULL;
    const halfSlot =
      mealType === MealType.HALF ? (body.halfSlot as SlotType) || SlotType.LUNCH : null;
    const eggPreference = (body.eggPreference as EggPreference) || EggPreference.NONE;

    await pool.query(
      `INSERT INTO mm_meal_defaults (membership_id, meal_type, half_slot, egg_preference, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (membership_id)
       DO UPDATE SET meal_type = EXCLUDED.meal_type, half_slot = EXCLUDED.half_slot, egg_preference = EXCLUDED.egg_preference, updated_at = NOW()`,
      [targetMemId, mealType, halfSlot, eggPreference]
    );

    return NextResponse.json({ data: { success: true } });
  }

  // POST /meals/override/:membershipId
  if (action === 'override' && method === 'POST') {
    const targetMemId = subSegments[2] || membership.id;
    if (targetMemId !== membership.id && membership.role !== MembershipRole.MANAGER) {
      throw new HttpError(403, 'FORBIDDEN', 'You can only override your own meals');
    }

    const date = String(body.date || getDhakaDateString());
    const slot = (body.slot as SlotType) || SlotType.LUNCH;
    const status = Boolean(body.status);
    const eggPreference = (body.eggPreference as EggPreference) || EggPreference.NONE;
    const guestCount = Math.max(0, Math.min(20, Number(body.guestCount || 0)));

    const res = await pool.query(
      `INSERT INTO mm_meal_overrides (membership_id, mess_id, date, slot, status, egg_preference, guest_count, is_manager_override, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW())
       ON CONFLICT (membership_id, date, slot)
       DO UPDATE SET status = EXCLUDED.status, egg_preference = EXCLUDED.egg_preference, guest_count = EXCLUDED.guest_count, updated_at = NOW()
       RETURNING *`,
      [targetMemId, messId, date, slot, status, eggPreference, guestCount]
    );

    return NextResponse.json({ data: res.rows[0] });
  }

  // POST /meals/force-override (MANAGER ONLY)
  if (action === 'force-override' && method === 'POST') {
    if (membership.role !== MembershipRole.MANAGER) {
      throw new HttpError(403, 'FORBIDDEN', 'Only managers can apply force overrides');
    }

    const targetMemId = String(body.membershipId || '');
    if (!targetMemId) {
      throw new HttpError(400, 'VALIDATION_FAILED', 'Member is required');
    }
    const date = String(body.date || getDhakaDateString());
    const slot = (body.slot as SlotType) || SlotType.LUNCH;
    const status = Boolean(body.status);
    const eggPreference = (body.eggPreference as EggPreference) || EggPreference.NONE;
    const guestCount = Math.max(0, Math.min(20, Number(body.guestCount || 0)));
    const reason = String(body.reason || '').trim() || 'Manager meal adjustment';

    const beforeRes = await pool.query(
      `SELECT status, guest_count, egg_preference FROM mm_meal_overrides WHERE membership_id = $1 AND date = $2 AND slot = $3`,
      [targetMemId, date, slot]
    );

    const res = await pool.query(
      `INSERT INTO mm_meal_overrides (membership_id, mess_id, date, slot, status, egg_preference, guest_count, is_manager_override, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
       ON CONFLICT (membership_id, date, slot)
       DO UPDATE SET status = EXCLUDED.status, egg_preference = EXCLUDED.egg_preference, guest_count = EXCLUDED.guest_count, is_manager_override = TRUE, updated_at = NOW()
       RETURNING *`,
      [targetMemId, messId, date, slot, status, eggPreference, guestCount]
    );

    await writeAuditLog({
      messId,
      actorId: user.id,
      action: 'FORCE_OVERRIDE',
      entity: 'meals',
      before: beforeRes.rows[0] || null,
      after: { date, slot, status, guestCount },
      reason
    });

    return NextResponse.json({ data: res.rows[0] });
  }

  // GET /meals/heatmap?month=YYYY-MM
  if (action === 'heatmap' && method === 'GET') {
    const month = req.nextUrl.searchParams.get('month') || getDhakaDateString().slice(0, 7);
    const [yearStr, monthStr] = month.split('-');
    const daysInMonth = new Date(Date.UTC(Number(yearStr), Number(monthStr), 0)).getUTCDate() || 30;

    const [membersRes, defsRes, ovsRes] = await Promise.all([
      pool.query(
        `SELECT mem.id, mem.role, u.name
         FROM mm_memberships mem
         INNER JOIN mm_users u ON u.id = mem.user_id
         WHERE mem.mess_id = $1 AND mem.is_active = TRUE
         ORDER BY mem.joined_at ASC`,
        [messId]
      ),
      pool.query(
        `SELECT d.*
         FROM mm_meal_defaults d
         INNER JOIN mm_memberships mem ON mem.id = d.membership_id
         WHERE mem.mess_id = $1`,
        [messId]
      ),
      pool.query(`SELECT * FROM mm_meal_overrides WHERE mess_id = $1 AND date LIKE $2`, [
        messId,
        `${month}-%`
      ])
    ]);

    const defMap = new Map<string, MealDefaultRow>();
    for (const d of defsRes.rows as MealDefaultRow[]) {
      defMap.set(d.membership_id, d);
    }
    const ovMap = new Map<string, MealOverrideRow>();
    for (const o of ovsRes.rows as MealOverrideRow[]) {
      ovMap.set(`${o.membership_id}:${o.date}:${o.slot}`, o);
    }

    const rows = membersRes.rows.map((m) => {
      const def = defMap.get(m.id);
      const days: Record<
        string,
        { lunch: boolean; dinner: boolean; isAutoOff: boolean; guestCount: number }
      > = {};
      let totalMeals = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${month}-${String(d).padStart(2, '0')}`;
        const lunch = resolveSlot(
          def,
          ovMap.get(`${m.id}:${dateStr}:${SlotType.LUNCH}`),
          dateStr,
          SlotType.LUNCH
        );
        const dinner = resolveSlot(
          def,
          ovMap.get(`${m.id}:${dateStr}:${SlotType.DINNER}`),
          dateStr,
          SlotType.DINNER
        );

        if (lunch.status) totalMeals += 0.5 + lunch.guestCount * 0.5;
        if (dinner.status) totalMeals += 0.5 + dinner.guestCount * 0.5;

        days[dateStr] = {
          lunch: lunch.status,
          dinner: dinner.status,
          isAutoOff: lunch.isAutoOff || dinner.isAutoOff,
          guestCount: lunch.guestCount + dinner.guestCount
        };
      }

      return {
        member: {
          id: m.id,
          name: m.name,
          role: m.role
        },
        totalMeals,
        days
      };
    });

    return NextResponse.json({ data: { month, daysInMonth, rows } });
  }

  // GET /meals/shopper-summary?date=YYYY-MM-DD
  if (action === 'shopper-summary' && method === 'GET') {
    const date = req.nextUrl.searchParams.get('date') || getDhakaDateString();

    const [messRes, membersRes, defsRes, ovsRes, menuRes] = await Promise.all([
      pool.query(`SELECT * FROM mm_messes WHERE id = $1`, [messId]),
      pool.query(`SELECT id FROM mm_memberships WHERE mess_id = $1 AND is_active = TRUE`, [messId]),
      pool.query(
        `SELECT d.* FROM mm_meal_defaults d INNER JOIN mm_memberships m ON m.id = d.membership_id WHERE m.mess_id = $1`,
        [messId]
      ),
      pool.query(`SELECT * FROM mm_meal_overrides WHERE mess_id = $1 AND date = $2`, [
        messId,
        date
      ]),
      pool.query(`SELECT * FROM mm_daily_menus WHERE mess_id = $1 AND date = $2`, [messId, date])
    ]);

    if (!messRes.rows[0]) {
      throw new HttpError(404, 'NOT_FOUND', 'Mess not found');
    }
    const mess = mapMessRow(messRes.rows[0]);
    const menuRow = menuRes.rows[0];
    const todayProtein = (menuRow?.protein as ProteinType) || ProteinType.OTHER;

    const defMap = new Map<string, MealDefaultRow>();
    for (const d of defsRes.rows as MealDefaultRow[]) defMap.set(d.membership_id, d);

    const ovMap = new Map<string, MealOverrideRow>();
    for (const o of ovsRes.rows as MealOverrideRow[]) ovMap.set(`${o.membership_id}:${o.slot}`, o);

    let lunchMeals = 0;
    let dinnerMeals = 0;
    let guestCount = 0;
    let eggCount = 0;

    const wantsEgg = (pref: EggPreference): boolean => {
      if (pref === EggPreference.INSTEAD_OF_FISH && todayProtein === ProteinType.FISH) return true;
      if (pref === EggPreference.INSTEAD_OF_CHICKEN && todayProtein === ProteinType.CHICKEN)
        return true;
      return false;
    };

    for (const m of membersRes.rows) {
      const def = defMap.get(m.id);
      const l = resolveSlot(def, ovMap.get(`${m.id}:${SlotType.LUNCH}`), date, SlotType.LUNCH);
      const dn = resolveSlot(def, ovMap.get(`${m.id}:${SlotType.DINNER}`), date, SlotType.DINNER);

      if (l.status) {
        lunchMeals += 1 + l.guestCount;
        guestCount += l.guestCount;
        if (wantsEgg(l.eggPreference)) eggCount += 1;
      }
      if (dn.status) {
        dinnerMeals += 1 + dn.guestCount;
        guestCount += dn.guestCount;
        if (wantsEgg(dn.eggPreference)) eggCount += 1;
      }
    }

    const totalMealUnits = (lunchMeals + dinnerMeals) * 0.5;
    const estimatedBudget = new Decimal(totalMealUnits).times(mess.mealRate).toFixed(2);

    const summary: ShopperDailySummaryDto = {
      date,
      messId,
      lunchMeals,
      dinnerMeals,
      totalMealUnits,
      eggCount,
      guestCount,
      estimatedBudget,
      menu: menuRow
        ? {
            id: menuRow.id,
            messId: menuRow.mess_id,
            date: menuRow.date,
            shopperId: menuRow.shopper_id,
            protein: menuRow.protein as ProteinType,
            note: menuRow.note
          }
        : null
    };

    return NextResponse.json({ data: summary });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Meal route not found');
}
