-- STAGING ONLY. Ownership is a separate reserved table, never a trusted flag
-- in arbitrary imported CRM metadata. Preserve original Auth UUID/course slug.
-- These enrollments cannot independently grant access after legacy revocation.
CREATE TABLE IF NOT EXISTS d1_lms_legacy_enrollment_owners (
  enrollment_id TEXT PRIMARY KEY REFERENCES d1_lms_enrollments(id),
  user_id TEXT NOT NULL REFERENCES d1_access_users(id),
  course_slug TEXT NOT NULL REFERENCES d1_lms_courses(slug),
  UNIQUE (user_id, course_slug)
);
