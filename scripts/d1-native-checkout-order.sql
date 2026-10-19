-- Candidate only (not mounted). Native checkout write tables for App A.
-- Requires d1-native-order-settlement.sql (d1_native_orders).

-- public.leads equivalent: full source-shaped row kept as JSON, like orders.
CREATE TABLE IF NOT EXISTS d1_native_leads (
 id TEXT PRIMARY KEY,
 row_json TEXT NOT NULL CHECK(json_valid(row_json) AND json_type(row_json)='object'),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(typeof(revision)='integer' AND revision>=0),
 CHECK(json_extract(row_json,'$.id') IS id)
);

-- One checkout attempt = one order. Same key + same request returns the same
-- order; same key + different request is refused.
CREATE TABLE IF NOT EXISTS d1_native_checkout_requests (
 idempotency_key TEXT PRIMARY KEY CHECK(length(idempotency_key) BETWEEN 16 AND 128),
 request_digest TEXT NOT NULL CHECK(length(request_digest)=64),
 order_code TEXT NOT NULL UNIQUE REFERENCES d1_native_orders(order_code),
 lead_id TEXT REFERENCES d1_native_leads(id),
 created_at TEXT NOT NULL
);

-- public.payment_remarketing_runs equivalent (UNIQUE(order_id, sequence_index)).
CREATE TABLE IF NOT EXISTS d1_native_payment_remarketing_runs (
 id TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
 order_id TEXT NOT NULL REFERENCES d1_native_orders(id),
 sequence_index INTEGER NOT NULL CHECK(sequence_index>0),
 product_key TEXT NOT NULL,
 due_at TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('queued','retry','sending','sent','cancelled','failed')),
 lease_token TEXT,
 lease_expires_at TEXT,
 next_attempt_at TEXT,
 last_error TEXT,
 attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count>=0),
 resend_email_id TEXT,
 sent_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(order_id, sequence_index)
);

-- seed_payment_remarketing_runs_on_order: pending order with an email gets one
-- reminder at the next 08:30 Asia/Ho_Chi_Minh (UTC+7, no DST) after created_at.
CREATE TRIGGER IF NOT EXISTS d1_native_orders_seed_reminder
AFTER INSERT ON d1_native_orders
WHEN NEW.status='pending' AND trim(coalesce(json_extract(NEW.row_json,'$.email'),''))<>''
BEGIN
 INSERT INTO d1_native_payment_remarketing_runs(order_id,sequence_index,product_key,due_at,status)
 VALUES(NEW.id,1,'pending_order',
  strftime('%Y-%m-%dT%H:%M:%fZ',
   date(datetime(json_extract(NEW.row_json,'$.created_at'),'+7 hours'),
        CASE WHEN time(datetime(json_extract(NEW.row_json,'$.created_at'),'+7 hours'))<'08:30:00' THEN '+0 days' ELSE '+1 days' END)
   || ' 08:30:00','-7 hours'),
  'queued')
 ON CONFLICT(order_id,sequence_index) DO NOTHING;
END;

-- cancel_payment_remarketing_runs_on_order_status: once the order is no longer
-- unpaid (status leaves pending/expired, or payment_status becomes paid).
CREATE TRIGGER IF NOT EXISTS d1_native_orders_cancel_reminders
AFTER UPDATE OF status, row_json ON d1_native_orders
WHEN (OLD.status IS NOT NEW.status OR json_extract(OLD.row_json,'$.payment_status') IS NOT json_extract(NEW.row_json,'$.payment_status'))
 AND (NEW.status NOT IN ('pending','expired') OR json_extract(NEW.row_json,'$.payment_status')='paid')
BEGIN
 UPDATE d1_native_payment_remarketing_runs
 SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,next_attempt_at=NULL,
     last_error='Order is no longer unpaid',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE order_id=NEW.id AND status IN ('queued','retry','sending');
END;
