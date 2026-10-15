-- Candidate only. Auth authority must be explicitly native before provisioning.
CREATE TABLE IF NOT EXISTS d1_native_paid_accounts (
 order_code TEXT PRIMARY KEY REFERENCES d1_native_order_access_applied(order_code),
 order_snapshot TEXT NOT NULL CHECK(json_valid(order_snapshot)),
 user_id TEXT NOT NULL REFERENCES d1_auth_accounts(user_id),
 created_account INTEGER NOT NULL CHECK(created_account IN (0,1)),
 initial_ciphertext TEXT,
 CHECK((created_account=0 AND initial_ciphertext IS NULL) OR (created_account=1 AND initial_ciphertext IS NOT NULL)),
 CHECK(json_extract(order_snapshot,'$.order_code') IS order_code)
);
