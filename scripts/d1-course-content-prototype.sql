-- Staging candidate read model. Preserve the complete CMS source document;
-- do not replace normalized LMS identity/authorization tables with this cache.
CREATE TABLE IF NOT EXISTS d1_course_content (
  course_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  source_project_id TEXT NOT NULL CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
  source_document TEXT NOT NULL CHECK(json_valid(source_document)),
  source_digest TEXT NOT NULL CHECK(length(source_digest)=64),
  source_snapshot_at TEXT NOT NULL,
  CHECK(json_extract(source_document,'$.id')=course_id),
  CHECK(json_extract(source_document,'$.slug')=slug)
);
CREATE TABLE IF NOT EXISTS d1_course_content_sync (
  source_project_id TEXT PRIMARY KEY CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
  source_snapshot_at TEXT NOT NULL,
  last_verified_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','verified','failed')),
  course_count INTEGER NOT NULL CHECK(course_count>=0)
);
