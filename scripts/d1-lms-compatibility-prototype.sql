-- STAGING PROTOTYPE ONLY. No customer import into remote D1 or serving /learn.
-- An ephemeral offline parity projection is permitted only inside the encrypted
-- backup volume, without a network server or production writes.
-- Source: Supabase A public.courses/modules/lessons and crm_v2.contacts/enrollments/course_progress,
-- inspected 2026-10-13. This is a behavioral slice, not a full PostgreSQL migration.
-- IDs and timestamps are supplied by the caller; timestamps must be normalized UTC ISO-8601.
CREATE TABLE IF NOT EXISTS d1_lms_courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  lms_status TEXT NOT NULL CHECK (lms_status IN ('draft','published','archived')),
  visibility TEXT NOT NULL CHECK (visibility IN ('public','private','enrolled'))
);

CREATE TABLE IF NOT EXISTS d1_lms_modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES d1_lms_courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft','published','archived')),
  UNIQUE (id, course_id)
);

CREATE TABLE IF NOT EXISTS d1_lms_lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  slug TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft','published','archived')),
  playable INTEGER NOT NULL CHECK (playable IN (0,1)),
  FOREIGN KEY (module_id, course_id) REFERENCES d1_lms_modules(id, course_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS d1_lms_lesson_slug ON d1_lms_lessons(course_id, slug)
  WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS d1_lms_contacts (
  id TEXT PRIMARY KEY,
  normalized_email TEXT,
  source_email TEXT
);

CREATE TABLE IF NOT EXISTS d1_lms_enrollments (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES d1_lms_contacts(id),
  user_id TEXT,
  course_id TEXT REFERENCES d1_lms_courses(id),
  course_slug TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','paused','completed','revoked')),
  expires_at TEXT,
  updated_at TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  last_seen_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS d1_lms_enrollment_user_course
  ON d1_lms_enrollments(user_id, course_slug)
  WHERE user_id IS NOT NULL AND course_slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS d1_lms_enrollment_contact_course
  ON d1_lms_enrollments(contact_id, course_slug)
  WHERE contact_id IS NOT NULL AND course_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS d1_lms_progress (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES d1_lms_enrollments(id),
  lesson_id TEXT NOT NULL REFERENCES d1_lms_lessons(id),
  status TEXT NOT NULL CHECK (status IN ('not_started','in_progress','completed')),
  progress_percent INTEGER NOT NULL CHECK (progress_percent BETWEEN 0 AND 100),
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS d1_lms_enrollments_user ON d1_lms_enrollments(user_id, course_slug, status, expires_at);
CREATE INDEX IF NOT EXISTS d1_lms_progress_enrollment ON d1_lms_progress(enrollment_id);

-- The two foreign keys above do not prove that a lesson belongs to the
-- enrollment's course. Reject cross-course progress until the full legacy
-- enrollment mapping has been designed and checked.
CREATE TRIGGER IF NOT EXISTS d1_lms_progress_course_insert
BEFORE INSERT ON d1_lms_progress
WHEN NOT EXISTS (
  SELECT 1 FROM d1_lms_enrollments e
  JOIN d1_lms_lessons l ON l.id = NEW.lesson_id
  WHERE e.id = NEW.enrollment_id
    AND l.course_id = COALESCE(e.course_id, (
      SELECT c.id FROM d1_lms_courses c WHERE c.slug = e.course_slug
    ))
)
BEGIN
  SELECT RAISE(ABORT, 'lesson_course_mismatch');
END;

CREATE TRIGGER IF NOT EXISTS d1_lms_progress_course_update
BEFORE UPDATE OF enrollment_id, lesson_id ON d1_lms_progress
WHEN NOT EXISTS (
  SELECT 1 FROM d1_lms_enrollments e
  JOIN d1_lms_lessons l ON l.id = NEW.lesson_id
  WHERE e.id = NEW.enrollment_id
    AND l.course_id = COALESCE(e.course_id, (
      SELECT c.id FROM d1_lms_courses c WHERE c.slug = e.course_slug
    ))
)
BEGIN
  SELECT RAISE(ABORT, 'lesson_course_mismatch');
END;
