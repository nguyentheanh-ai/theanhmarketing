-- STAGING PROTOTYPE ONLY. Do not import customer rows or bind /learn to this schema.
-- This preserves the input fields used by existing getCourseAccessSlugs logic,
-- not a replacement for Auth, Supabase RLS, LMS RPCs, or payment processing.
-- All IDs remain original text UUIDs. The importer must normalize emails and
-- convert timestamptz values to UTC ISO-8601 before writing.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS d1_access_users (
  id TEXT PRIMARY KEY,
  normalized_email TEXT NOT NULL CHECK (
    normalized_email <> '' AND normalized_email = lower(trim(normalized_email))
  ),
  admin_role TEXT,
  UNIQUE (normalized_email)
);

-- Orders can predate account creation, so email is intentionally not an FK.
-- Preserve order_items JSON and fallback course_slug/course_title/payment_plan:
-- the current application uses all four to decide paid and deposit access.
CREATE TABLE IF NOT EXISTS d1_access_orders (
  id TEXT PRIMARY KEY,
  normalized_email TEXT NOT NULL CHECK (
    normalized_email <> '' AND normalized_email = lower(trim(normalized_email))
  ),
  status TEXT NOT NULL,
  course_slug TEXT,
  course_title TEXT,
  payment_plan TEXT,
  order_items_json TEXT CHECK (
    order_items_json IS NULL OR
    (json_valid(order_items_json) AND json_type(order_items_json) = 'array')
  ),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS d1_access_orders_email_status
  ON d1_access_orders(normalized_email, status);

-- Do not collapse to one row per email/slug. The current helper orders grants
-- and revokes by created_at and source row order, and historical rows matter.
CREATE TABLE IF NOT EXISTS d1_access_overrides (
  id TEXT PRIMARY KEY,
  normalized_email TEXT NOT NULL CHECK (
    normalized_email <> '' AND normalized_email = lower(trim(normalized_email))
  ),
  source TEXT NOT NULL,
  created_at TEXT,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS d1_access_overrides_email_created
  ON d1_access_overrides(normalized_email, created_at, id);

-- Source snapshot/stream watermark is a gate, not authorization. Green must
-- never serve from an unverified projection or accept independent writes.
CREATE TABLE IF NOT EXISTS d1_access_sync_state (
  source_project_id TEXT PRIMARY KEY,
  source_snapshot_at TEXT NOT NULL,
  last_verified_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('importing', 'verified', 'stale'))
);
