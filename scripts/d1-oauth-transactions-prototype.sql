-- OAuth transaction secrets are JWE-encrypted; browser/state tokens stored hashed.
CREATE TABLE IF NOT EXISTS d1_oauth_transactions (
 state_hash TEXT PRIMARY KEY CHECK(length(state_hash)=64),
 source_project_id TEXT NOT NULL,provider TEXT NOT NULL CHECK(provider='google'),
 browser_hash TEXT NOT NULL CHECK(length(browser_hash)=64),
 verifier_ciphertext TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','claimed','done','failed')),
 claimed_at TEXT,completed_at TEXT
);
CREATE INDEX IF NOT EXISTS d1_oauth_transactions_expiry ON d1_oauth_transactions(expires_at);
