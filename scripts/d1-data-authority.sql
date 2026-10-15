-- Candidate only. Applying this schema never changes the Source writer.
-- No runtime/HTTP activation route; operator must prove Source fence separately.
CREATE TABLE IF NOT EXISTS d1_data_authority (
 source_project_id TEXT NOT NULL,
 component TEXT NOT NULL CHECK(component='auth'),
 epoch TEXT NOT NULL,
 restore_fence TEXT NOT NULL,
 transition_id TEXT NOT NULL,
 last_operation_id TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('fenced','native')),
 source_cutoff_at TEXT NOT NULL,
 manifest_digest TEXT NOT NULL CHECK(length(manifest_digest)=64),
 source_fence_receipt TEXT NOT NULL CHECK(length(source_fence_receipt)=64),
 approval_receipt TEXT NOT NULL CHECK(length(approval_receipt)=64),
 prepared_at TEXT NOT NULL,
 activated_at TEXT,
 frozen_at TEXT,
 PRIMARY KEY(source_project_id,component),
 CHECK(phase<>'native' OR activated_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS d1_data_authority_operations (
 id TEXT PRIMARY KEY,
 source_project_id TEXT NOT NULL,
 component TEXT NOT NULL CHECK(component='auth'),
 request_digest TEXT NOT NULL CHECK(length(request_digest)=64),
 kind TEXT NOT NULL CHECK(kind IN ('prepare','activate','freeze')),
 epoch TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(source_project_id,component,kind,epoch,id)
);
