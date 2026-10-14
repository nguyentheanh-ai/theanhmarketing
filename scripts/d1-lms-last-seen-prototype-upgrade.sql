-- STAGING ONLY. Inspect PRAGMA table_info before this one-time upgrade.
ALTER TABLE d1_lms_enrollments ADD COLUMN last_seen_at TEXT;
