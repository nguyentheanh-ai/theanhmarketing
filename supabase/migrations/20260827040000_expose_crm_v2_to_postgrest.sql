-- The CRM server routes use supabase-js with `.schema("crm_v2")`.
-- Keep anonymous clients out of the schema; authenticated access remains
-- constrained by the existing admin-only RLS policies, while service_role is
-- used by protected workers and webhooks.

grant usage on schema crm_v2 to authenticated, service_role;

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, crm_v2';

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
