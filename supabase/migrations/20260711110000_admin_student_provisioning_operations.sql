create extension if not exists "pgcrypto";

create table if not exists public.admin_student_provisioning_operations (
  id uuid primary key default gen_random_uuid(),
  operation_id text not null unique,
  request_fingerprint text not null,
  mode text not null check (mode in ('paid', 'free', 'trial')),
  status text not null check (status in ('running', 'partial', 'completed', 'failed')),
  current_step text not null check (current_step in ('validate', 'resolve_student', 'create_order', 'ensure_account', 'grant_access', 'send_email', 'complete')),
  order_code text check (order_code is null or (length(order_code) between 1 and 120 and order_code ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$')),
  safe_result jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_result) = 'object'),
  actor_id uuid,
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'completed' or current_step = 'complete'),
  check ((lease_token is null) = (lease_expires_at is null))
);

create index if not exists idx_admin_student_provisioning_operations_status_updated_at
  on public.admin_student_provisioning_operations(status, updated_at);

create index if not exists idx_admin_student_provisioning_operations_lease_expires_at
  on public.admin_student_provisioning_operations(lease_expires_at)
  where lease_expires_at is not null;

alter table public.admin_student_provisioning_operations enable row level security;

revoke all on table public.admin_student_provisioning_operations from public, anon, authenticated;
grant select, insert, update on table public.admin_student_provisioning_operations to service_role;

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
       or jsonb_typeof(v_operation.safe_result->'student') is distinct from 'object'
       or jsonb_typeof(v_operation.safe_result->'order') is distinct from 'object'
       or jsonb_typeof(v_operation.safe_result->'access') is distinct from 'object'
       or jsonb_typeof(v_operation.safe_result->'email') is distinct from 'object'
       or case
         when jsonb_typeof(v_operation.safe_result->'nextActions') = 'array'
           then jsonb_array_length(v_operation.safe_result->'nextActions') <> 0
         else true
       end
       or v_operation.safe_result ? 'errorCode'
       or v_operation.safe_result #>> '{student,state}' = 'failed'
       or v_operation.safe_result #>> '{order,state}' = 'failed'
       or v_operation.safe_result #>> '{access,state}' = 'failed'
       or v_operation.safe_result #>> '{email,state}' = 'failed'
       or coalesce(v_operation.safe_result #>> '{student,state}', '') not in ('created', 'existing', 'skipped', 'not_applicable')
       or coalesce(v_operation.safe_result #>> '{order,state}', '') not in ('created', 'existing', 'skipped', 'not_applicable')
       or coalesce(v_operation.safe_result #>> '{access,state}', '') not in ('existing', 'granted', 'skipped', 'not_applicable')
       or coalesce(v_operation.safe_result #>> '{email,state}', '') not in ('sent', 'skipped', 'not_applicable') then
      raise exception 'invalid_completed_provisioning_operation' using errcode = 'P0001';
    end if;

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
  return jsonb_build_object('claim_state', 'resume', 'operation', v_operation_json);
end;
$$;

revoke all on function public.claim_admin_student_provisioning_operation(text, text, text, uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_admin_student_provisioning_operation(text, text, text, uuid, uuid, integer)
  to service_role;

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
    or jsonb_typeof(p_safe_result->'student') is distinct from 'object'
    or jsonb_typeof(p_safe_result->'order') is distinct from 'object'
    or jsonb_typeof(p_safe_result->'access') is distinct from 'object'
    or jsonb_typeof(p_safe_result->'email') is distinct from 'object'
    or case
      when jsonb_typeof(p_safe_result->'nextActions') = 'array'
        then jsonb_array_length(p_safe_result->'nextActions') <> 0
      else true
    end
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
  return jsonb_build_object('save_state', 'saved', 'operation', v_operation_json);
end;
$$;

revoke all on function public.save_admin_student_provisioning_outcome(text, uuid, text, text, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.save_admin_student_provisioning_outcome(text, uuid, text, text, text, jsonb, integer)
  to service_role;
