-- Native staging read model of the existing public anonymous catalogue.
-- No user records, credentials or private lesson payloads belong here.
CREATE TABLE IF NOT EXISTS d1_student_catalog_snapshots (
 snapshot_id TEXT PRIMARY KEY NOT NULL CHECK(length(snapshot_id)=64),
 source_project_id TEXT NOT NULL CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
 source_document TEXT NOT NULL CHECK(json_valid(source_document)),
 normalized_document TEXT NOT NULL CHECK(json_valid(normalized_document)),
 normalized_digest TEXT NOT NULL CHECK(length(normalized_digest)=64),
 captured_at TEXT NOT NULL,last_verified_at TEXT,
 status TEXT NOT NULL CHECK(status IN ('pending','verified')),
 CHECK(status<>'verified' OR last_verified_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS d1_student_catalog_current (
 source_project_id TEXT PRIMARY KEY NOT NULL CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
 snapshot_id TEXT NOT NULL REFERENCES d1_student_catalog_snapshots(snapshot_id),
 published_at TEXT NOT NULL
);
