-- Candidate only. One delivery ledger row per provisioned paid order.
-- Never stores the email body or any password; Resend idempotency key is stable per order.
CREATE TABLE IF NOT EXISTS d1_native_paid_emails (
 order_code TEXT PRIMARY KEY REFERENCES d1_native_paid_accounts(order_code),
 status TEXT NOT NULL CHECK(status IN ('sending','sent','failed')),
 claim_token TEXT NOT NULL,
 claimed_at TEXT NOT NULL,
 attempts INTEGER NOT NULL CHECK(attempts>0),
 resend_email_id TEXT,
 sent_at TEXT,
 last_error TEXT CHECK(last_error IS NULL OR length(last_error)<=64),
 CHECK((status='sent')=(sent_at IS NOT NULL))
);
