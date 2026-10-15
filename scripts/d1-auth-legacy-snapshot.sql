-- OFFLINE candidate. Pending restored snapshots cannot authorize a login.
-- No raw refresh token/key, IP, user agent, password hash or provider token.
CREATE TABLE IF NOT EXISTS d1_auth_legacy_snapshots (
 snapshot_id TEXT PRIMARY KEY,project_id TEXT NOT NULL,
 source_kind TEXT NOT NULL CHECK(source_kind IN ('restored-backup','fenced-final')),
 source_evidence_digest TEXT NOT NULL CHECK(length(source_evidence_digest)=64),
 observed_at TEXT NOT NULL,proof_key_id TEXT NOT NULL,
 graph_digest TEXT NOT NULL CHECK(length(graph_digest)=64),
 status TEXT NOT NULL CHECK(status IN ('pending','verified')),
 source_cutoff_at TEXT,authority_context_hash TEXT,
 session_count INTEGER NOT NULL CHECK(session_count>=0),proof_count INTEGER NOT NULL CHECK(proof_count>=0),
 CHECK((source_kind='restored-backup' AND status='pending' AND source_cutoff_at IS NULL AND authority_context_hash IS NULL)
  OR (source_kind='fenced-final' AND status='verified' AND source_cutoff_at IS NOT NULL AND authority_context_hash IS NOT NULL AND length(authority_context_hash)=64)),
 UNIQUE(snapshot_id,project_id)
);
CREATE TABLE IF NOT EXISTS d1_auth_legacy_sessions (
 snapshot_id TEXT NOT NULL,project_id TEXT NOT NULL,source_session_id TEXT NOT NULL,user_id TEXT NOT NULL,
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL,refreshed_at TEXT,aal TEXT NOT NULL CHECK(aal='aal1'),
 created_revision TEXT NOT NULL CHECK(length(created_revision)=20),updated_revision TEXT NOT NULL CHECK(length(updated_revision)=20),
 refreshed_revision TEXT CHECK(refreshed_revision IS NULL OR length(refreshed_revision)=20),
 amr_json TEXT NOT NULL CHECK(json_valid(amr_json) AND json_type(amr_json)='array'),
 current_proof_hash TEXT CHECK(current_proof_hash IS NULL OR length(current_proof_hash)=64),
 native_session_version INTEGER CHECK(native_session_version IS NULL OR native_session_version>0),
 account_source_digest TEXT CHECK(account_source_digest IS NULL OR length(account_source_digest)=64),
 PRIMARY KEY(snapshot_id,source_session_id),UNIQUE(snapshot_id,project_id,source_session_id,user_id),
 FOREIGN KEY(snapshot_id,project_id) REFERENCES d1_auth_legacy_snapshots(snapshot_id,project_id)
);
CREATE TABLE IF NOT EXISTS d1_auth_legacy_proofs (
 snapshot_id TEXT NOT NULL,project_id TEXT NOT NULL,source_token_id TEXT NOT NULL,proof_hash TEXT NOT NULL CHECK(length(proof_hash)=64),
 source_session_id TEXT NOT NULL,user_id TEXT NOT NULL,revoked INTEGER NOT NULL CHECK(revoked IN (0,1)),
 parent_hash TEXT CHECK(parent_hash IS NULL OR length(parent_hash)=64),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
 created_revision TEXT NOT NULL CHECK(length(created_revision)=20),updated_revision TEXT NOT NULL CHECK(length(updated_revision)=20),
 role TEXT NOT NULL CHECK(role IN ('current','direct_parent','revoked')),
 PRIMARY KEY(snapshot_id,proof_hash),UNIQUE(snapshot_id,source_token_id),
 FOREIGN KEY(snapshot_id,project_id,source_session_id,user_id) REFERENCES d1_auth_legacy_sessions(snapshot_id,project_id,source_session_id,user_id)
);
CREATE INDEX IF NOT EXISTS d1_auth_legacy_proof_family ON d1_auth_legacy_proofs(snapshot_id,source_session_id);
-- Retain redemption/tombstone history through logout, expiry and retries.
-- There is no runtime/operator endpoint that creates a final certification.
CREATE TABLE IF NOT EXISTS d1_auth_legacy_adoptions (
 project_id TEXT NOT NULL,authority_context_hash TEXT NOT NULL CHECK(length(authority_context_hash)=64),
 snapshot_id TEXT NOT NULL,source_session_id TEXT NOT NULL,user_id TEXT NOT NULL,
 native_session_version INTEGER NOT NULL CHECK(native_session_version>0),
 bootstrap_hash TEXT NOT NULL CHECK(length(bootstrap_hash)=64),created_at TEXT NOT NULL,retry_until TEXT NOT NULL,
 operation_id TEXT NOT NULL,revoked_at TEXT,
 PRIMARY KEY(project_id,authority_context_hash,source_session_id),
 FOREIGN KEY(snapshot_id,project_id,source_session_id,user_id) REFERENCES d1_auth_legacy_sessions(snapshot_id,project_id,source_session_id,user_id)
);
