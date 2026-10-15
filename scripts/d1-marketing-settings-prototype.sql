-- STAGING ONLY. A public.site_settings has primary key key.
-- Pending candidates never replace the published snapshot before verification.
CREATE TABLE IF NOT EXISTS d1_marketing_snapshots (
 snapshot_id TEXT PRIMARY KEY NOT NULL CHECK(length(snapshot_id)=64),
 source_project_id TEXT NOT NULL CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
 setting_key TEXT NOT NULL CHECK(setting_key IN ('marketing','brand')),
 source_document TEXT NOT NULL CHECK(json_valid(source_document)),
 source_digest TEXT NOT NULL CHECK(length(source_digest)=64),
 normalized_document TEXT NOT NULL CHECK(json_valid(normalized_document)),
 normalized_digest TEXT NOT NULL CHECK(length(normalized_digest)=64),
 source_exists INTEGER NOT NULL CHECK(source_exists IN (0,1)),
 source_updated_at TEXT,source_snapshot_at TEXT NOT NULL,last_verified_at TEXT,
 status TEXT NOT NULL CHECK(status IN ('pending','verified','failed')),
 UNIQUE(snapshot_id,source_project_id,setting_key),
 CHECK(status<>'verified' OR last_verified_at IS NOT NULL),
 CHECK(source_exists=0 AND source_updated_at IS NULL AND source_document='null' OR source_exists=1 AND source_updated_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS d1_marketing_settings (
 source_project_id TEXT NOT NULL CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
 setting_key TEXT NOT NULL CHECK(setting_key IN ('marketing','brand')),
 snapshot_id TEXT NOT NULL,published_at TEXT NOT NULL,
 PRIMARY KEY(source_project_id,setting_key),
 FOREIGN KEY(snapshot_id,source_project_id,setting_key)
  REFERENCES d1_marketing_snapshots(snapshot_id,source_project_id,setting_key)
);
