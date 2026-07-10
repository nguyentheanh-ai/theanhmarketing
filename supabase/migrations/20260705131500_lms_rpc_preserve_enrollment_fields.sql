set check_function_bodies = off;

create or replace function public.crm_v2_lms_upsert_enrollment(
  p_course_id uuid,
  p_course_slug text,
  p_course_title text,
  p_student_name text,
  p_email text,
  p_phone text,
  p_user_id uuid,
  p_status text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, crm_v2
as $$
declare
  v_email text := lower(nullif(trim(p_email), ''));
  v_phone_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_phone text := nullif(trim(p_phone), '');
  v_normalized_phone text;
  v_contact crm_v2.contacts%rowtype;
  v_enrollment_id uuid;
begin
  if v_phone_digits is not null and v_phone_digits <> '' then
    if trim(coalesce(p_phone, '')) like '+%' and v_phone_digits like '84%' then
      v_normalized_phone := '+' || v_phone_digits;
    elsif v_phone_digits like '84%' then
      v_normalized_phone := '+' || v_phone_digits;
    elsif v_phone_digits like '0%' then
      v_normalized_phone := '+84' || substring(v_phone_digits from 2);
    elsif length(v_phone_digits) between 9 and 10 then
      v_normalized_phone := '+84' || v_phone_digits;
    elsif trim(coalesce(p_phone, '')) like '+%' then
      v_normalized_phone := '+' || v_phone_digits;
    else
      v_normalized_phone := v_phone_digits;
    end if;
  end if;

  if v_email is null and v_normalized_phone is null then
    raise exception 'missing_student_identity';
  end if;

  select *
  into v_contact
  from crm_v2.contacts c
  where (v_email is not null and c.normalized_email = v_email)
     or (v_normalized_phone is not null and c.normalized_phone = v_normalized_phone)
  order by c.updated_at desc
  limit 1;

  if v_contact.id is null then
    insert into crm_v2.contacts (
      full_name,
      email,
      phone,
      normalized_email,
      normalized_phone,
      lifecycle_stage,
      source,
      metadata,
      updated_at
    )
    values (
      coalesce(nullif(trim(p_student_name), ''), v_email, v_normalized_phone, 'Hoc vien'),
      v_email,
      v_phone,
      v_email,
      v_normalized_phone,
      'student',
      'crm-v2-lms',
      jsonb_build_object('source', 'crm-v2-lms'),
      now()
    )
    returning * into v_contact;
  end if;

  select e.id
  into v_enrollment_id
  from crm_v2.enrollments e
  where e.contact_id = v_contact.id
    and e.course_slug = p_course_slug
  limit 1;

  if v_enrollment_id is null then
    insert into crm_v2.enrollments (
      contact_id,
      user_id,
      course_id,
      status,
      activated_at,
      expires_at,
      last_seen_at,
      course_slug,
      metadata,
      updated_at
    )
    values (
      v_contact.id,
      p_user_id,
      p_course_id,
      coalesce(nullif(p_status, ''), 'active'),
      now(),
      p_expires_at,
      null,
      p_course_slug,
      jsonb_build_object(
        'source', 'crm-v2-lms',
        'course_title', p_course_title,
        'course_slug', p_course_slug,
        'student_email', v_email,
        'student_name', coalesce(nullif(trim(p_student_name), ''), v_contact.full_name)
      ),
      now()
    )
    returning id into v_enrollment_id;
  else
    update crm_v2.enrollments
    set user_id = coalesce(p_user_id, user_id),
        course_id = p_course_id,
        status = coalesce(nullif(p_status, ''), status),
        expires_at = coalesce(p_expires_at, expires_at),
        metadata = metadata || jsonb_build_object(
          'source', 'crm-v2-lms',
          'course_title', p_course_title,
          'course_slug', p_course_slug,
          'student_email', v_email,
          'student_name', coalesce(nullif(trim(p_student_name), ''), v_contact.full_name)
        ),
        updated_at = now()
    where id = v_enrollment_id;
  end if;

  return jsonb_build_object('id', v_enrollment_id, 'contact_id', v_contact.id);
end;
$$;

revoke all on function public.crm_v2_lms_upsert_enrollment(uuid, text, text, text, text, text, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.crm_v2_lms_upsert_enrollment(uuid, text, text, text, text, text, uuid, text, timestamptz) to service_role;

create or replace function public.crm_v2_lms_update_enrollment(
  p_enrollment_id uuid,
  p_status text,
  p_expires_at timestamptz,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, crm_v2
as $$
begin
  update crm_v2.enrollments
  set status = coalesce(nullif(p_status, ''), status),
      expires_at = coalesce(p_expires_at, expires_at),
      user_id = coalesce(p_user_id, user_id),
      updated_at = now()
  where id = p_enrollment_id;

  if not found then
    raise exception 'enrollment_not_found';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.crm_v2_lms_update_enrollment(uuid, text, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.crm_v2_lms_update_enrollment(uuid, text, timestamptz, uuid) to service_role;
