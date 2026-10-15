-- Candidate only. Apply locally until Auth lifecycle/legacy/writer gates pass.
CREATE TABLE IF NOT EXISTS d1_auth_refresh_families (
 family_id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES d1_auth_accounts(user_id),
 session_version INTEGER NOT NULL CHECK(session_version>0),
 generation INTEGER NOT NULL CHECK(generation>0),
 current_hash TEXT NOT NULL UNIQUE CHECK(length(current_hash)=64),
 refresh_key_id TEXT NOT NULL,
 access_serial INTEGER NOT NULL CHECK(access_serial>0),
 current_access_hash TEXT NOT NULL UNIQUE CHECK(length(current_access_hash)=64),
 access_key_id TEXT NOT NULL, access_created_at TEXT NOT NULL, access_expires_at TEXT NOT NULL,
 created_at TEXT NOT NULL,last_used_at TEXT NOT NULL,absolute_expires_at TEXT,
 idle_timeout_ms INTEGER CHECK(idle_timeout_ms IS NULL OR idle_timeout_ms>0),
 reuse_interval_ms INTEGER NOT NULL CHECK(reuse_interval_ms BETWEEN 0 AND 60000),
 remember_login INTEGER NOT NULL CHECK(remember_login IN (0,1)),
 bootstrap_access_hash TEXT NOT NULL UNIQUE CHECK(length(bootstrap_access_hash)=64),
 bootstrap_retry_until TEXT NOT NULL,last_operation_id TEXT NOT NULL,revoked_at TEXT,
 policy_digest TEXT NOT NULL CHECK(length(policy_digest)=64)
);
CREATE INDEX IF NOT EXISTS d1_auth_refresh_family_user ON d1_auth_refresh_families(project_id,user_id);
CREATE TABLE IF NOT EXISTS d1_auth_refresh_receipts (
 old_hash TEXT PRIMARY KEY CHECK(length(old_hash)=64),
 project_id TEXT NOT NULL,family_id TEXT NOT NULL REFERENCES d1_auth_refresh_families(family_id),
 old_generation INTEGER NOT NULL CHECK(old_generation>0),rotated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS d1_auth_refresh_receipt_family ON d1_auth_refresh_receipts(family_id);
-- Retain global revocation outcomes; retry must never revoke a later login.
CREATE TABLE IF NOT EXISTS d1_auth_session_security_operations (
 id TEXT PRIMARY KEY,project_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES d1_auth_accounts(user_id),
 source_session_hash TEXT NOT NULL CHECK(length(source_session_hash)=64),
 kind TEXT NOT NULL CHECK(kind='global_logout'),
 expected_version INTEGER NOT NULL CHECK(expected_version>0),
 target_version INTEGER NOT NULL CHECK(target_version=expected_version+1),
 status TEXT NOT NULL CHECK(status IN ('pending','done')),created_at TEXT NOT NULL,
 UNIQUE(project_id,source_session_hash,kind)
);
