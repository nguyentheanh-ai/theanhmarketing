-- Offline/staging candidate only. Import in the same verified source snapshot
-- transaction as Auth. Do not derive protected roles from user_metadata or
-- d1_access_users.admin_role (the latter also contains configured owner fallback).
CREATE TABLE IF NOT EXISTS d1_admin_source_roles (
 user_id TEXT PRIMARY KEY REFERENCES d1_auth_accounts(user_id),
 source_project_id TEXT NOT NULL CHECK(source_project_id='vsxxgdzwtscuxcmjfckt'),
 source_revision TEXT NOT NULL CHECK(length(source_revision)=20),
 protected_role TEXT CHECK(protected_role IS NULL OR protected_role IN ('owner','editor'))
);
