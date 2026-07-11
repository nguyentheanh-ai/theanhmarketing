create or replace function public.begin_admin_student_provisioning_email_dispatch(p_operation_id text, p_lease_token uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_operation public.admin_student_provisioning_operations%rowtype; v_now timestamptz; v_attempt integer; v_key text;
begin
  select * into v_operation from public.admin_student_provisioning_operations where operation_id = p_operation_id for update;
  v_now := clock_timestamp();
  if v_operation.id is null or v_operation.lease_token is distinct from p_lease_token or v_operation.lease_expires_at <= v_now then
    return jsonb_build_object('dispatch_state', 'lost_lease');
  end if;
  if v_operation.email_dispatch_state = 'sent' then
    return jsonb_build_object('dispatch_state', 'sent', 'provider_message_id', v_operation.email_provider_message_id);
  end if;
  if v_operation.email_dispatch_state = 'manual_review' then return jsonb_build_object('dispatch_state', 'manual_review'); end if;
  if v_operation.email_dispatch_state = 'started' then
    update public.admin_student_provisioning_operations set email_dispatch_state = 'manual_review', updated_at = v_now where id = v_operation.id;
    return jsonb_build_object('dispatch_state', 'manual_review');
  end if;
  if v_operation.email_dispatch_state is not null and v_operation.email_dispatch_state <> 'retry_authorized' then
    return jsonb_build_object('dispatch_state', 'manual_review');
  end if;
  v_attempt := v_operation.email_dispatch_attempt + 1;
  v_key := 'student-provisioning/' || p_operation_id || '/email/' || v_attempt::text;
  update public.admin_student_provisioning_operations set email_dispatch_state = 'started', email_dispatch_attempt = v_attempt,
    email_dispatch_idempotency_key = v_key, email_provider_message_id = null, email_dispatch_started_at = v_now,
    email_dispatch_finished_at = null, updated_at = v_now where id = v_operation.id;
  return jsonb_build_object('dispatch_state', 'send', 'idempotency_key', v_key, 'attempt', v_attempt);
end; $$;

create or replace function public.finish_admin_student_provisioning_email_dispatch(
  p_operation_id text, p_lease_token uuid, p_state text, p_provider_message_id text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_operation public.admin_student_provisioning_operations%rowtype; v_now timestamptz;
begin
  if p_state not in ('sent', 'manual_review', 'retryable') or (p_provider_message_id is not null and (length(p_provider_message_id) > 160 or p_provider_message_id !~ '^[A-Za-z0-9._:-]+$')) then
    raise exception 'invalid_email_dispatch_finish' using errcode = '22023';
  end if;
  select * into v_operation from public.admin_student_provisioning_operations where operation_id = p_operation_id for update;
  v_now := clock_timestamp();
  if v_operation.id is null or v_operation.lease_token is distinct from p_lease_token or v_operation.lease_expires_at <= v_now then
    return jsonb_build_object('dispatch_state', 'lost_lease');
  end if;
  update public.admin_student_provisioning_operations set
    email_dispatch_state = case when p_state = 'retryable' then 'retry_authorized' else p_state end,
    email_provider_message_id = case when p_state = 'sent' then p_provider_message_id else null end,
    email_dispatch_finished_at = v_now, updated_at = v_now
    where id = v_operation.id and email_dispatch_state = 'started';
  if not found then return jsonb_build_object('dispatch_state', 'manual_review'); end if;
  return jsonb_build_object('dispatch_state', case when p_state = 'retryable' then 'retryable' else p_state end);
end; $$;


