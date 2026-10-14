-- QA staging archive of complete original fields, including columns absent
-- from the normalized behavioral slice. Never exposed through a client API.
CREATE TABLE IF NOT EXISTS d1_qa_learning_source (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES d1_access_users(id),
  source_project_id TEXT NOT NULL CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
  source_snapshot_at TEXT NOT NULL,
  source_document TEXT NOT NULL CHECK(json_valid(source_document)),
  source_digest TEXT NOT NULL CHECK(length(source_digest)=64),
  status TEXT NOT NULL CHECK(status IN ('pending','verified'))
);
