create or replace function public.save_admin_student_provisioning_outcome(
  p_operation_id text,
  p_lease_token uuid,
  p_status text,
  p_current_step text,
  p_order_code text,
  p_safe_result jsonb,
  p_lease_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_operation public.admin_student_provisioning_operations%rowtype;
  v_operation_json jsonb;
  v_now timestamptz;
begin
  if p_operation_id is null
     or length(p_operation_id) < 8
     or length(p_operation_id) > 128
     or p_operation_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$'
     or p_lease_token is null
     or p_status is null
     or p_status not in ('running', 'partial', 'completed', 'failed')
     or p_current_step is null
     or p_current_step not in ('validate', 'resolve_student', 'create_order', 'ensure_account', 'grant_access', 'send_email', 'complete')
     or (p_order_code is not null and (
       length(p_order_code) < 1
       or length(p_order_code) > 120
       or p_order_code !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
     ))
     or p_safe_result is null
     or jsonb_typeof(p_safe_result) <> 'object'
     or p_lease_seconds is null
     or p_lease_seconds < 1
     or p_lease_seconds > 600 then
    raise exception 'invalid_provisioning_outcome' using errcode = '22023';
  end if;

  if p_status = 'completed' and (
    p_current_step <> 'complete'
    or not public.admin_student_provisioning_completed_result_is_valid(p_safe_result)
  ) then
    raise exception 'invalid_completed_provisioning_outcome' using errcode = '22023';
  end if;

  select *
  into v_operation
  from public.admin_student_provisioning_operations
  where operation_id = p_operation_id
  for update;

  if not found then
    return jsonb_build_object('save_state', 'lost_lease');
  end if;

  v_now := clock_timestamp();

  if v_operation.lease_token is distinct from p_lease_token
     or v_operation.lease_expires_at is null
     or v_operation.lease_expires_at <= v_now then
    return jsonb_build_object('save_state', 'lost_lease');
  end if;

  update public.admin_student_provisioning_operations
  set status = p_status,
      current_step = p_current_step,
      order_code = p_order_code,
      safe_result = p_safe_result,
      lease_token = case when p_status = 'running' then p_lease_token else null end,
      lease_expires_at = case
        when p_status = 'running' then v_now + make_interval(secs => p_lease_seconds)
        else null
      end,
      updated_at = v_now
  where operation_id = p_operation_id
  returning * into v_operation;

  v_operation_json := public.admin_student_provisioning_operation_safe_json(v_operation);
  return jsonb_build_object('save_state', 'saved', 'operation', v_operation_json);
end;
$$;

revoke all on function public.save_admin_student_provisioning_outcome(text, uuid, text, text, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.save_admin_student_provisioning_outcome(text, uuid, text, text, text, jsonb, integer)
  to service_role;
