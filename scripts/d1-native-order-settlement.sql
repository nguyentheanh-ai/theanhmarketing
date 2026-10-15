-- Candidate only. Not wired to a webhook or a production writer.
-- Preserve the complete source order JSON, including fields not used by this core.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS d1_native_orders (
 id TEXT NOT NULL UNIQUE,
 order_code TEXT PRIMARY KEY,
 amount_vnd INTEGER NOT NULL CHECK(typeof(amount_vnd)='integer' AND amount_vnd>0 AND amount_vnd<=9007199254740991),
 status TEXT NOT NULL CHECK(status IN ('pending','expired','failed','paid')),
 row_json TEXT NOT NULL CHECK(json_valid(row_json) AND json_type(row_json)='object'),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(typeof(revision)='integer' AND revision>=0),
 CHECK(json_extract(row_json,'$.id') IS id),
 CHECK(json_extract(row_json,'$.order_code') IS order_code),
 CHECK(json_extract(row_json,'$.status') IS status)
);
CREATE INDEX IF NOT EXISTS d1_native_orders_transaction ON d1_native_orders(json_extract(row_json,'$.sepay_transaction_id'));
CREATE INDEX IF NOT EXISTS d1_native_orders_reference ON d1_native_orders(json_extract(row_json,'$.sepay_reference_code'));
CREATE TABLE IF NOT EXISTS d1_native_order_authority (
 source_project_id TEXT PRIMARY KEY CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
 snapshot_at TEXT NOT NULL,verified_at TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('verified','pending','failed'))
);
CREATE TABLE IF NOT EXISTS d1_native_sepay_receipts (
 event_key TEXT PRIMARY KEY,
 transaction_id TEXT UNIQUE,
 reference_code TEXT UNIQUE,
 order_code TEXT NOT NULL REFERENCES d1_native_orders(order_code),
 amount_vnd INTEGER NOT NULL CHECK(typeof(amount_vnd)='integer' AND amount_vnd>0 AND amount_vnd<=9007199254740991),
 receiver_account TEXT NOT NULL,
 accepted_at TEXT NOT NULL,
 CHECK(transaction_id IS NOT NULL OR reference_code IS NOT NULL)
);
-- One durable order transition intent, not six unconditional delivery actions.
-- A future dispatcher must use the existing product-specific fulfillment rules.
CREATE TABLE IF NOT EXISTS d1_native_order_fulfillment (
 order_code TEXT PRIMARY KEY REFERENCES d1_native_orders(order_code),
 receipt_key TEXT NOT NULL UNIQUE REFERENCES d1_native_sepay_receipts(event_key),
 order_revision INTEGER NOT NULL CHECK(order_revision>0),
 order_snapshot TEXT NOT NULL CHECK(json_valid(order_snapshot) AND json_type(order_snapshot)='object'),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','claimed','done','failed')),
 created_at TEXT NOT NULL,
 CHECK(json_extract(order_snapshot,'$.order_code') IS order_code),
 CHECK(json_extract(order_snapshot,'$.status') IS 'paid')
);
