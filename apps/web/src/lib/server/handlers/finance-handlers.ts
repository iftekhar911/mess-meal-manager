import Decimal from 'decimal.js';
import { NextRequest, NextResponse } from 'next/server';
import {
  BalanceStatus,
  ExpenseStatus,
  LedgerEntryDto,
  LedgerType,
  MembershipRole,
  MonthStatementDto,
  RosterSource,
  ShoppingExpenseDto,
  ShoppingRosterDto,
  SlotType,
  getDhakaDateString
} from '@mess/shared';
import { getPool } from '../db';
import { HttpError, requireAuth, requireMembership } from '../auth';
import {
  MealDefaultRow,
  MealOverrideRow,
  RateHistoryRow,
  evaluateMemberBalance,
  mapMessRow,
  resolveRateForDate,
  resolveSlot,
  writeAuditLog
} from '../mess-calc';

/**
 * Handles /roster, /expenses, /ledger, and /reports routes for a mess.
 */
export async function handleFinanceRoute(
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

  // ROSTER
  if (resource === 'roster') {
    if (subSegments.length === 1 && method === 'GET') {
      const month = req.nextUrl.searchParams.get('month') || getDhakaDateString().slice(0, 7);
      const res = await pool.query(
        `SELECT r.*, mem.user_id, mem.role, mem.is_active, mem.cook_bill_amount, mem.joined_at,
                u.name AS u_name, u.phone AS u_phone, u.avatar_url AS u_avatar, u.created_at AS u_created
         FROM mm_shopping_roster r
         INNER JOIN mm_memberships mem ON mem.id = r.membership_id
         INNER JOIN mm_users u ON u.id = mem.user_id
         WHERE r.mess_id = $1 AND r.date LIKE $2
         ORDER BY r.date ASC, r.created_at ASC`,
        [messId, `${month}-%`]
      );
      const items: ShoppingRosterDto[] = res.rows.map((r) => ({
        id: r.id,
        messId: r.mess_id,
        date: r.date,
        membershipId: r.membership_id,
        source: r.source as RosterSource,
        member: {
          id: r.membership_id,
          userId: r.user_id,
          messId: r.mess_id,
          role: r.role as MembershipRole,
          isActive: r.is_active,
          cookBillAmount: Number(r.cook_bill_amount).toFixed(2),
          joinedAt: new Date(r.joined_at).toISOString(),
          user: {
            id: r.user_id,
            name: r.u_name,
            phone: r.u_phone,
            avatarUrl: r.u_avatar || null,
            createdAt: new Date(r.u_created).toISOString()
          }
        }
      }));
      return NextResponse.json({ data: items });
    }

    if (subSegments[1] === 'vote' && method === 'POST') {
      const date = String(body.date || getDhakaDateString());
      await pool.query(
        `INSERT INTO mm_shopping_roster (mess_id, date, membership_id, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (mess_id, date, membership_id) DO NOTHING`,
        [messId, date, membership.id, RosterSource.VOTE]
      );
      return NextResponse.json({ data: { success: true } });
    }

    if (subSegments[1] === 'assign' && method === 'POST') {
      if (membership.role !== MembershipRole.MANAGER) {
        throw new HttpError(403, 'FORBIDDEN', 'Only managers can assign shoppers');
      }
      const date = String(body.date || getDhakaDateString());
      const targetMemId = String(body.membershipId || '');
      if (!targetMemId) throw new HttpError(400, 'VALIDATION_FAILED', 'Member is required');

      await pool.query(
        `INSERT INTO mm_shopping_roster (mess_id, date, membership_id, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (mess_id, date, membership_id) DO NOTHING`,
        [messId, date, targetMemId, RosterSource.AUTO]
      );
      return NextResponse.json({ data: { success: true } });
    }

    if (subSegments[1] === 'swap' && method === 'POST') {
      const rosterId = String(body.rosterId || '');
      const toMembershipId = String(body.toMembershipId || '');
      if (!rosterId || !toMembershipId) {
        throw new HttpError(400, 'VALIDATION_FAILED', 'Please select a member to swap with');
      }

      const existing = await pool.query(
        `SELECT * FROM mm_shopping_roster WHERE id = $1 AND mess_id = $2`,
        [rosterId, messId]
      );
      if (!existing.rows[0]) {
        throw new HttpError(404, 'NOT_FOUND', 'Roster entry not found');
      }
      if (
        existing.rows[0].membership_id !== membership.id &&
        membership.role !== MembershipRole.MANAGER
      ) {
        throw new HttpError(403, 'FORBIDDEN', 'Only the assigned shopper or manager can swap');
      }

      await pool.query(
        `UPDATE mm_shopping_roster SET membership_id = $1, source = $2 WHERE id = $3`,
        [toMembershipId, RosterSource.SWAP, rosterId]
      );
      return NextResponse.json({ data: { success: true } });
    }

    if (subSegments[1] === 'auto-shuffle' && method === 'POST') {
      if (membership.role !== MembershipRole.MANAGER) {
        throw new HttpError(403, 'FORBIDDEN', 'Only managers can auto-shuffle the roster');
      }
      const month = req.nextUrl.searchParams.get('month') || getDhakaDateString().slice(0, 7);
      const [y, m] = month.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(y!, m!, 0)).getUTCDate() || 30;

      const [messRes, membersRes, existingRes] = await Promise.all([
        pool.query(`SELECT shoppers_per_day FROM mm_messes WHERE id = $1`, [messId]),
        pool.query(
          `SELECT id FROM mm_memberships WHERE mess_id = $1 AND is_active = TRUE ORDER BY joined_at ASC`,
          [messId]
        ),
        pool.query(
          `SELECT date, membership_id FROM mm_shopping_roster WHERE mess_id = $1 AND date LIKE $2`,
          [messId, `${month}-%`]
        )
      ]);

      const shoppersPerDay = Number(messRes.rows[0]?.shoppers_per_day || 1);
      const activeIds: string[] = membersRes.rows.map((r) => r.id);
      if (activeIds.length === 0) return NextResponse.json({ data: { success: true } });

      const byDate = new Map<string, Set<string>>();
      for (const r of existingRes.rows) {
        if (!byDate.has(r.date)) byDate.set(r.date, new Set());
        byDate.get(r.date)!.add(r.membership_id);
      }

      let cursor = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${month}-${String(d).padStart(2, '0')}`;
        const assigned = byDate.get(dateStr) || new Set<string>();
        const needed = Math.min(shoppersPerDay, activeIds.length) - assigned.size;
        for (let k = 0; k < needed; k++) {
          let picked = activeIds[cursor % activeIds.length]!;
          let tries = 0;
          while (assigned.has(picked) && tries < activeIds.length) {
            cursor++;
            picked = activeIds[cursor % activeIds.length]!;
            tries++;
          }
          if (!assigned.has(picked)) {
            assigned.add(picked);
            await pool.query(
              `INSERT INTO mm_shopping_roster (mess_id, date, membership_id, source)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (mess_id, date, membership_id) DO NOTHING`,
              [messId, dateStr, picked, RosterSource.AUTO]
            );
          }
          cursor++;
        }
      }
      return NextResponse.json({ data: { success: true } });
    }
  }

  // EXPENSES
  if (resource === 'expenses') {
    if (subSegments[1] === 'shopping' && subSegments.length === 2 && method === 'GET') {
      const month = req.nextUrl.searchParams.get('month') || getDhakaDateString().slice(0, 7);
      const res = await pool.query(
        `SELECT e.*, mem.user_id, mem.role, mem.is_active, mem.cook_bill_amount, mem.joined_at,
                u.name AS u_name, u.phone AS u_phone, u.avatar_url AS u_avatar, u.created_at AS u_created
         FROM mm_shopping_expenses e
         INNER JOIN mm_memberships mem ON mem.id = e.shopper_id
         INNER JOIN mm_users u ON u.id = mem.user_id
         WHERE e.mess_id = $1 AND e.date LIKE $2
         ORDER BY e.date DESC, e.created_at DESC`,
        [messId, `${month}-%`]
      );
      const list: ShoppingExpenseDto[] = res.rows.map((r) => ({
        id: r.id,
        messId: r.mess_id,
        shopperId: r.shopper_id,
        date: r.date,
        total: Number(r.total).toFixed(2),
        status: r.status as ExpenseStatus,
        receiptUrl: r.receipt_url || null,
        items: Array.isArray(r.items) ? r.items : [],
        createdAt: new Date(r.created_at).toISOString(),
        shopper: {
          id: r.shopper_id,
          userId: r.user_id,
          messId: r.mess_id,
          role: r.role as MembershipRole,
          isActive: r.is_active,
          cookBillAmount: Number(r.cook_bill_amount).toFixed(2),
          joinedAt: new Date(r.joined_at).toISOString(),
          user: {
            id: r.user_id,
            name: r.u_name,
            phone: r.u_phone,
            avatarUrl: r.u_avatar || null,
            createdAt: new Date(r.u_created).toISOString()
          }
        }
      }));
      return NextResponse.json({ data: list });
    }

    if (subSegments[1] === 'shopping' && subSegments.length === 2 && method === 'POST') {
      const date = String(body.date || getDhakaDateString());
      const rawItems = Array.isArray(body.items) ? body.items : [];
      const items = rawItems
        .map((it: Record<string, unknown>, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          name: String(it.name || '').trim(),
          quantity: String(it.quantity || '').trim(),
          price: Number(it.price || 0).toFixed(2)
        }))
        .filter((it) => it.name && Number(it.price) > 0);

      if (items.length === 0) {
        throw new HttpError(400, 'VALIDATION_FAILED', 'Please add at least one item with a price');
      }

      const total = items
        .reduce((acc, it) => acc.plus(new Decimal(it.price)), new Decimal(0))
        .toFixed(2);
      const receiptUrl = body.receiptUrl ? String(body.receiptUrl).trim() : null;
      const initialStatus =
        membership.role === MembershipRole.MANAGER ? ExpenseStatus.APPROVED : ExpenseStatus.PENDING;

      const res = await pool.query(
        `INSERT INTO mm_shopping_expenses (mess_id, shopper_id, date, total, status, receipt_url, items)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [messId, membership.id, date, total, initialStatus, receiptUrl, JSON.stringify(items)]
      );
      return NextResponse.json({ data: res.rows[0] }, { status: 201 });
    }

    if (subSegments[1] === 'shopping' && subSegments.length === 4 && method === 'POST') {
      if (membership.role !== MembershipRole.MANAGER) {
        throw new HttpError(403, 'FORBIDDEN', 'Only managers can approve or reject expenses');
      }
      const expenseId = subSegments[2]!;
      const decision = subSegments[3];
      const newStatus =
        decision === 'approve'
          ? ExpenseStatus.APPROVED
          : decision === 'reject'
            ? ExpenseStatus.REJECTED
            : null;
      if (!newStatus) throw new HttpError(404, 'NOT_FOUND', 'Invalid expense action');

      const res = await pool.query(
        `UPDATE mm_shopping_expenses SET status = $1, updated_at = NOW()
         WHERE id = $2 AND mess_id = $3 RETURNING *`,
        [newStatus, expenseId, messId]
      );
      if (!res.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Expense not found');

      await writeAuditLog({
        messId,
        actorId: user.id,
        action: newStatus === ExpenseStatus.APPROVED ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
        entity: 'expenses',
        after: { total: res.rows[0].total, status: newStatus },
        reason: `Marked shopping expense as ${newStatus.toLowerCase()}`
      });

      return NextResponse.json({ data: res.rows[0] });
    }

    if (subSegments[1] === 'fuel' && method === 'POST') {
      if (membership.role !== MembershipRole.MANAGER) {
        throw new HttpError(403, 'FORBIDDEN', 'Only managers can record fuel expenses');
      }
      const amount = new Decimal(Number(body.amount || 0));
      if (amount.lte(0)) {
        throw new HttpError(400, 'VALIDATION_FAILED', 'Fuel amount must be greater than zero');
      }
      const date = String(body.date || getDhakaDateString());
      const note = String(body.note || '').trim() || 'Gas / fuel cylinder cost';

      const membersRes = await pool.query(
        `SELECT id FROM mm_memberships WHERE mess_id = $1 AND is_active = TRUE`,
        [messId]
      );
      const count = membersRes.rows.length;
      if (count > 0) {
        const share = amount.div(count).toFixed(2);
        for (const m of membersRes.rows) {
          await pool.query(
            `INSERT INTO mm_ledger_entries (mess_id, membership_id, type, amount, date, note, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [messId, m.id, LedgerType.FUEL, `-${share}`, date, note, user.id]
          );
        }
      }

      await writeAuditLog({
        messId,
        actorId: user.id,
        action: 'FUEL_EXPENSE_RECORDED',
        entity: 'expenses',
        after: { amount: amount.toFixed(2), note },
        reason: note
      });

      return NextResponse.json({ data: { success: true } });
    }
  }

  // LEDGER
  if (resource === 'ledger') {
    if (subSegments[1] === 'balance' && subSegments[2] && method === 'GET') {
      const targetMemId = subSegments[2]!;
      const messRes = await pool.query(`SELECT * FROM mm_messes WHERE id = $1`, [messId]);
      if (!messRes.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Mess not found');
      const evalResult = await evaluateMemberBalance(mapMessRow(messRes.rows[0]), targetMemId);
      return NextResponse.json({ data: evalResult });
    }

    if (subSegments[1] === 'statement' && subSegments[2] && method === 'GET') {
      const targetMemId = subSegments[2]!;
      const res = await pool.query(
        `SELECT * FROM mm_ledger_entries
         WHERE mess_id = $1 AND membership_id = $2
         ORDER BY date DESC, created_at DESC`,
        [messId, targetMemId]
      );
      const entries: LedgerEntryDto[] = res.rows.map((r) => ({
        id: r.id,
        membershipId: r.membership_id,
        type: r.type as LedgerType,
        amount: Number(r.amount).toFixed(2),
        date: r.date,
        referenceId: r.reference_id || null,
        note: r.note || null,
        createdBy: r.created_by || '',
        createdAt: new Date(r.created_at).toISOString()
      }));
      return NextResponse.json({ data: entries });
    }

    if (subSegments[1] === 'deposit' && method === 'POST') {
      if (membership.role !== MembershipRole.MANAGER) {
        throw new HttpError(403, 'FORBIDDEN', 'Only managers can record deposits');
      }
      const targetMemId = String(body.membershipId || '');
      const amount = new Decimal(Number(body.amount || 0));
      if (!targetMemId || amount.lte(0)) {
        throw new HttpError(
          400,
          'VALIDATION_FAILED',
          'Valid member and positive deposit amount are required'
        );
      }
      const date = String(body.date || getDhakaDateString());
      const note = String(body.note || '').trim() || 'Cash deposit';

      const res = await pool.query(
        `INSERT INTO mm_ledger_entries (mess_id, membership_id, type, amount, date, note, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [messId, targetMemId, LedgerType.DEPOSIT, amount.toFixed(2), date, note, user.id]
      );

      await writeAuditLog({
        messId,
        actorId: user.id,
        action: 'DEPOSIT_RECORDED',
        entity: 'ledger',
        after: { amount: amount.toFixed(2), note },
        reason: note
      });

      return NextResponse.json({ data: res.rows[0] }, { status: 201 });
    }

    if (subSegments[1] === 'adjustment' && method === 'POST') {
      if (membership.role !== MembershipRole.MANAGER) {
        throw new HttpError(403, 'FORBIDDEN', 'Only managers can post ledger adjustments');
      }
      const targetMemId = String(body.membershipId || '');
      const rawAmount = new Decimal(Number(body.amount || 0));
      if (!targetMemId || rawAmount.eq(0)) {
        throw new HttpError(400, 'VALIDATION_FAILED', 'Member and non-zero amount are required');
      }
      const type = (body.type as LedgerType) || LedgerType.ADJUSTMENT;
      const date = String(body.date || getDhakaDateString());
      const reason = String(body.reason || '').trim() || 'Manager ledger adjustment';

      const res = await pool.query(
        `INSERT INTO mm_ledger_entries (mess_id, membership_id, type, amount, date, note, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [messId, targetMemId, type, rawAmount.toFixed(2), date, reason, user.id]
      );

      await writeAuditLog({
        messId,
        actorId: user.id,
        action: 'LEDGER_ADJUSTMENT',
        entity: 'ledger',
        after: { type, amount: rawAmount.toFixed(2) },
        reason
      });

      return NextResponse.json({ data: res.rows[0] }, { status: 201 });
    }

    // PATCH /ledger/:entryId (MANAGER ONLY: edit deposit/ledger entry with audit trail)
    if (subSegments.length === 2 && method === 'PATCH') {
      if (membership.role !== MembershipRole.MANAGER) {
        throw new HttpError(403, 'FORBIDDEN', 'Only managers can edit deposit records');
      }
      const entryId = subSegments[1]!;
      const beforeRes = await pool.query(
        `SELECT * FROM mm_ledger_entries WHERE id = $1 AND mess_id = $2`,
        [entryId, messId]
      );
      const before = beforeRes.rows[0];
      if (!before) {
        throw new HttpError(404, 'NOT_FOUND', 'Ledger entry not found');
      }

      const newAmount =
        body.amount !== undefined ? new Decimal(Number(body.amount)).toFixed(2) : before.amount;
      const newDate = body.date !== undefined ? String(body.date) : before.date;
      const newNote = body.note !== undefined ? String(body.note).trim() : before.note;

      const updated = await pool.query(
        `UPDATE mm_ledger_entries
         SET amount = $1, date = $2, note = $3
         WHERE id = $4 AND mess_id = $5
         RETURNING *`,
        [newAmount, newDate, newNote, entryId, messId]
      );

      await writeAuditLog({
        messId,
        actorId: user.id,
        action: 'DEPOSIT_EDITED',
        entity: 'ledger',
        before: { amount: before.amount, date: before.date, note: before.note },
        after: { amount: newAmount, date: newDate, note: newNote },
        reason: `Edited entry from ${before.amount} to ${newAmount}`
      });

      return NextResponse.json({ data: updated.rows[0] });
    }
  }

  // EFFECTIVE-DATED RATES (Meal Rate, Cook Bill, Fuel/Khori Bill)
  if (resource === 'rates') {
    if (subSegments.length === 1 && method === 'GET') {
      const [messRes, histRes] = await Promise.all([
        pool.query(
          `SELECT meal_rate, default_cook_bill, default_fuel_bill FROM mm_messes WHERE id = $1`,
          [messId]
        ),
        pool.query(
          `SELECT r.*, u.name AS actor_name
           FROM mm_rate_history r
           LEFT JOIN mm_users u ON u.id = r.created_by
           WHERE r.mess_id = $1
           ORDER BY r.effective_from DESC`,
          [messId]
        )
      ]);
      const messRow = messRes.rows[0];
      return NextResponse.json({
        data: {
          current: {
            mealRate: Number(messRow?.meal_rate ?? 50).toFixed(2),
            cookBill: Number(messRow?.default_cook_bill ?? 250).toFixed(2),
            fuelBill: Number(messRow?.default_fuel_bill ?? 0).toFixed(2)
          },
          history: histRes.rows.map((r) => ({
            id: r.id,
            effectiveFrom: r.effective_from,
            mealRate: Number(r.meal_rate).toFixed(2),
            cookBill: Number(r.cook_bill).toFixed(2),
            fuelBill: Number(r.fuel_bill).toFixed(2),
            updatedBy: r.actor_name || null,
            createdAt: new Date(r.created_at).toISOString()
          }))
        }
      });
    }

    if (subSegments.length === 1 && method === 'POST') {
      if (membership.role !== MembershipRole.MANAGER) {
        throw new HttpError(403, 'FORBIDDEN', 'Only managers can update rates');
      }
      const today = getDhakaDateString();
      const effectiveFrom = String(body.effectiveFrom || today);
      const mealRate = Number(body.mealRate);
      const cookBill = Number(body.cookBill);
      const fuelBill = Number(body.fuelBill);

      if (
        isNaN(mealRate) ||
        mealRate < 0 ||
        isNaN(cookBill) ||
        cookBill < 0 ||
        isNaN(fuelBill) ||
        fuelBill < 0
      ) {
        throw new HttpError(400, 'VALIDATION_FAILED', 'Please enter valid non-negative rates');
      }

      const res = await pool.query(
        `INSERT INTO mm_rate_history (mess_id, effective_from, meal_rate, cook_bill, fuel_bill, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mess_id, effective_from)
         DO UPDATE SET meal_rate = EXCLUDED.meal_rate, cook_bill = EXCLUDED.cook_bill, fuel_bill = EXCLUDED.fuel_bill, created_by = EXCLUDED.created_by, created_at = NOW()
         RETURNING *`,
        [
          messId,
          effectiveFrom,
          mealRate.toFixed(2),
          cookBill.toFixed(2),
          fuelBill.toFixed(2),
          user.id
        ]
      );

      // Update mess current active values when effectiveFrom <= today
      if (effectiveFrom <= today) {
        await pool.query(
          `UPDATE mm_messes
           SET meal_rate = $2, default_cook_bill = $3, default_fuel_bill = $4, updated_at = NOW()
           WHERE id = $1`,
          [messId, mealRate.toFixed(2), cookBill.toFixed(2), fuelBill.toFixed(2)]
        );
      }

      await writeAuditLog({
        messId,
        actorId: user.id,
        action: 'RATE_UPDATED',
        entity: 'rates',
        after: {
          effectiveFrom,
          mealRate: mealRate.toFixed(2),
          cookBill: cookBill.toFixed(2),
          fuelBill: fuelBill.toFixed(2)
        },
        reason: `Rates updated effective from ${effectiveFrom}`
      });

      return NextResponse.json({ data: res.rows[0] }, { status: 201 });
    }
  }

  // REPORTS
  if (resource === 'reports') {
    if (subSegments[1] === 'statement' && method === 'GET') {
      const month = req.nextUrl.searchParams.get('month') || getDhakaDateString().slice(0, 7);
      const [y, m] = month.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(y!, m!, 0)).getUTCDate() || 30;
      const today = getDhakaDateString();
      const maxDay =
        month === today.slice(0, 7) ? Number(today.slice(8, 10)) || daysInMonth : daysInMonth;

      const [messRes, membersRes, defsRes, ovsRes, expensesRes, ledgerRes, closedRes, rateRes] =
        await Promise.all([
          pool.query(`SELECT * FROM mm_messes WHERE id = $1`, [messId]),
          pool.query(
            `SELECT mem.*, u.name AS u_name, u.phone AS u_phone
             FROM mm_memberships mem
             INNER JOIN mm_users u ON u.id = mem.user_id
             WHERE mem.mess_id = $1 AND mem.is_active = TRUE
             ORDER BY mem.joined_at ASC`,
            [messId]
          ),
          pool.query(
            `SELECT d.* FROM mm_meal_defaults d INNER JOIN mm_memberships mem ON mem.id = d.membership_id WHERE mem.mess_id = $1`,
            [messId]
          ),
          pool.query(`SELECT * FROM mm_meal_overrides WHERE mess_id = $1 AND date LIKE $2`, [
            messId,
            `${month}-%`
          ]),
          pool.query(
            `SELECT total FROM mm_shopping_expenses WHERE mess_id = $1 AND date LIKE $2 AND status = 'APPROVED'`,
            [messId, `${month}-%`]
          ),
          pool.query(
            `SELECT membership_id, type, amount FROM mm_ledger_entries WHERE mess_id = $1 AND date LIKE $2`,
            [messId, `${month}-%`]
          ),
          pool.query(`SELECT * FROM mm_closed_months WHERE mess_id = $1 AND month = $2`, [
            messId,
            month
          ]),
          pool.query(
            `SELECT effective_from, meal_rate, cook_bill, fuel_bill
             FROM mm_rate_history WHERE mess_id = $1 ORDER BY effective_from ASC`,
            [messId]
          )
        ]);

      if (!messRes.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Mess not found');
      const mess = mapMessRow(messRes.rows[0]);
      const closedRow = closedRes.rows[0];
      const rateHistory = rateRes.rows as RateHistoryRow[];

      const defMap = new Map<string, MealDefaultRow>();
      for (const d of defsRes.rows as MealDefaultRow[]) defMap.set(d.membership_id, d);

      const ovMap = new Map<string, MealOverrideRow>();
      for (const o of ovsRes.rows as MealOverrideRow[]) {
        ovMap.set(`${o.membership_id}:${o.date}:${o.slot}`, o);
      }

      let totalMessMeals = new Decimal(0);
      const memberMealsMap = new Map<string, Decimal>();
      const memberEffectiveMealCostMap = new Map<string, Decimal>();
      const memberCookBillMap = new Map<string, Decimal>();
      const memberRateFuelMap = new Map<string, Decimal>();

      for (const mem of membersRes.rows) {
        const joinedDate = getDhakaDateString(new Date(mem.joined_at));
        const startDay = joinedDate.startsWith(month) ? Number(joinedDate.slice(8, 10)) || 1 : 1;
        const def = defMap.get(mem.id);
        const fallback = {
          mealRate: mess.mealRate,
          cookBill: mem.cook_bill_amount ?? messRes.rows[0].default_cook_bill ?? 250,
          fuelBill: messRes.rows[0].default_fuel_bill ?? 0
        };

        let mMeals = new Decimal(0);
        let mEffectiveMealCost = new Decimal(0);
        let mCookSum = new Decimal(0);
        let mFuelSum = new Decimal(0);

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${month}-${String(d).padStart(2, '0')}`;
          const dayRate = resolveRateForDate(rateHistory, fallback, dateStr);
          // Prorate cook & fuel/khori bill per day across the month using the rate active on each day
          mCookSum = mCookSum.plus(dayRate.cookBill.div(daysInMonth));
          mFuelSum = mFuelSum.plus(dayRate.fuelBill.div(daysInMonth));

          if (d >= startDay && d <= maxDay) {
            const lunch = resolveSlot(
              def,
              ovMap.get(`${mem.id}:${dateStr}:${SlotType.LUNCH}`),
              dateStr,
              SlotType.LUNCH
            );
            const dinner = resolveSlot(
              def,
              ovMap.get(`${mem.id}:${dateStr}:${SlotType.DINNER}`),
              dateStr,
              SlotType.DINNER
            );
            let dayUnits = new Decimal(0);
            if (lunch.status) dayUnits = dayUnits.plus(0.5 + lunch.guestCount * 0.5);
            if (dinner.status) dayUnits = dayUnits.plus(0.5 + dinner.guestCount * 0.5);
            mMeals = mMeals.plus(dayUnits);
            mEffectiveMealCost = mEffectiveMealCost.plus(dayUnits.times(dayRate.mealRate));
          }
        }

        memberMealsMap.set(mem.id, mMeals);
        memberEffectiveMealCostMap.set(mem.id, mEffectiveMealCost);
        memberCookBillMap.set(
          mem.id,
          rateHistory.length > 0 ? mCookSum : new Decimal(mem.cook_bill_amount)
        );
        memberRateFuelMap.set(mem.id, mFuelSum);
        totalMessMeals = totalMessMeals.plus(mMeals);
      }

      const totalMarketCost = expensesRes.rows.reduce(
        (acc, r) => acc.plus(new Decimal(r.total)),
        new Decimal(0)
      );

      let totalFuelCost = new Decimal(0);
      let totalDeposits = new Decimal(0);

      for (const l of ledgerRes.rows) {
        const amt = new Decimal(l.amount);
        if (l.type === LedgerType.DEPOSIT) totalDeposits = totalDeposits.plus(amt);
        if (l.type === LedgerType.FUEL) totalFuelCost = totalFuelCost.plus(amt.abs());
      }
      if (closedRow && Number(closedRow.actual_fuel_cost) > 0) {
        totalFuelCost = new Decimal(closedRow.actual_fuel_cost);
      }

      const actualMealRate = closedRow
        ? new Decimal(closedRow.actual_meal_rate)
        : totalMessMeals.gt(0) && totalMarketCost.gt(0)
          ? totalMarketCost.div(totalMessMeals)
          : new Decimal(mess.mealRate);

      const memberCount = Math.max(1, membersRes.rows.length);
      const perMemberLedgerFuel = totalFuelCost.div(memberCount);

      const memberStatements = membersRes.rows.map((mem) => {
        const meals = memberMealsMap.get(mem.id) || new Decimal(0);
        // If month is closed or actual market expenses exist, use market-based rate; otherwise use effective-dated meal rate history
        const mealCost =
          closedRow || totalMarketCost.gt(0)
            ? meals.times(actualMealRate)
            : memberEffectiveMealCostMap.get(mem.id) || meals.times(actualMealRate);
        const cookBill = memberCookBillMap.get(mem.id) || new Decimal(mem.cook_bill_amount);
        const rateFuel = memberRateFuelMap.get(mem.id) || new Decimal(0);
        const fuelCost = perMemberLedgerFuel.gt(0) ? perMemberLedgerFuel : rateFuel;

        let mDeposits = new Decimal(0);
        let mOtherDebits = new Decimal(0);

        for (const l of ledgerRes.rows) {
          if (l.membership_id !== mem.id) continue;
          const amt = new Decimal(l.amount);
          if (l.type === LedgerType.DEPOSIT || l.type === LedgerType.REFUND) {
            mDeposits = mDeposits.plus(amt);
          } else if (l.type === LedgerType.ADJUSTMENT) {
            if (amt.gt(0)) mDeposits = mDeposits.plus(amt);
            else mOtherDebits = mOtherDebits.plus(amt.abs());
          }
        }

        const totalDebits = mealCost.plus(fuelCost).plus(cookBill).plus(mOtherDebits);
        const finalBalance = mDeposits.minus(totalDebits);

        return {
          membershipId: mem.id,
          userName: mem.u_name,
          userPhone: mem.u_phone,
          totalMeals: meals.toNumber(),
          mealCost: mealCost.toFixed(2),
          fuelCost: fuelCost.toFixed(2),
          cookBill: cookBill.toFixed(2),
          otherDebits: mOtherDebits.toFixed(2),
          totalDebits: totalDebits.toFixed(2),
          totalDeposits: mDeposits.toFixed(2),
          finalBalance: finalBalance.toFixed(2),
          status: finalBalance.lt(0)
            ? BalanceStatus.GRACE
            : finalBalance.lt(200)
              ? BalanceStatus.WARNING
              : BalanceStatus.HEALTHY
        };
      });

      const statement: MonthStatementDto = {
        messName: mess.name,
        month,
        isClosed: Boolean(closedRow),
        estimatedMealRate: mess.mealRate,
        actualMealRate: actualMealRate.toFixed(2),
        totalMeals: totalMessMeals.toNumber(),
        totalMarketCost: totalMarketCost.toFixed(2),
        totalFuelCost: totalFuelCost.toFixed(2),
        totalDeposits: totalDeposits.toFixed(2),
        members: memberStatements
      };

      return NextResponse.json({ data: statement });
    }

    if (subSegments[1] === 'close-month' && method === 'POST') {
      if (membership.role !== MembershipRole.MANAGER) {
        throw new HttpError(403, 'FORBIDDEN', 'Only managers can close a month');
      }
      const month = String(body.month || getDhakaDateString().slice(0, 7));
      const actualFuelCost = Number(body.actualFuelCost ?? 0).toFixed(2);

      const messRes = await pool.query(`SELECT meal_rate FROM mm_messes WHERE id = $1`, [messId]);
      const mealRate = Number(messRes.rows[0]?.meal_rate || 50).toFixed(2);

      await pool.query(
        `INSERT INTO mm_closed_months (mess_id, month, actual_meal_rate, actual_fuel_cost, closed_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (mess_id, month)
         DO UPDATE SET actual_fuel_cost = EXCLUDED.actual_fuel_cost, closed_at = NOW()`,
        [messId, month, mealRate, actualFuelCost, user.id]
      );

      await writeAuditLog({
        messId,
        actorId: user.id,
        action: 'MONTH_CLOSED',
        entity: 'reports',
        after: { month, actualFuelCost },
        reason: `Closed and locked month ${month}`
      });

      return NextResponse.json({ data: { success: true } });
    }
  }

  throw new HttpError(404, 'NOT_FOUND', 'Finance route not found');
}
