import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { MembershipRole, UserDto } from '@mess/shared';
import { getPool } from './db';

export const SESSION_COOKIE_NAME = 'mm_session';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Normalizes Bangladeshi phone numbers by converting Bangla digits to ASCII and removing separators.
 */
export function normalizePhone(input: string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let result = input.trim();
  bengaliDigits.forEach((bn, idx) => {
    result = result.split(bn).join(String(idx));
  });
  return result.replace(/[\s-]/g, '');
}

/**
 * Hashes a password with a random 16-byte salt using Node scrypt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Verifies a plaintext password against a stored salt:hash string in constant time.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'dev_mess_manager_fallback_secret_change_in_prod';
}

interface TokenPayload {
  sub: string;
  phone: string;
  exp: number;
}

/**
 * Signs a compact HMAC-SHA256 JWT token.
 */
export function signToken(userId: string, phone: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload: TokenPayload = {
    sub: userId,
    phone,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

/**
 * Verifies an HMAC-SHA256 JWT token and returns its payload or null.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    if (!header || !body || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${header}.${body}`)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and authenticates the current user from Bearer header or httpOnly session cookie.
 */
export async function getAuthUser(req: NextRequest): Promise<UserDto | null> {
  const authHeader = req.headers.get('authorization');
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token) {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  }
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const pool = getPool();
  const res = await pool.query(
    `SELECT id, name, phone, avatar_url, created_at FROM mm_users WHERE id = $1`,
    [payload.sub]
  );
  const row = res.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    avatarUrl: row.avatar_url || null,
    createdAt: new Date(row.created_at).toISOString()
  };
}

/**
 * Requires an authenticated user or throws 401.
 */
export async function requireAuth(req: NextRequest): Promise<UserDto> {
  const user = await getAuthUser(req);
  if (!user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Please sign in to continue');
  }
  return user;
}

export interface VerifiedMembership {
  id: string;
  userId: string;
  messId: string;
  role: MembershipRole;
  isActive: boolean;
  cookBillAmount: string;
}

/**
 * Verifies the user belongs to the target mess and optionally enforces MANAGER role.
 */
export async function requireMembership(
  userId: string,
  messId: string,
  requireManager = false
): Promise<VerifiedMembership> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT id, user_id, mess_id, role, is_active, cook_bill_amount
     FROM mm_memberships
     WHERE user_id = $1 AND mess_id = $2`,
    [userId, messId]
  );
  const row = res.rows[0];
  if (!row || !row.is_active) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not belong to this mess');
  }
  const role = row.role as MembershipRole;
  if (requireManager && role !== MembershipRole.MANAGER) {
    throw new HttpError(403, 'FORBIDDEN', 'Only mess managers can perform this action');
  }
  return {
    id: row.id,
    userId: row.user_id,
    messId: row.mess_id,
    role,
    isActive: row.is_active,
    cookBillAmount: Number(row.cook_bill_amount).toFixed(2)
  };
}

/**
 * Sets the httpOnly session cookie on a response.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS
  });
}

/**
 * Clears the httpOnly session cookie on a response.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}
