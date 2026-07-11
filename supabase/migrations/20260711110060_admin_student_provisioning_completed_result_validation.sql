create or replace function public.admin_student_provisioning_completed_result_is_valid(p_safe_result jsonb)
returns boolean
language sql
immutable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_typeof(p_safe_result->'student') = 'object'
    and jsonb_typeof(p_safe_result->'order') = 'object'
    and jsonb_typeof(p_safe_result->'access') = 'object'
    and jsonb_typeof(p_safe_result->'email') = 'object'
    and jsonb_typeof(p_safe_result->'nextActions') = 'array'
    and jsonb_array_length(p_safe_result->'nextActions') = 0
    and not (p_safe_result ? 'errorCode')
    and coalesce(p_safe_result #>> '{student,state}', '') in ('created', 'existing', 'skipped', 'not_applicable')
    and coalesce(p_safe_result #>> '{order,state}', '') in ('created', 'existing', 'skipped', 'not_applicable')
    and coalesce(p_safe_result #>> '{access,state}', '') in ('existing', 'granted', 'skipped', 'not_applicable')
    and coalesce(p_safe_result #>> '{email,state}', '') in ('sent', 'skipped', 'not_applicable');
$$;

revoke all on function public.admin_student_provisioning_completed_result_is_valid(jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_student_provisioning_completed_result_is_valid(jsonb)
  to service_role;
