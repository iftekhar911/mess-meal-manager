import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial database schema migration for Mess Meal Manager.
 * Creates all enums, tables, foreign keys, and indexes.
 */
export class InitialSchema1731740000000 implements MigrationInterface {
  name = 'InitialSchema1731740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TYPE "membership_role_enum" AS ENUM ('MANAGER', 'BOARDER');
      CREATE TYPE "meal_type_enum" AS ENUM ('FULL', 'HALF');
      CREATE TYPE "slot_type_enum" AS ENUM ('LUNCH', 'DINNER');
      CREATE TYPE "egg_preference_enum" AS ENUM ('NONE', 'INSTEAD_OF_FISH', 'INSTEAD_OF_CHICKEN');
      CREATE TYPE "rule_kind_enum" AS ENUM ('TOGGLE', 'RANGE');
      CREATE TYPE "override_source_enum" AS ENUM ('BOARDER', 'MANAGER_FORCE');
      CREATE TYPE "protein_type_enum" AS ENUM ('FISH', 'CHICKEN', 'OTHER');
      CREATE TYPE "ledger_type_enum" AS ENUM ('DEPOSIT', 'MEAL', 'FUEL', 'COOK_BILL', 'GUEST', 'ADJUSTMENT', 'REFUND');
      CREATE TYPE "roster_source_enum" AS ENUM ('VOTE', 'AUTO', 'SWAP');
      CREATE TYPE "swap_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
      CREATE TYPE "expense_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "avatar_url" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "replaced_by_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "messes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "cutoff_time" time NOT NULL DEFAULT '22:00:00',
        "meal_rate" numeric(12,4) NOT NULL DEFAULT 50.0000,
        "grace_days" int NOT NULL DEFAULT 3,
        "warning_days" int NOT NULL DEFAULT 2,
        "shoppers_per_day" int NOT NULL DEFAULT 2,
        "shop_times_per_month" int NOT NULL DEFAULT 2,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messes" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "memberships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "mess_id" uuid NOT NULL,
        "role" "membership_role_enum" NOT NULL DEFAULT 'BOARDER',
        "is_active" boolean NOT NULL DEFAULT true,
        "cook_bill_amount" numeric(12,4) NOT NULL DEFAULT 250.0000,
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        "left_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_membership_user_mess" UNIQUE ("user_id", "mess_id"),
        CONSTRAINT "PK_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "FK_memberships_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_memberships_mess" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_memberships_mess" ON "memberships" ("mess_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "meal_defaults" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "membership_id" uuid NOT NULL,
        "meal_type" "meal_type_enum" NOT NULL DEFAULT 'FULL',
        "half_slot" "slot_type_enum",
        "egg_preference" "egg_preference_enum" NOT NULL DEFAULT 'NONE',
        "effective_from" date NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meal_defaults" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meal_defaults_membership" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "meal_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "membership_id" uuid NOT NULL,
        "from_date" date NOT NULL,
        "to_date" date,
        "status" boolean NOT NULL,
        "kind" "rule_kind_enum" NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meal_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meal_rules_membership" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "meal_overrides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "membership_id" uuid NOT NULL,
        "date" date NOT NULL,
        "slot" "slot_type_enum" NOT NULL,
        "status" boolean NOT NULL,
        "egg_preference" "egg_preference_enum" NOT NULL DEFAULT 'NONE',
        "guest_count" int NOT NULL DEFAULT 0,
        "source" "override_source_enum" NOT NULL DEFAULT 'BOARDER',
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_meal_override_slot" UNIQUE ("membership_id", "date", "slot"),
        CONSTRAINT "PK_meal_overrides" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meal_overrides_membership" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "meal_finals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "membership_id" uuid NOT NULL,
        "date" date NOT NULL,
        "slot" "slot_type_enum" NOT NULL,
        "status" boolean NOT NULL,
        "egg_preference" "egg_preference_enum" NOT NULL DEFAULT 'NONE',
        "guest_count" int NOT NULL DEFAULT 0,
        "locked_at" timestamptz NOT NULL DEFAULT now(),
        "locked_by" uuid,
        CONSTRAINT "UQ_meal_final_slot" UNIQUE ("membership_id", "date", "slot"),
        CONSTRAINT "PK_meal_finals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meal_finals_membership" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "daily_menus" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mess_id" uuid NOT NULL,
        "date" date NOT NULL,
        "lunch_protein" "protein_type_enum" NOT NULL DEFAULT 'FISH',
        "lunch_note" varchar(255),
        "dinner_protein" "protein_type_enum" NOT NULL DEFAULT 'CHICKEN',
        "dinner_note" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_daily_menu_mess_date" UNIQUE ("mess_id", "date"),
        CONSTRAINT "PK_daily_menus" PRIMARY KEY ("id"),
        CONSTRAINT "FK_daily_menus_mess" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "ledger_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "membership_id" uuid NOT NULL,
        "type" "ledger_type_enum" NOT NULL,
        "amount" numeric(12,4) NOT NULL,
        "date" date NOT NULL,
        "reference_id" uuid,
        "note" text,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ledger_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ledger_entries_membership" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_ledger_entries_membership_date" ON "ledger_entries" ("membership_id", "date");
    `);

    await queryRunner.query(`
      CREATE TABLE "monthly_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mess_id" uuid NOT NULL,
        "month" char(7) NOT NULL,
        "est_fuel_total" numeric(12,4) NOT NULL DEFAULT 0.0000,
        "est_meal_rate" numeric(12,4) NOT NULL DEFAULT 50.0000,
        "voting_deadline" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_monthly_settings_mess_month" UNIQUE ("mess_id", "month"),
        CONSTRAINT "PK_monthly_settings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_monthly_settings_mess" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "shopping_roster" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mess_id" uuid NOT NULL,
        "date" date NOT NULL,
        "membership_id" uuid NOT NULL,
        "source" "roster_source_enum" NOT NULL DEFAULT 'VOTE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_shopping_roster_slot" UNIQUE ("mess_id", "date", "membership_id"),
        CONSTRAINT "PK_shopping_roster" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shopping_roster_mess" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_shopping_roster_membership" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "swap_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roster_id" uuid NOT NULL,
        "from_member_id" uuid NOT NULL,
        "to_member_id" uuid NOT NULL,
        "status" "swap_status_enum" NOT NULL DEFAULT 'PENDING',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_swap_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_swap_requests_roster" FOREIGN KEY ("roster_id") REFERENCES "shopping_roster"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "shopping_expenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mess_id" uuid NOT NULL,
        "date" date NOT NULL,
        "shopper_id" uuid NOT NULL,
        "total" numeric(12,4) NOT NULL,
        "status" "expense_status_enum" NOT NULL DEFAULT 'PENDING',
        "receipt_url" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shopping_expenses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shopping_expenses_mess" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_shopping_expenses_shopper" FOREIGN KEY ("shopper_id") REFERENCES "memberships"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "expense_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "expense_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "quantity" varchar(50),
        "price" numeric(12,4) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expense_items_expense" FOREIGN KEY ("expense_id") REFERENCES "shopping_expenses"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "fuel_expenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mess_id" uuid NOT NULL,
        "date" date NOT NULL,
        "amount" numeric(12,4) NOT NULL,
        "note" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fuel_expenses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fuel_expenses_mess" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "notices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mess_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "body" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notices_mess" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mess_id" uuid NOT NULL,
        "actor_id" uuid NOT NULL,
        "action" varchar(100) NOT NULL,
        "entity" varchar(100) NOT NULL,
        "before" jsonb,
        "after" jsonb,
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_mess" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "month_closes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mess_id" uuid NOT NULL,
        "month" varchar(7) NOT NULL,
        "closed_by_id" uuid NOT NULL,
        "total_meals" numeric(12,4) NOT NULL,
        "total_market_cost" numeric(12,4) NOT NULL,
        "actual_meal_rate" numeric(12,4) NOT NULL,
        "estimated_meal_rate" numeric(12,4) NOT NULL,
        "total_fuel_cost" numeric(12,4) NOT NULL,
        "estimated_fuel_cost" numeric(12,4) NOT NULL,
        "fuel_diff_reconciliation" numeric(12,4) NOT NULL,
        "total_cook_bill" numeric(12,4) NOT NULL,
        "is_locked" boolean NOT NULL DEFAULT true,
        "closed_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_month_closes_mess_month" UNIQUE ("mess_id", "month"),
        CONSTRAINT "PK_month_closes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_month_closes_mess" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "month_closes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fuel_expenses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shopping_expenses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "swap_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shopping_roster"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "monthly_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_menus"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meal_finals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meal_overrides"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meal_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meal_defaults"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "memberships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
