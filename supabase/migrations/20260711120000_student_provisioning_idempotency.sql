-- Durable, non-sensitive correlation keys for crash-safe admin provisioning.
-- Apply this migration before enabling the unified provisioning endpoint.

alter table public.orders
  add column if not exists provisioning_operation_id text;

alter table public.orders
  drop constraint if exists orders_provisioning_operation_id_format;
alter table public.orders
  add constraint orders_provisioning_operation_id_format check (
    provisioning_operation_id is null or (
      length(provisioning_operation_id) between 8 and 128
      and provisioning_operation_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$'
    )
  );

create unique index if not exists idx_orders_provisioning_operation_id
  on public.orders (provisioning_operation_id)
  where provisioning_operation_id is not null;

alter table public.leads
  add column if not exists provisioning_operation_id text;

alter table public.leads
  drop constraint if exists leads_provisioning_operation_id_format;
alter table public.leads
  add constraint leads_provisioning_operation_id_format check (
    provisioning_operation_id is null or (
      length(provisioning_operation_id) between 8 and 128
      and provisioning_operation_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$'
    )
  );

create unique index if not exists idx_leads_provisioning_operation_id
  on public.leads (provisioning_operation_id)
  where provisioning_operation_id is not null;

alter table public.admin_student_provisioning_operations
  add column if not exists email_dispatch_state text,
  add column if not exists email_dispatch_attempt integer not null default 0,
  add column if not exists email_dispatch_idempotency_key text,
  add column if not exists email_provider_message_id text,
  add column if not exists email_dispatch_started_at timestamptz,
  add column if not exists email_dispatch_finished_at timestamptz;

alter table public.admin_student_provisioning_operations
  drop constraint if exists admin_student_provisioning_operations_email_dispatch_state_check;
alter table public.admin_student_provisioning_operations
  add constraint admin_student_provisioning_operations_email_dispatch_state_check check (
    email_dispatch_state is null or email_dispatch_state in ('started', 'sent', 'manual_review', 'retry_authorized')
  );
alter table public.admin_student_provisioning_operations
  drop constraint if exists admin_student_provisioning_operations_email_dispatch_attempt_check;
alter table public.admin_student_provisioning_operations
  add constraint admin_student_provisioning_operations_email_dispatch_attempt_check check (email_dispatch_attempt between 0 and 100);
alter table public.admin_student_provisioning_operations
  drop constraint if exists admin_student_provisioning_operations_email_dispatch_payload_check;
alter table public.admin_student_provisioning_operations
  add constraint admin_student_provisioning_operations_email_dispatch_payload_check check (
    (email_dispatch_state is null and email_dispatch_attempt = 0 and email_dispatch_idempotency_key is null)
    or (email_dispatch_state is not null and email_dispatch_attempt >= 1
      and email_dispatch_idempotency_key is not null
      and email_dispatch_idempotency_key ~ '^[A-Za-z0-9/._:-]{8,200}$')
  );
alter table public.admin_student_provisioning_operations
  drop constraint if exists admin_student_provisioning_operations_email_provider_id_check;
alter table public.admin_student_provisioning_operations
  add constraint admin_student_provisioning_operations_email_provider_id_check check (
    email_provider_message_id is null or (length(email_provider_message_id) between 1 and 160
      and email_provider_message_id ~ '^[A-Za-z0-9._:-]+$')
  );

