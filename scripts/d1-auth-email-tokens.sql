-- Candidate only. One-time email tokens for native signup confirmation and
-- password recovery. Only the SHA-256 of the token is stored.
CREATE TABLE IF NOT EXISTS d1_auth_email_tokens (
 token_hash TEXT PRIMARY KEY CHECK(length(token_hash)=64),
 project_id TEXT NOT NULL CHECK(project_id='vsxxgdzwtscuxcmjfckt'),
 user_id TEXT NOT NULL REFERENCES d1_auth_accounts(user_id),
 kind TEXT NOT NULL CHECK(kind IN ('signup','recovery')),
 session_version INTEGER NOT NULL CHECK(session_version>0),
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL CHECK(julianday(expires_at)>julianday(created_at)),
 used_at TEXT
);
CREATE INDEX IF NOT EXISTS d1_auth_email_tokens_user ON d1_auth_email_tokens(user_id,kind,used_at);
