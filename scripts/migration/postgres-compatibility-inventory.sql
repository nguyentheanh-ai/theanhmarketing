-- Read-only, lightweight inventory. Run separately on each Supabase project.
-- Includes the application-owned crm_v2 schema on A; it is absent on B.
-- This is schema/size evidence, not a backup or data reconciliation.
select
  current_database() as database_name,
  current_setting('server_version') as postgres_version,
  pg_database_size(current_database()) as database_bytes,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')) as public_tables,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'crm_v2' and c.relkind in ('r', 'p')) as crm_v2_tables,
  (select count(*) from pg_policies where schemaname = 'public') as public_rls_policies,
  (select count(*) from pg_policies where schemaname = 'crm_v2') as crm_v2_rls_policies,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public') as public_functions,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'crm_v2') as crm_v2_functions,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and not t.tgisinternal) as public_triggers,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'crm_v2' and not t.tgisinternal) as crm_v2_triggers,
  (select count(*) from pg_constraint co join pg_namespace n on n.oid = co.connamespace
   where n.nspname = 'public' and co.contype = 'f') as public_foreign_keys,
  (select count(*) from pg_constraint co join pg_namespace n on n.oid = co.connamespace
   where n.nspname = 'crm_v2' and co.contype = 'f') as crm_v2_foreign_keys,
  (select count(*) from pg_type ty join pg_namespace n on n.oid = ty.typnamespace
   where n.nspname = 'public' and ty.typtype = 'e') as public_enums,
  (select count(*) from information_schema.columns
   where table_schema = 'public' and data_type in ('json', 'jsonb')) as public_json_columns,
  (select count(*) from information_schema.columns
   where table_schema = 'public' and data_type like 'timestamp%') as public_timestamp_columns,
  (select count(*) from information_schema.columns
   where table_schema = 'public' and data_type = 'uuid') as public_uuid_columns,
  (select count(*) from auth.users) as auth_users;
