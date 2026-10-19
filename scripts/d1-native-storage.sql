-- Native storage index (see lib/cloudflare/native-storage.ts).
CREATE TABLE IF NOT EXISTS d1_storage_buckets(id TEXT PRIMARY KEY,public INTEGER NOT NULL DEFAULT 0,file_size_limit INTEGER,allowed_mime_types TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS d1_storage_objects(bucket_id TEXT NOT NULL REFERENCES d1_storage_buckets(id),name TEXT NOT NULL,r2_key TEXT NOT NULL UNIQUE,size INTEGER NOT NULL,content_type TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(bucket_id,name));
