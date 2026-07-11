create or replace function public.admin_student_provisioning_operation_safe_json(
  p_operation public.admin_student_provisioning_operations
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select to_jsonb(p_operation) - 'lease_token' - 'lease_expires_at';
$$;

revoke all on function public.admin_student_provisioning_operation_safe_json(public.admin_student_provisioning_operations)
  from public, anon, authenticated;
grant execute on function public.admin_student_provisioning_operation_safe_json(public.admin_student_provisioning_operations)
  to service_role;
