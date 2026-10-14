-- STAGING ONLY. Extend original UUID identity rows; no production Auth switch.
-- credential_ciphertext contains AES-GCM-encrypted bcrypt hashes, never a plain password/hash.
CREATE TABLE IF NOT EXISTS d1_auth_accounts (
  user_id TEXT PRIMARY KEY REFERENCES d1_access_users(id),
  credential_ciphertext TEXT,
  email_confirmed_at TEXT,
  banned_until TEXT,
  deleted_at TEXT,
  is_anonymous INTEGER NOT NULL DEFAULT 0 CHECK (is_anonymous IN (0,1)),
  session_version INTEGER NOT NULL DEFAULT 1 CHECK (session_version>0),
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0,1)),
  user_metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(user_metadata) AND json_type(user_metadata)='object'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS d1_auth_sessions (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash)=64),
  user_id TEXT NOT NULL REFERENCES d1_auth_accounts(user_id),
  project_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  session_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS d1_auth_sessions_user_family ON d1_auth_sessions(user_id,family_id);
CREATE INDEX IF NOT EXISTS d1_auth_sessions_expiry ON d1_auth_sessions(expires_at);
