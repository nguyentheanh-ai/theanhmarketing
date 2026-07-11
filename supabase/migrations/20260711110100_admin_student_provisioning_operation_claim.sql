create or replace function public.claim_admin_student_provisioning_operation(
  p_operation_id text,
  p_request_fingerprint text,
  p_mode text,
  p_actor_id uuid,
  p_lease_token uuid,
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
     or p_request_fingerprint is null
     or p_request_fingerprint !~ '^[a-f0-9]{64}$'
     or p_mode is null
     or p_mode not in ('paid', 'free', 'trial')
     or p_lease_token is null
     or p_lease_seconds is null
     or p_lease_seconds < 1
     or p_lease_seconds > 600 then
    raise exception 'invalid_provisioning_claim' using errcode = '22023';
  end if;

  insert into public.admin_student_provisioning_operations (
    operation_id,
    request_fingerprint,
    mode,
    status,
    current_step,
    actor_id
  ) values (
    p_operation_id,
    p_request_fingerprint,
    p_mode,
    'running',
    'validate',
    p_actor_id
  )
  on conflict (operation_id) do nothing
  returning * into v_operation;

  if found then
    v_now := clock_timestamp();
    update public.admin_student_provisioning_operations
    set lease_token = p_lease_token,
        lease_expires_at = v_now + make_interval(secs => p_lease_seconds),
        updated_at = v_now
    where id = v_operation.id
    returning * into v_operation;

    v_operation_json := public.admin_student_provisioning_operation_safe_json(v_operation);
    return jsonb_build_object('claim_state', 'new', 'operation', v_operation_json);
  end if;

  select *
  into v_operation
  from public.admin_student_provisioning_operations
  where operation_id = p_operation_id
  for update;

  if not found then
    raise exception 'provisioning_operation_missing' using errcode = 'P0001';
  end if;

  v_now := clock_timestamp();

  if v_operation.request_fingerprint <> p_request_fingerprint or v_operation.mode <> p_mode then
    return jsonb_build_object('claim_state', 'conflict');
  end if;

  if v_operation.status = 'completed' then
    if v_operation.current_step <> 'complete'
       or not public.admin_student_provisioning_completed_result_is_valid(v_operation.safe_result) then
      raise exception 'invalid_completed_provisioning_operation' using errcode = 'P0001';
    end if;

    v_operation_json := public.admin_student_provisioning_operation_safe_json(v_operation);
    return jsonb_build_object('claim_state', 'complete', 'operation', v_operation_json);
  end if;

  if v_operation.lease_token is not null and v_operation.lease_expires_at > v_now then
    return jsonb_build_object('claim_state', 'busy');
  end if;

  update public.admin_student_provisioning_operations
  set lease_token = p_lease_token,
      lease_expires_at = v_now + make_interval(secs => p_lease_seconds),
      status = 'running',
      updated_at = v_now
  where operation_id = p_operation_id
  returning * into v_operation;

  v_operation_json := public.admin_student_provisioning_operation_safe_json(v_operation);
  return jsonb_build_object('claim_state', 'resume', 'operation', v_operation_json);
end;
$$;

revoke all on function public.claim_admin_student_provisioning_operation(text, text, text, uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_admin_student_provisioning_operation(text, text, text, uuid, uuid, integer)
  to service_role;
