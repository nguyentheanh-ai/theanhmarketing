create or replace function public.finalize_admin_student_provisioning_operation(
  p_operation_id text,
  p_lease_token uuid,
  p_status text,
  p_current_step text,
  p_order_code text,
  p_safe_result jsonb,
  p_course_slugs jsonb
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
     or length(p_operation_id) not between 8 and 128
     or p_operation_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$'
     or p_lease_token is null
     or p_status not in ('partial', 'completed', 'failed')
     or p_current_step not in ('validate', 'resolve_student', 'create_order', 'ensure_account', 'grant_access', 'send_email', 'complete')
     or (p_order_code is not null and (length(p_order_code) not between 1 and 120
       or p_order_code !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'))
     or jsonb_typeof(p_safe_result) is distinct from 'object'
     or jsonb_typeof(p_course_slugs) is distinct from 'array'
     or jsonb_array_length(p_course_slugs) not between 1 and 50
     or exists (
       select 1 from jsonb_array_elements(p_course_slugs) as slug
       where jsonb_typeof(slug) <> 'string'
          or slug #>> '{}' !~ '^[a-z0-9][a-z0-9._-]{0,119}$'
     ) then
    raise exception 'invalid_provisioning_finalization' using errcode = '22023';
  end if;

  if p_status = 'completed' and (
    p_current_step <> 'complete'
    or jsonb_typeof(p_safe_result->'student') is distinct from 'object'
    or jsonb_typeof(p_safe_result->'order') is distinct from 'object'
    or jsonb_typeof(p_safe_result->'access') is distinct from 'object'
    or jsonb_typeof(p_safe_result->'email') is distinct from 'object'
    or case when jsonb_typeof(p_safe_result->'nextActions') = 'array'
      then jsonb_array_length(p_safe_result->'nextActions') <> 0 else true end
    or p_safe_result ? 'errorCode'
    or p_safe_result #>> '{student,state}' = 'failed'
    or p_safe_result #>> '{order,state}' = 'failed'
    or p_safe_result #>> '{access,state}' = 'failed'
    or p_safe_result #>> '{email,state}' = 'failed'
    or coalesce(p_safe_result #>> '{student,state}', '') not in ('created', 'existing', 'skipped', 'not_applicable')
    or coalesce(p_safe_result #>> '{order,state}', '') not in ('created', 'existing', 'skipped', 'not_applicable')
    or coalesce(p_safe_result #>> '{access,state}', '') not in ('existing', 'granted', 'skipped', 'not_applicable')
    or coalesce(p_safe_result #>> '{email,state}', '') not in ('sent', 'skipped', 'not_applicable')
  ) then
    raise exception 'invalid_completed_provisioning_outcome' using errcode = '22023';
  end if;

  select * into v_operation
  from public.admin_student_provisioning_operations
  where operation_id = p_operation_id
  for update;

  v_now := clock_timestamp();
  if v_operation.id is null
     or v_operation.lease_token is distinct from p_lease_token
     or v_operation.lease_expires_at is null
     or v_operation.lease_expires_at <= v_now then
    return jsonb_build_object('finalize_state', 'lost_lease');
  end if;

  if not exists (
    select 1 from public.activity_logs
    where event_type = 'student_provisioning_' || p_status
      and metadata @> jsonb_build_object('operationId', p_operation_id, 'outcomeStatus', p_status)
  ) then
    insert into public.activity_logs (
      event_type, event_title, status, actor_type, actor_id, metadata, created_at
    ) values (
      'student_provisioning_' || p_status,
      'Student provisioning outcome',
      case when p_status = 'completed' then 'success' when p_status = 'failed' then 'failed' else 'pending' end,
      case when v_operation.actor_id is null then 'system' else 'admin' end,
      v_operation.actor_id,
      jsonb_build_object(
        'operationId', p_operation_id,
        'outcomeStatus', p_status,
        'errorCode', p_safe_result->>'errorCode',
        'mode', v_operation.mode,
        'courseSlugs', p_course_slugs
      ),
      v_now
    );
  end if;

  update public.admin_student_provisioning_operations
  set status = p_status,
      current_step = p_current_step,
      order_code = p_order_code,
      safe_result = p_safe_result,
      lease_token = null,
      lease_expires_at = null,
      updated_at = v_now
  where id = v_operation.id
  returning * into v_operation;

  v_operation_json := jsonb_build_object(
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
  return jsonb_build_object('finalize_state', 'finalized', 'operation', v_operation_json);
end;
$$;


