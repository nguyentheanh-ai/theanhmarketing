-- Candidate only. One ledger row per (settled order, side effect) mirroring the
-- production SePay webhook: accounting email, Meta Purchase, Telegram, Google Sheets.
-- Never stores payloads, tokens or customer data beyond the provider's returned id.
CREATE TABLE IF NOT EXISTS d1_native_paid_side_effects (
 order_code TEXT NOT NULL REFERENCES d1_native_order_fulfillment(order_code),
 step TEXT NOT NULL CHECK(step IN ('accounting_email','meta_purchase','telegram','google_sheet')),
 status TEXT NOT NULL CHECK(status IN ('sending','done','failed')),
 claim_token TEXT NOT NULL,
 claimed_at TEXT NOT NULL,
 attempts INTEGER NOT NULL CHECK(attempts>0),
 external_id TEXT CHECK(external_id IS NULL OR length(external_id)<=128),
 done_at TEXT,
 last_error TEXT CHECK(last_error IS NULL OR length(last_error)<=64),
 PRIMARY KEY(order_code,step),
 CHECK((status='done')=(done_at IS NOT NULL))
);
