-- Staging-only SQLite/D1 compatibility prototype. Contains no production data.
-- This schema is not wired to /api/sepay/webhook and must not be deployed as a
-- production payment migration without verified Auth, replay, retry and outbox workers.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS d1_payment_orders (
  order_code TEXT PRIMARY KEY,
  amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'expired', 'paid')),
  sepay_transaction_id TEXT UNIQUE,
  paid_at TEXT,
  CHECK ((status IN ('pending', 'expired') AND paid_at IS NULL AND sepay_transaction_id IS NULL)
      OR (status = 'paid' AND paid_at IS NOT NULL AND sepay_transaction_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS d1_payment_webhook_events (
  transaction_id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL REFERENCES d1_payment_orders(order_code),
  amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
  accepted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS d1_payment_outbox (
  id INTEGER PRIMARY KEY,
  order_code TEXT NOT NULL REFERENCES d1_payment_orders(order_code),
  action TEXT NOT NULL CHECK (action IN ('student_access', 'payment_email', 'accounting_email', 'meta_purchase', 'telegram', 'sheet_sync')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'done', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  UNIQUE (order_code, action)
);
