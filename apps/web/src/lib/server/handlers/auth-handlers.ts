import { NextRequest, NextResponse } from 'next/server';
import { AuthResponseDto } from '@mess/shared';
import { getPool } from '../db';
import {
  HttpError,
  clearSessionCookie,
  getAuthUser,
  hashPassword,
  normalizePhone,
  setSessionCookie,
  signToken,
  verifyPassword
} from '../auth';

/**
 * Handles /api/auth/* routes backed by Neon PostgreSQL.
 */
export async function handleAuthRoute(
  req: NextRequest,
  subPath: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const pool = getPool();
  const method = req.method.toUpperCase();

  if (subPath === 'register' && method === 'POST') {
    const name = String(body.name || '').trim();
    const cleanPhone = normalizePhone(String(body.phone || ''));
    const password = String(body.password || '');

    if (name.length < 2) {
      throw new HttpError(400, 'INVALID_NAME', 'Name must be at least 2 characters');
    }
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      throw new HttpError(400, 'INVALID_PHONE', 'Please enter a valid 11-digit BD phone number');
    }
    if (password.length < 8) {
      throw new HttpError(400, 'INVALID_PASSWORD', 'Password must be at least 8 characters');
    }

    const existing = await pool.query(`SELECT id, password_hash FROM mm_users WHERE phone = $1`, [
      cleanPhone
    ]);

    let userRow: Record<string, unknown>;
    if (existing.rows[0]) {
      // If a manager pre-created a placeholder boarder account, allow claiming it when password_hash is '__INVITED__'
      if (existing.rows[0].password_hash === '__INVITED__') {
        const updated = await pool.query(
          `UPDATE mm_users SET name = $1, password_hash = $2, updated_at = NOW()
           WHERE id = $3 RETURNING id, name, phone, avatar_url, created_at`,
          [name, hashPassword(password), existing.rows[0].id]
        );
        userRow = updated.rows[0];
      } else {
        throw new HttpError(
          409,
          'PHONE_ALREADY_EXISTS',
          'An account with this phone number already exists. Please sign in.'
        );
      }
    } else {
      const inserted = await pool.query(
        `INSERT INTO mm_users (name, phone, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, phone, avatar_url, created_at`,
        [name, cleanPhone, hashPassword(password)]
      );
      userRow = inserted.rows[0];
    }

    const memRes = await pool.query(
      `SELECT mess_id FROM mm_memberships WHERE user_id = $1 AND is_active = TRUE ORDER BY joined_at ASC LIMIT 1`,
      [userRow.id]
    );

    const token = signToken(String(userRow.id), String(userRow.phone));
    const payload: AuthResponseDto = {
      user: {
        id: String(userRow.id),
        name: String(userRow.name),
        phone: String(userRow.phone),
        avatarUrl: userRow.avatar_url ? String(userRow.avatar_url) : null,
        createdAt: new Date(String(userRow.created_at)).toISOString()
      },
      accessToken: token,
      activeMessId: memRes.rows[0]?.mess_id ? String(memRes.rows[0].mess_id) : undefined
    };

    const res = NextResponse.json({ data: payload }, { status: 201 });
    setSessionCookie(res, token);
    return res;
  }

  if (subPath === 'login' && method === 'POST') {
    const cleanPhone = normalizePhone(String(body.phone || ''));
    const password = String(body.password || '');

    if (!cleanPhone || !password) {
      throw new HttpError(400, 'INVALID_CREDENTIALS', 'Phone number and password are required');
    }

    const resUser = await pool.query(
      `SELECT id, name, phone, password_hash, avatar_url, created_at FROM mm_users WHERE phone = $1`,
      [cleanPhone]
    );
    const row = resUser.rows[0];
    if (
      !row ||
      row.password_hash === '__INVITED__' ||
      !verifyPassword(password, row.password_hash)
    ) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid phone number or password');
    }

    const memRes = await pool.query(
      `SELECT mess_id FROM mm_memberships WHERE user_id = $1 AND is_active = TRUE ORDER BY joined_at ASC LIMIT 1`,
      [row.id]
    );

    const token = signToken(String(row.id), String(row.phone));
    const payload: AuthResponseDto = {
      user: {
        id: String(row.id),
        name: String(row.name),
        phone: String(row.phone),
        avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
        createdAt: new Date(String(row.created_at)).toISOString()
      },
      accessToken: token,
      activeMessId: memRes.rows[0]?.mess_id ? String(memRes.rows[0].mess_id) : undefined
    };

    const res = NextResponse.json({ data: payload }, { status: 200 });
    setSessionCookie(res, token);
    return res;
  }

  if (subPath === 'refresh' && method === 'POST') {
    const user = await getAuthUser(req);
    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'No active session');
    }

    const memRes = await pool.query(
      `SELECT mess_id FROM mm_memberships WHERE user_id = $1 AND is_active = TRUE ORDER BY joined_at ASC LIMIT 1`,
      [user.id]
    );

    const token = signToken(user.id, user.phone);
    const payload: AuthResponseDto = {
      user,
      accessToken: token,
      activeMessId: memRes.rows[0]?.mess_id ? String(memRes.rows[0].mess_id) : undefined
    };

    const res = NextResponse.json({ data: payload }, { status: 200 });
    setSessionCookie(res, token);
    return res;
  }

  if (subPath === 'logout' && method === 'POST') {
    const res = NextResponse.json({ data: { success: true } }, { status: 200 });
    clearSessionCookie(res);
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Auth route not found');
}
