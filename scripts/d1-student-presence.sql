-- Student presence (heartbeat) for the admin "online now" view. One row per user.
CREATE TABLE IF NOT EXISTS d1_student_presence (
 user_id TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 display_name TEXT,
 path TEXT NOT NULL,
 last_seen_at TEXT NOT NULL,
 first_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS d1_student_presence_seen ON d1_student_presence(last_seen_at);
