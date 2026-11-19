import { NextRequest, NextResponse } from 'next/server';
import {
  AuditLogDto,
  EggPreference,
  MealType,
  MembershipDto,
  MembershipRole,
  NoticeDto
} from '@mess/shared';
import { getPool } from '../db';
import { HttpError, normalizePhone, requireAuth, requireMembership } from '../auth';
import { mapMessRow, writeAuditLog } from '../mess-calc';

/**
 * Handles /api/messes/my, POST /api/messes, and PATCH /api/messes/:messId.
 */
export async function handleMessRootRoute(
  req: NextRequest,
  segments: string[],
  body: Record<string, unknown>
): Promise<NextResponse> {
  const pool = getPool();
  const user = await requireAuth(req);
  const method = req.method.toUpperCase();

  if (segments.length === 2 && segments[1] === 'my' && method === 'GET') {
    const res = await pool.query(
      `SELECT m.*
       FROM mm_messes m
       INNER JOIN mm_memberships mem ON mem.mess_id = m.id
       WHERE mem.user_id = $1 AND mem.is_active = TRUE
       ORDER BY mem.joined_at ASC`,
      [user.id]
    );
    return NextResponse.json({ data: res.rows.map(mapMessRow) });
  }

  if (segments.length === 1 && method === 'POST') {
    const name = String(body.name || '').trim();
    if (name.length < 2) {
      throw new HttpError(400, 'VALIDATION_FAILED', 'Mess name must be at least 2 characters');
    }

    const messRes = await pool.query(
      `INSERT INTO mm_messes (name, cutoff_time, meal_rate, grace_days, warning_days, shoppers_per_day, shop_times_per_month)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        String(body.cutoffTime || '22:00:00'),
        Number(body.mealRate || 50).toFixed(2),
        Number(body.graceDays ?? 3),
        Number(body.warningDays ?? 2),
        Number(body.shoppersPerDay ?? 2),
        Number(body.shopTimesPerMonth ?? 2)
      ]
    );
    const mess = mapMessRow(messRes.rows[0]);

    const memRes = await pool.query(
      `INSERT INTO mm_memberships (user_id, mess_id, role, is_active, cook_bill_amount)
       VALUES ($1, $2, $3, TRUE, 250.00)
       RETURNING id`,
      [user.id, mess.id, MembershipRole.MANAGER]
    );
    const memId = memRes.rows[0].id;

    await pool.query(
      `INSERT INTO mm_meal_defaults (membership_id, meal_type, half_slot, egg_preference, is_active)
       VALUES ($1, $2, NULL, $3, TRUE)`,
      [memId, MealType.FULL, EggPreference.NONE]
    );

    return NextResponse.json({ data: mess }, { status: 201 });
  }

  if (segments.length === 2 && method === 'PATCH') {
    const messId = segments[1]!;
    await requireMembership(user.id, messId, true);

    const beforeRes = await pool.query(`SELECT * FROM mm_messes WHERE id = $1`, [messId]);
    if (!beforeRes.rows[0]) {
      throw new HttpError(404, 'NOT_FOUND', 'Mess not found');
    }
    const before = beforeRes.rows[0];

    const updatedRes = await pool.query(
      `UPDATE mm_messes
       SET name = COALESCE($2, name),
           cutoff_time = COALESCE($3, cutoff_time),
           meal_rate = COALESCE($4, meal_rate),
           grace_days = COALESCE($5, grace_days),
           warning_days = COALESCE($6, warning_days),
           shoppers_per_day = COALESCE($7, shoppers_per_day),
           shop_times_per_month = COALESCE($8, shop_times_per_month),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        messId,
        body.name !== undefined ? String(body.name).trim() : null,
        body.cutoffTime !== undefined ? String(body.cutoffTime) : null,
        body.mealRate !== undefined ? Number(body.mealRate).toFixed(2) : null,
        body.graceDays !== undefined ? Number(body.graceDays) : null,
        body.warningDays !== undefined ? Number(body.warningDays) : null,
        body.shoppersPerDay !== undefined ? Number(body.shoppersPerDay) : null,
        body.shopTimesPerMonth !== undefined ? Number(body.shopTimesPerMonth) : null
      ]
    );

    await writeAuditLog({
      messId,
      actorId: user.id,
      action: 'MESS_SETTINGS_UPDATED',
      entity: 'messes',
      before: { mealRate: before.meal_rate, cutoffTime: before.cutoff_time },
      after: { mealRate: updatedRes.rows[0].meal_rate, cutoffTime: updatedRes.rows[0].cutoff_time },
      reason: 'Updated mess settings'
    });

    return NextResponse.json({ data: mapMessRow(updatedRes.rows[0]) });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Mess route not found');
}

/**
 * Handles /api/messes/:messId/members, /notices, and /audit.
 */
