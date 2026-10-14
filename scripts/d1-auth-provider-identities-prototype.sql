-- Imported provider identity mapping only. No provider tokens or raw sessions.
CREATE TABLE IF NOT EXISTS d1_auth_provider_identities (
 id TEXT PRIMARY KEY,
 source_project_id TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES d1_access_users(id),
 provider TEXT NOT NULL CHECK(provider IN ('email','google')),
 provider_id TEXT NOT NULL,
 email TEXT,
 identity_data TEXT NOT NULL CHECK(json_valid(identity_data) AND json_type(identity_data)='object'),
 last_sign_in_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
 UNIQUE(source_project_id,provider,provider_id)
);
CREATE INDEX IF NOT EXISTS d1_auth_provider_identities_user ON d1_auth_provider_identities(user_id);
