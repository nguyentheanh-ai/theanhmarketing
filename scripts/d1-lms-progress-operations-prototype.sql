-- STAGING ONLY. No customer import or production writer is enabled.
-- Records pin the enrollment chosen for one idempotent write transaction.
CREATE TABLE IF NOT EXISTS d1_lms_progress_operations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  course_slug TEXT NOT NULL,
  enrollment_id TEXT NOT NULL REFERENCES d1_lms_enrollments(id),
  lesson_id TEXT NOT NULL REFERENCES d1_lms_lessons(id),
  completed INTEGER NOT NULL CHECK (completed IN (0,1)),
  lesson_title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','applied')),
  created_at TEXT NOT NULL,
  response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),
  CHECK ((status='pending' AND response_json IS NULL) OR (status='applied' AND response_json IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS d1_lms_progress_operations_user_created
  ON d1_lms_progress_operations(user_id, created_at);
