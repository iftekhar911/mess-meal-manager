import { Pool } from 'pg';

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
  schemaInitialized?: boolean;
};

/**
 * Returns a shared PostgreSQL connection pool configured for Neon serverless.
 */
export function getPool(): Pool {
  if (!globalForPg.pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not configured');
    }
    globalForPg.pgPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false }
    });
  }
  return globalForPg.pgPool;
}

/**
 * Ensures all required tables exist in PostgreSQL (idempotent, runs once per cold start).
 */
export async function ensureSchema(): Promise<void> {
  if (globalForPg.schemaInitialized) return;
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mm_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mm_messes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      cutoff_time TEXT NOT NULL DEFAULT '16:00:00',
      meal_rate NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
      grace_days INT NOT NULL DEFAULT 3,
      warning_days INT NOT NULL DEFAULT 2,
      shoppers_per_day INT NOT NULL DEFAULT 2,
      shop_times_per_month INT NOT NULL DEFAULT 2,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mm_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES mm_users(id) ON DELETE CASCADE,
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'BOARDER',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      cook_bill_amount NUMERIC(10, 2) NOT NULL DEFAULT 250.00,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, mess_id)
    );

    CREATE TABLE IF NOT EXISTS mm_meal_defaults (
      membership_id UUID PRIMARY KEY REFERENCES mm_memberships(id) ON DELETE CASCADE,
      meal_type TEXT NOT NULL DEFAULT 'FULL',
      half_slot TEXT,
      egg_preference TEXT NOT NULL DEFAULT 'NONE',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      toggle_from_date TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mm_meal_overrides (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      membership_id UUID NOT NULL REFERENCES mm_memberships(id) ON DELETE CASCADE,
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      slot TEXT NOT NULL,
      status BOOLEAN NOT NULL,
      egg_preference TEXT NOT NULL DEFAULT 'NONE',
      guest_count INT NOT NULL DEFAULT 0,
      is_manager_override BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (membership_id, date, slot)
    );

    CREATE TABLE IF NOT EXISTS mm_daily_menus (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      shopper_id UUID REFERENCES mm_memberships(id) ON DELETE SET NULL,
      protein TEXT NOT NULL DEFAULT 'OTHER',
      note TEXT,
      lunch_protein TEXT NOT NULL DEFAULT 'OTHER',
      lunch_note TEXT,
      dinner_protein TEXT NOT NULL DEFAULT 'OTHER',
      dinner_note TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (mess_id, date)
    );

    ALTER TABLE mm_daily_menus ADD COLUMN IF NOT EXISTS lunch_protein TEXT NOT NULL DEFAULT 'OTHER';
    ALTER TABLE mm_daily_menus ADD COLUMN IF NOT EXISTS lunch_note TEXT;
    ALTER TABLE mm_daily_menus ADD COLUMN IF NOT EXISTS dinner_protein TEXT NOT NULL DEFAULT 'OTHER';
    ALTER TABLE mm_daily_menus ADD COLUMN IF NOT EXISTS dinner_note TEXT;

    CREATE TABLE IF NOT EXISTS mm_shopping_roster (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      membership_id UUID NOT NULL REFERENCES mm_memberships(id) ON DELETE CASCADE,
      source TEXT NOT NULL DEFAULT 'VOTE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (mess_id, date, membership_id)
    );

    CREATE TABLE IF NOT EXISTS mm_shopping_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      shopper_id UUID NOT NULL REFERENCES mm_memberships(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'PENDING',
      receipt_url TEXT,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mm_ledger_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      membership_id UUID NOT NULL REFERENCES mm_memberships(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      date TEXT NOT NULL,
      reference_id TEXT,
      note TEXT,
      created_by UUID REFERENCES mm_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mm_notices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      author_id UUID REFERENCES mm_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mm_closed_months (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      actual_meal_rate NUMERIC(10, 2) NOT NULL,
      actual_fuel_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      closed_by UUID REFERENCES mm_users(id) ON DELETE SET NULL,
      closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (mess_id, month)
    );

    CREATE TABLE IF NOT EXISTS mm_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      actor_id UUID REFERENCES mm_users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      before_data JSONB,
      after_data JSONB,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE mm_messes ADD COLUMN IF NOT EXISTS default_cook_bill NUMERIC(10, 2) NOT NULL DEFAULT 250.00;
    ALTER TABLE mm_messes ADD COLUMN IF NOT EXISTS default_fuel_bill NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

    CREATE TABLE IF NOT EXISTS mm_join_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES mm_users(id) ON DELETE CASCADE,
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'PENDING',
      note TEXT,
      reviewed_by UUID REFERENCES mm_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, mess_id)
    );

    CREATE TABLE IF NOT EXISTS mm_rate_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      effective_from TEXT NOT NULL,
      meal_rate NUMERIC(10, 2) NOT NULL,
      cook_bill NUMERIC(10, 2) NOT NULL DEFAULT 250.00,
      fuel_bill NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      created_by UUID REFERENCES mm_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (mess_id, effective_from)
    );

    CREATE TABLE IF NOT EXISTS mm_fard_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mess_id UUID NOT NULL REFERENCES mm_messes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT NOT NULL DEFAULT '',
      estimated_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      is_checked BOOLEAN NOT NULL DEFAULT FALSE,
      created_by UUID REFERENCES mm_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_mm_memberships_mess ON mm_memberships(mess_id);
    CREATE INDEX IF NOT EXISTS idx_mm_memberships_user ON mm_memberships(user_id);
    CREATE INDEX IF NOT EXISTS idx_mm_overrides_mess_date ON mm_meal_overrides(mess_id, date);
    CREATE INDEX IF NOT EXISTS idx_mm_ledger_member ON mm_ledger_entries(membership_id);
    CREATE INDEX IF NOT EXISTS idx_mm_roster_mess_date ON mm_shopping_roster(mess_id, date);
    CREATE INDEX IF NOT EXISTS idx_mm_expenses_mess_date ON mm_shopping_expenses(mess_id, date);
    CREATE INDEX IF NOT EXISTS idx_mm_join_req_mess ON mm_join_requests(mess_id, status);
    CREATE INDEX IF NOT EXISTS idx_mm_rate_hist_mess ON mm_rate_history(mess_id, effective_from);
    CREATE INDEX IF NOT EXISTS idx_mm_fard_mess_date ON mm_fard_items(mess_id, date);
  `);

  globalForPg.schemaInitialized = true;
}
