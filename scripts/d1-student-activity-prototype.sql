-- QA-only native activity ledger. Historical Source activity is not imported here.
CREATE TABLE IF NOT EXISTS d1_student_activity_events (
 id TEXT PRIMARY KEY NOT NULL,
 source_project_id TEXT NOT NULL CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
 user_id TEXT NOT NULL REFERENCES d1_auth_accounts(user_id),
 student_email TEXT NOT NULL,
 event_type TEXT NOT NULL CHECK(event_type='student_login_success'),
 event_title TEXT NOT NULL,event_description TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status='success'),
 actor_type TEXT NOT NULL CHECK(actor_type='student'),
 actor_id TEXT NOT NULL,actor_email TEXT NOT NULL,
 metadata TEXT NOT NULL CHECK(json_valid(metadata) AND json_type(metadata)='object'),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS d1_student_activity_dedupe ON d1_student_activity_events(user_id,event_type,created_at);
