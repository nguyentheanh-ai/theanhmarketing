-- STAGING ONLY: existing empty prototype from 13/10. Run once after inspecting
-- PRAGMA table_info(d1_lms_contacts). Do not derive this field from normalized_email.
-- A future importer must preserve crm_v2.contacts.email exactly for RPC parity.
ALTER TABLE d1_lms_contacts ADD COLUMN source_email TEXT;
