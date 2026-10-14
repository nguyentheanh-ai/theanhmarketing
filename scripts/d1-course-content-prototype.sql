-- Staging candidate read model. Preserve the complete CMS source document;
-- do not replace normalized LMS identity/authorization tables with this cache.
CREATE TABLE IF NOT EXISTS d1_course_content (
  course_id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  source_project_id TEXT NOT NULL CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
  source_document TEXT NOT NULL CHECK(json_valid(source_document)),
  source_digest TEXT NOT NULL CHECK(length(source_digest)=64),
  source_snapshot_at TEXT NOT NULL,
  CHECK(json_extract(source_document,'$.id') IS course_id),
  CHECK(json_extract(source_document,'$.slug') IS slug)
);
CREATE TABLE IF NOT EXISTS d1_course_content_sync (
  source_project_id TEXT PRIMARY KEY NOT NULL CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
  source_snapshot_at TEXT NOT NULL,
  last_verified_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','verified','failed')),
  course_count INTEGER NOT NULL CHECK(course_count>=0)
);
-- Additive compatibility guards for already-created SQLite primary keys:
-- TEXT PRIMARY KEY alone accepts NULL in a rowid table. Do not rebuild/delete
-- an imported table merely to change its PRAGMA notnull metadata.
CREATE TRIGGER IF NOT EXISTS d1_course_content_identity_insert BEFORE INSERT ON d1_course_content
WHEN NEW.course_id IS NULL BEGIN SELECT RAISE(ABORT,'course_identity_required'); END;
CREATE TRIGGER IF NOT EXISTS d1_course_content_identity_update BEFORE UPDATE OF course_id ON d1_course_content
WHEN NEW.course_id IS NULL BEGIN SELECT RAISE(ABORT,'course_identity_required'); END;
CREATE TRIGGER IF NOT EXISTS d1_course_content_sync_identity_insert BEFORE INSERT ON d1_course_content_sync
WHEN NEW.source_project_id IS NULL BEGIN SELECT RAISE(ABORT,'course_project_required'); END;
CREATE TRIGGER IF NOT EXISTS d1_course_content_sync_identity_update BEFORE UPDATE OF source_project_id ON d1_course_content_sync
WHEN NEW.source_project_id IS NULL BEGIN SELECT RAISE(ABORT,'course_project_required'); END;
