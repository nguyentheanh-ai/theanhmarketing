create or replace function public.get_admin_student_provisioning_operation(p_operation_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_operation public.admin_student_provisioning_operations%rowtype;
begin
  if p_operation_id is null
     or length(p_operation_id) not between 8 and 128
     or p_operation_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$' then
    raise exception 'invalid_provisioning_operation_id' using errcode = '22023';
  end if;

  select * into v_operation
  from public.admin_student_provisioning_operations
  where operation_id = p_operation_id;

  if v_operation.id is null then return null; end if;
  return jsonb_build_object(
    'id', v_operation.id,
    'operation_id', v_operation.operation_id,
    'request_fingerprint', v_operation.request_fingerprint,
    'mode', v_operation.mode,
    'status', v_operation.status,
    'current_step', v_operation.current_step,
    'order_code', v_operation.order_code,
    'safe_result', v_operation.safe_result,
    'actor_id', v_operation.actor_id,
    'created_at', v_operation.created_at,
    'updated_at', v_operation.updated_at
  );
end;
$$;

revoke all on function public.get_admin_student_provisioning_operation(text) from public, anon, authenticated;
grant execute on function public.get_admin_student_provisioning_operation(text) to service_role;

