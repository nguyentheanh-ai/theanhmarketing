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


