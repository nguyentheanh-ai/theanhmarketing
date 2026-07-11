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


