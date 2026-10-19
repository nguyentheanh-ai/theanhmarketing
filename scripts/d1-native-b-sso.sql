-- B native sign-in tables (phase2-app native-data/b-native-sso-full.ts).
CREATE TABLE IF NOT EXISTS d1_b_sso_requests(state_hash TEXT PRIMARY KEY CHECK(length(state_hash)=64),verifier_hash TEXT NOT NULL UNIQUE CHECK(length(verifier_hash)=64),rate_key_hash TEXT NOT NULL CHECK(length(rate_key_hash)=64),next_path TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,consumed_at TEXT);
CREATE INDEX IF NOT EXISTS idx_b_sso_request_rate ON d1_b_sso_requests(rate_key_hash,created_at);
CREATE TABLE IF NOT EXISTS d1_b_sso_grants(code_hash TEXT PRIMARY KEY CHECK(length(code_hash)=64),state_hash TEXT NOT NULL UNIQUE REFERENCES d1_b_sso_requests(state_hash),source_user_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES "b_public__profiles"(id),normalized_email TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,consumed_at TEXT);
CREATE TABLE IF NOT EXISTS d1_b_native_sessions(token_hash TEXT PRIMARY KEY CHECK(length(token_hash)=64),user_id TEXT NOT NULL REFERENCES "b_public__profiles"(id),created_at TEXT NOT NULL,expires_at TEXT NOT NULL,revoked_at TEXT);
CREATE INDEX IF NOT EXISTS idx_b_native_session_user ON d1_b_native_sessions(user_id,expires_at);