create or replace function public.provision_admin_student_enrollment(
  p_operation_id text,
  p_lease_token uuid,
  p_course_id uuid,
  p_course_slug text,
  p_course_title text,
  p_student_name text,
  p_email text,
  p_phone text,
  p_user_id uuid,
  p_mode text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, crm_v2, pg_temp
as $$
declare
  v_now timestamptz;
  v_operation public.admin_student_provisioning_operations%rowtype;
  v_email text := lower(nullif(trim(p_email), ''));
  v_phone_digits text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
  v_normalized_phone text;
  v_email_contact uuid;
  v_phone_contact uuid;
  v_contact crm_v2.contacts%rowtype;
  v_enrollment crm_v2.enrollments%rowtype;
  v_outcome text;
  v_effective_kind text;
begin
  if v_phone_digits is not null then
    if trim(coalesce(p_phone, '')) like '+%' and v_phone_digits like '84%' then v_normalized_phone := '+' || v_phone_digits;
    elsif v_phone_digits like '84%' then v_normalized_phone := '+' || v_phone_digits;
    elsif v_phone_digits like '0%' then v_normalized_phone := '+84' || substring(v_phone_digits from 2);
    elsif length(v_phone_digits) between 9 and 10 then v_normalized_phone := '+84' || v_phone_digits;
    elsif trim(coalesce(p_phone, '')) like '+%' then v_normalized_phone := '+' || v_phone_digits;
    else v_normalized_phone := v_phone_digits;
    end if;
  end if;
  if p_operation_id is null or p_lease_token is null or length(p_operation_id) not between 8 and 128
     or p_operation_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$'
     or p_course_id is null or nullif(trim(p_course_slug), '') is null
     or p_mode not in ('free', 'trial')
     or (v_email is null and v_phone_digits is null)
     or (p_mode = 'trial' and p_expires_at is null)
     or (p_mode = 'free' and p_expires_at is not null) then
    raise exception 'invalid_atomic_provisioning_enrollment' using errcode = '22023';
  end if;

  select * into v_operation from public.admin_student_provisioning_operations where operation_id = p_operation_id for update;
  v_now := clock_timestamp();
  if v_operation.id is null or v_operation.lease_token is distinct from p_lease_token
     or v_operation.mode <> p_mode
     or v_operation.lease_expires_at is null or v_operation.lease_expires_at <= v_now then
    return jsonb_build_object('outcome', 'lost_lease');
  end if;

  if v_email is not null then
    perform pg_advisory_xact_lock(hashtextextended('email:' || v_email, 0));
  end if;
  if v_phone_digits is not null then
    perform pg_advisory_xact_lock(hashtextextended('phone:' || v_phone_digits, 0));
  end if;
  v_now := clock_timestamp();
  if v_operation.lease_expires_at <= v_now then
    return jsonb_build_object('outcome', 'lost_lease');
  end if;
  if p_mode = 'trial' and p_expires_at <= v_now then
    raise exception 'trial_expiry_elapsed_during_provisioning' using errcode = '22023';
  end if;

  select id into v_email_contact from crm_v2.contacts where v_email is not null and normalized_email = v_email order by updated_at desc limit 1;
  select id into v_phone_contact from crm_v2.contacts
    where v_normalized_phone is not null and (normalized_phone = v_normalized_phone
      or regexp_replace(coalesce(normalized_phone, phone, ''), '\D', '', 'g') = v_phone_digits)
    order by updated_at desc limit 1;
  if v_email_contact is not null and v_phone_contact is not null and v_email_contact <> v_phone_contact then
    raise exception 'provisioning_identity_conflict' using errcode = '23505';
  end if;

  select * into v_contact from crm_v2.contacts where id = coalesce(v_email_contact, v_phone_contact) for update;
  if v_contact.id is null then
    insert into crm_v2.contacts (full_name, email, phone, normalized_email, normalized_phone, lifecycle_stage, source, metadata, updated_at)
    values (coalesce(nullif(trim(p_student_name), ''), v_email, v_phone_digits, 'Hoc vien'), v_email, nullif(trim(p_phone), ''),
      v_email, v_normalized_phone, 'student', 'admin-provisioning',
      jsonb_build_object('source', 'admin-provisioning'), v_now)
    returning * into v_contact;
  end if;

  select * into v_enrollment from crm_v2.enrollments
    where contact_id = v_contact.id and course_slug = p_course_slug
    limit 1 for update;

  if v_enrollment.id is null then
    insert into crm_v2.enrollments (contact_id, user_id, course_id, status, activated_at, expires_at, course_slug, metadata, updated_at)
    values (v_contact.id, p_user_id, p_course_id, 'active', v_now, case when p_mode = 'free' then null else p_expires_at end,
      p_course_slug, jsonb_build_object('source', 'admin-provisioning', 'course_title', p_course_title,
        'provisioning_operation_id', p_operation_id, 'access_kind', p_mode), v_now)
    returning * into v_enrollment;
    v_outcome := 'granted';
    v_effective_kind := p_mode;
  elsif v_enrollment.order_id is not null or v_enrollment.metadata->>'access_kind' = 'paid' then
    update crm_v2.enrollments set
      user_id = coalesce(p_user_id, user_id), course_id = coalesce(course_id, p_course_id),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'provisioning_operation_id', p_operation_id, 'access_kind', 'paid', 'requested_access_kind', p_mode
      ), updated_at = v_now
    where id = v_enrollment.id returning * into v_enrollment;
    v_outcome := 'already_paid';
    v_effective_kind := 'paid';
  elsif p_mode = 'trial' and v_enrollment.status in ('active', 'completed') and v_enrollment.expires_at is null then
    v_effective_kind := case
      when v_enrollment.order_id is not null then 'paid'
      when v_enrollment.metadata->>'access_kind' in ('paid', 'free') then v_enrollment.metadata->>'access_kind'
      else 'free'
    end;
    update crm_v2.enrollments set
      user_id = coalesce(p_user_id, user_id), course_id = p_course_id,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('provisioning_operation_id', p_operation_id,
        'access_kind', v_effective_kind, 'requested_access_kind', 'trial'), updated_at = v_now
    where id = v_enrollment.id returning * into v_enrollment;
    v_outcome := 'already_unlimited';
  elsif p_mode = 'free' then
    update crm_v2.enrollments set user_id = coalesce(p_user_id, user_id), course_id = p_course_id, status = 'active',
      activated_at = coalesce(activated_at, v_now), expires_at = null,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('provisioning_operation_id', p_operation_id, 'access_kind', 'free'),
      updated_at = v_now where id = v_enrollment.id returning * into v_enrollment;
    v_outcome := 'granted'; v_effective_kind := 'free';
  else
    update crm_v2.enrollments set user_id = coalesce(p_user_id, user_id), course_id = p_course_id, status = 'active',
      activated_at = coalesce(activated_at, v_now),
      expires_at = case when expires_at is not null and expires_at > p_expires_at then expires_at else p_expires_at end,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('provisioning_operation_id', p_operation_id, 'access_kind', 'trial'),
      updated_at = v_now where id = v_enrollment.id returning * into v_enrollment;
    v_outcome := 'granted'; v_effective_kind := 'trial';
  end if;

  return jsonb_build_object('id', v_enrollment.id, 'status', v_enrollment.status, 'expires_at', v_enrollment.expires_at,
    'access_kind', v_effective_kind, 'outcome', v_outcome, 'provisioning_operation_id', p_operation_id);