export async function handleMessSubRoute(
  req: NextRequest,
  messId: string,
  subSegments: string[],
  body: Record<string, unknown>
): Promise<NextResponse> {
  const pool = getPool();
  const user = await requireAuth(req);
  const method = req.method.toUpperCase();
  const resource = subSegments[0];

  // MEMBERS
  if (resource === 'members') {
    if (subSegments.length === 1 && method === 'GET') {
      await requireMembership(user.id, messId, false);
      const activeOnly = req.nextUrl.searchParams.get('activeOnly') !== 'false';

      const res = await pool.query(
        `SELECT mem.*, u.name AS u_name, u.phone AS u_phone, u.avatar_url AS u_avatar, u.created_at AS u_created
         FROM mm_memberships mem
         INNER JOIN mm_users u ON u.id = mem.user_id
         WHERE mem.mess_id = $1 ${activeOnly ? 'AND mem.is_active = TRUE' : ''}
         ORDER BY mem.joined_at ASC`,
        [messId]
      );

      const list: MembershipDto[] = res.rows.map((r) => ({
        id: r.id,
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
      }));

      return NextResponse.json({ data: list });
    }

    if (subSegments.length === 1 && method === 'POST') {
      await requireMembership(user.id, messId, true);
      const cleanPhone = normalizePhone(String(body.phone || ''));
      if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
        throw new HttpError(400, 'INVALID_PHONE', 'Please enter a valid 11-digit BD phone number');
      }

      const providedName = String(body.name || '').trim();
      const role = (body.role as MembershipRole) || MembershipRole.BOARDER;
      const cookBill = Number(body.cookBillAmount ?? 250).toFixed(2);

      let targetUserRes = await pool.query(`SELECT * FROM mm_users WHERE phone = $1`, [cleanPhone]);
      let targetUser = targetUserRes.rows[0];

      if (!targetUser) {
        const created = await pool.query(
          `INSERT INTO mm_users (name, phone, password_hash)
           VALUES ($1, $2, '__INVITED__')
           RETURNING *`,
          [providedName || `Boarder (${cleanPhone.slice(-4)})`, cleanPhone]
        );
        targetUser = created.rows[0];
      } else if (providedName && targetUser.password_hash === '__INVITED__') {
        const updatedUser = await pool.query(
          `UPDATE mm_users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [providedName, targetUser.id]
        );
        targetUser = updatedUser.rows[0];
      }

      // Check existing membership to prevent duplicates
      const existingMem = await pool.query(
        `SELECT * FROM mm_memberships WHERE user_id = $1 AND mess_id = $2`,
        [targetUser.id, messId]
      );

      let memRow;
      if (existingMem.rows[0]) {
        if (existingMem.rows[0].is_active) {
          throw new HttpError(
            409,
            'ALREADY_MEMBER',
            'This phone number is already an active member of this mess'
          );
        }
        const reactivated = await pool.query(
          `UPDATE mm_memberships SET is_active = TRUE, role = $2, cook_bill_amount = $3, updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [existingMem.rows[0].id, role, cookBill]
        );
        memRow = reactivated.rows[0];
      } else {
        const inserted = await pool.query(
          `INSERT INTO mm_memberships (user_id, mess_id, role, is_active, cook_bill_amount)
           VALUES ($1, $2, $3, TRUE, $4)
           RETURNING *`,
          [targetUser.id, messId, role, cookBill]
        );
        memRow = inserted.rows[0];
        await pool.query(
          `INSERT INTO mm_meal_defaults (membership_id, meal_type, half_slot, egg_preference, is_active)
           VALUES ($1, $2, NULL, $3, TRUE)
           ON CONFLICT (membership_id) DO NOTHING`,
          [memRow.id, MealType.FULL, EggPreference.NONE]
        );
      }

      await writeAuditLog({
        messId,
        actorId: user.id,
        action: 'MEMBER_ADDED',
        entity: 'memberships',
        after: { phone: cleanPhone, name: targetUser.name, role },
        reason: `Added ${targetUser.name} to mess`
      });

      return NextResponse.json(
        {
          data: {
            id: memRow.id,
            userId: memRow.user_id,
            messId: memRow.mess_id,
            role: memRow.role,
            isActive: memRow.is_active,
            cookBillAmount: Number(memRow.cook_bill_amount).toFixed(2),
            joinedAt: new Date(memRow.joined_at).toISOString(),
            user: {
              id: targetUser.id,
              name: targetUser.name,
              phone: targetUser.phone,
              avatarUrl: targetUser.avatar_url || null,
              createdAt: new Date(targetUser.created_at).toISOString()
            }
          }
        },
        { status: 201 }
      );
    }

    if (subSegments.length === 2 && method === 'PATCH') {
      await requireMembership(user.id, messId, true);
      const targetMemId = subSegments[1]!;
      const beforeRes = await pool.query(
        `SELECT * FROM mm_memberships WHERE id = $1 AND mess_id = $2`,
        [targetMemId, messId]
      );
      if (!beforeRes.rows[0]) {
        throw new HttpError(404, 'NOT_FOUND', 'Member not found');
      }
      const before = beforeRes.rows[0];

      const updated = await pool.query(
        `UPDATE mm_memberships
         SET role = COALESCE($3, role),
             is_active = COALESCE($4, is_active),
             cook_bill_amount = COALESCE($5, cook_bill_amount),
             updated_at = NOW()
         WHERE id = $1 AND mess_id = $2
         RETURNING *`,
        [
          targetMemId,
          messId,
          body.role !== undefined ? String(body.role) : null,
          body.isActive !== undefined ? Boolean(body.isActive) : null,
          body.cookBillAmount !== undefined ? Number(body.cookBillAmount).toFixed(2) : null
        ]
      );

      await writeAuditLog({
        messId,
        actorId: user.id,
        action: 'MEMBER_UPDATED',
        entity: 'memberships',
        before: {
          role: before.role,
          isActive: before.is_active,
          cookBillAmount: before.cook_bill_amount
        },
        after: {
          role: updated.rows[0].role,
          isActive: updated.rows[0].is_active,
          cookBillAmount: updated.rows[0].cook_bill_amount
        },
        reason: 'Updated member role, status, or cook bill'
      });

      return NextResponse.json({ data: updated.rows[0] });
    }

    if (subSegments.length === 2 && method === 'DELETE') {
      await requireMembership(user.id, messId, true);
      const targetMemId = subSegments[1]!;
      const deleted = await pool.query(
        `DELETE FROM mm_memberships WHERE id = $1 AND mess_id = $2 RETURNING id, user_id`,
        [targetMemId, messId]
      );
      if (!deleted.rows[0]) {
        throw new HttpError(404, 'NOT_FOUND', 'Member not found');
      }

      await writeAuditLog({
        messId,
        actorId: user.id,
        action: 'MEMBER_REMOVED',
        entity: 'memberships',
        before: { membershipId: targetMemId },
        reason: 'Removed member from mess'
      });

      return NextResponse.json({ data: { success: true } });
    }
  }

  // NOTICES
  if (resource === 'notices') {
    if (subSegments.length === 1 && method === 'GET') {
      await requireMembership(user.id, messId, false);
      const res = await pool.query(
        `SELECT n.*, u.name AS author_name
         FROM mm_notices n
         LEFT JOIN mm_users u ON u.id = n.author_id
         WHERE n.mess_id = $1
         ORDER BY n.created_at DESC`,
        [messId]
      );
      const list: NoticeDto[] = res.rows.map((r) => ({
        id: r.id,
        messId: r.mess_id,
        authorId: r.author_id || '',
        title: r.title,
        body: r.body,
        authorName: r.author_name || undefined,
        createdAt: new Date(r.created_at).toISOString()
      }));
      return NextResponse.json({ data: list });
    }

    if (subSegments.length === 1 && method === 'POST') {
      await requireMembership(user.id, messId, true);
      const title = String(body.title || '').trim();
      const noticeBody = String(body.body || '').trim();
      if (!title || !noticeBody) {
        throw new HttpError(400, 'VALIDATION_FAILED', 'Notice title and body are required');
      }
      const res = await pool.query(
        `INSERT INTO mm_notices (mess_id, title, body, author_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [messId, title, noticeBody, user.id]
      );
      return NextResponse.json(
        {
          data: {
            id: res.rows[0].id,
            messId,
            title,
            body: noticeBody,
            authorName: user.name,
            createdAt: new Date(res.rows[0].created_at).toISOString()
          }
        },
        { status: 201 }
      );
    }

    if (subSegments.length === 2 && method === 'DELETE') {
      await requireMembership(user.id, messId, true);
      const noticeId = subSegments[1]!;
      await pool.query(`DELETE FROM mm_notices WHERE id = $1 AND mess_id = $2`, [noticeId, messId]);
      return NextResponse.json({ data: { success: true } });
    }
  }

  // AUDIT LOGS
  if (resource === 'audit' && method === 'GET') {
    await requireMembership(user.id, messId, false);
    const res = await pool.query(
      `SELECT a.*, u.name AS actor_name
       FROM mm_audit_logs a
       LEFT JOIN mm_users u ON u.id = a.actor_id
       WHERE a.mess_id = $1
       ORDER BY a.created_at DESC
       LIMIT 100`,
      [messId]
    );
    const list: (AuditLogDto & { actorName?: string })[] = res.rows.map((r) => ({
      id: r.id,
      messId: r.mess_id,
      actorId: r.actor_id,
      actorName: r.actor_name || undefined,
      action: r.action,
      entity: r.entity,
      before: r.before_data || null,
      after: r.after_data || null,
      reason: r.reason || '',
      createdAt: new Date(r.created_at).toISOString()
    }));
    return NextResponse.json({ data: list });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Route not found');
}
