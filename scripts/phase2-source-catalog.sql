select jsonb_build_object(
 'capturedAt',now(),'databaseVersion',current_setting('server_version'),
 'schemas',(select jsonb_agg(x order by schema) from (
 select n.nspname as schema,count(*)::integer as tables,count(*) filter(where c.relrowsecurity)::integer as rlsEnabled
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname in ('public','crm_v2') group by n.nspname) x),
 'policyCount',(select count(*)::integer from pg_policies where schemaname in ('public','crm_v2')),
 'functionCount',(select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','crm_v2')),
 'triggerCount',(select count(*)::integer from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','crm_v2')),
 'tablesWithoutPrimaryKey',(select coalesce(jsonb_agg(n.nspname||'.'||c.relname order by n.nspname,c.relname),'[]'::jsonb)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname in ('public','crm_v2') and not exists(select 1 from pg_index i where i.indrelid=c.oid and i.indisprimary)),
 'authUsers',(select count(*)::integer from auth.users),
 'authIdentitiesByProvider',(select jsonb_agg(x) from (select provider,count(*)::integer as identities from auth.identities group by provider order by provider)x),
 'storage',(select jsonb_agg(x) from (select public,count(*)::integer as buckets from storage.buckets group by public order by public)x),
 'storageObjectCount',(select count(*)::integer from storage.objects)
) as inventory;