end;
$$;

revoke all on function public.provision_admin_student_enrollment(text, uuid, uuid, text, text, text, text, text, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.provision_admin_student_enrollment(text, uuid, uuid, text, text, text, text, text, uuid, text, timestamptz)
  to service_role;

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

create or replace function public.resolve_admin_student_provisioning_email_review(
  p_operation_id text, p_owner_id uuid, p_resolution text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_operation public.admin_student_provisioning_operations%rowtype;
  v_now timestamptz;
  v_safe_result jsonb;
  v_next_actions jsonb;
  v_status text;
  v_current_step text;
  v_error_code text;
  v_course_slugs jsonb;
begin
  if p_owner_id is null or p_resolution not in ('confirm_delivered', 'confirm_not_delivered') then
    raise exception 'invalid_email_review_resolution' using errcode = '22023';
  end if;
  select * into v_operation from public.admin_student_provisioning_operations where operation_id = p_operation_id for update;
  v_now := clock_timestamp();
  if v_operation.id is null
     or v_operation.email_dispatch_state <> 'manual_review'
     or v_operation.status <> 'partial'
     or v_operation.current_step <> 'send_email'
     or v_operation.lease_token is not null
     or v_operation.lease_expires_at is not null
     or v_operation.safe_result #>> '{email,state}' <> 'failed'
     or jsonb_typeof(v_operation.safe_result->'nextActions') is distinct from 'array'
     or not (v_operation.safe_result->'nextActions' ? 'review_email') then
    return jsonb_build_object('resolution_state', 'not_reviewable');
  end if;

  if jsonb_typeof(v_operation.safe_result) is distinct from 'object' then
    return jsonb_build_object('resolution_state', 'not_reviewable');
  end if;

  if p_resolution = 'confirm_delivered' then
    select coalesce(jsonb_agg(action order by action), '[]'::jsonb) into v_next_actions
    from (
      select distinct value as action
      from jsonb_array_elements_text(v_operation.safe_result->'nextActions')
      where value <> 'review_email'
    ) remaining;
    v_safe_result := jsonb_set(v_operation.safe_result, '{email}', '{"state":"sent"}'::jsonb, true);
  else
    select coalesce(jsonb_agg(action order by action), '[]'::jsonb) into v_next_actions
    from (
      select distinct case when value = 'review_email' then 'retry_email' else value end as action
      from jsonb_array_elements_text(v_operation.safe_result->'nextActions')
    ) retry_actions;
    v_safe_result := v_operation.safe_result;
  end if;

  v_safe_result := jsonb_set(v_safe_result, '{nextActions}', v_next_actions, true);
  if v_next_actions ? 'retry_access' then
    v_safe_result := jsonb_set(v_safe_result, '{errorCode}', '"ACCESS_GRANT_FAILED"'::jsonb, true);
  elsif v_next_actions ? 'retry_email' then
    v_safe_result := jsonb_set(v_safe_result, '{errorCode}', '"EMAIL_SEND_FAILED"'::jsonb, true);
  else
    v_safe_result := v_safe_result - 'errorCode';
  end if;

  v_status := 'partial';
  v_current_step := v_operation.current_step;
  if p_resolution = 'confirm_delivered'
     and jsonb_array_length(v_next_actions) = 0
     and coalesce(v_safe_result #>> '{student,state}', '') in ('created', 'existing', 'skipped', 'not_applicable')
     and coalesce(v_safe_result #>> '{order,state}', '') in ('created', 'existing', 'skipped', 'not_applicable')
     and coalesce(v_safe_result #>> '{access,state}', '') in ('existing', 'granted', 'skipped', 'not_applicable')
     and coalesce(v_safe_result #>> '{email,state}', '') in ('sent', 'skipped', 'not_applicable') then
    v_status := 'completed';
    v_current_step := 'complete';
  end if;

  update public.admin_student_provisioning_operations set
    email_dispatch_state = case when p_resolution = 'confirm_delivered' then 'sent' else 'retry_authorized' end,
    email_dispatch_finished_at = case when p_resolution = 'confirm_delivered' then v_now else null end,
    safe_result = v_safe_result,
    status = v_status,
    current_step = v_current_step,
    lease_token = null,
    lease_expires_at = null,
    updated_at = v_now where id = v_operation.id;

  v_error_code := v_safe_result->>'errorCode';
  v_course_slugs := case when jsonb_typeof(v_safe_result #> '{access,courseSlugs}') = 'array'
    then v_safe_result #> '{access,courseSlugs}' else '[]'::jsonb end;
  insert into public.activity_logs (
    event_type, event_title, status, actor_type, actor_id, metadata, created_at
  ) values (
    'student_provisioning_' || v_status,
    'Student provisioning email review',
    case when v_status = 'completed' then 'success' else 'pending' end,
    'admin',
    p_owner_id,
    jsonb_build_object(
      'operationId', p_operation_id,
      'outcomeStatus', v_status,
      'errorCode', v_error_code,
      'mode', v_operation.mode,
      'courseSlugs', v_course_slugs,
      'resolution', p_resolution
    ),
    v_now
  );
  return jsonb_build_object('resolution_state', case when p_resolution = 'confirm_delivered' then 'sent' else 'retry_authorized' end);
end; $$;

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

revoke all on function public.begin_admin_student_provisioning_email_dispatch(text, uuid) from public, anon, authenticated;
grant execute on function public.begin_admin_student_provisioning_email_dispatch(text, uuid) to service_role;
revoke all on function public.finish_admin_student_provisioning_email_dispatch(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.finish_admin_student_provisioning_email_dispatch(text, uuid, text, text) to service_role;
revoke all on function public.resolve_admin_student_provisioning_email_review(text, uuid, text) from public, anon, authenticated;
grant execute on function public.resolve_admin_student_provisioning_email_review(text, uuid, text) to service_role;
revoke all on function public.finalize_admin_student_provisioning_operation(text, uuid, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.finalize_admin_student_provisioning_operation(text, uuid, text, text, text, jsonb, jsonb)
  to service_role;

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
