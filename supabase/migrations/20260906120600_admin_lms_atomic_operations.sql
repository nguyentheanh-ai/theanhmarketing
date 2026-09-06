-- Additive admin-only RPCs. No backfill, deletion, policy change, or customer mutation.
create or replace function public.admin_lms_reorder(p_kind text, p_parent_id uuid, p_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_count integer; v_changed integer;
begin
  if p_ids is null or cardinality(p_ids) < 1 or cardinality(p_ids) > 200
    or array_position(p_ids, null) is not null
    or cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) x) then
    raise exception 'invalid_reorder_ids';
  end if;
  if p_kind = 'courses' and p_parent_id is null then
    lock table public.courses in share row exclusive mode;
    select count(*) into v_count from public.courses;
    if v_count <> cardinality(p_ids) or exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.courses c where c.id=x)) then raise exception 'stale_course_list'; end if;
    update public.courses c set sort_order = x.position, updated_at = now()
      from unnest(p_ids) with ordinality x(id,position) where c.id=x.id and c.sort_order is distinct from x.position;
  elsif p_kind = 'modules' and p_parent_id is not null then
    lock table public.course_modules in share row exclusive mode;
    select count(*) into v_count from public.course_modules where course_id=p_parent_id;
    if v_count <> cardinality(p_ids) or exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.course_modules m where m.id=x and m.course_id=p_parent_id)) then raise exception 'stale_or_cross_course_modules'; end if;
    update public.course_modules m set sort_order=x.position, updated_at=now()
      from unnest(p_ids) with ordinality x(id,position) where m.id=x.id and m.course_id=p_parent_id and m.sort_order is distinct from x.position;
  elsif p_kind = 'lessons' and p_parent_id is not null then
    lock table public.lessons in share row exclusive mode;
    select count(*) into v_count from public.lessons where module_id=p_parent_id;
    if v_count <> cardinality(p_ids) or exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.lessons l where l.id=x and l.module_id=p_parent_id)) then raise exception 'stale_or_cross_module_lessons'; end if;
    update public.lessons l set sort_order=x.position, updated_at=now()
      from unnest(p_ids) with ordinality x(id,position) where l.id=x.id and l.module_id=p_parent_id and l.sort_order is distinct from x.position;
  else raise exception 'invalid_reorder_scope';
  end if;
  get diagnostics v_changed = row_count;
  return jsonb_build_object('ok',true,'changed',v_changed);
end;
$$;
revoke all on function public.admin_lms_reorder(text,uuid,uuid[]) from public, anon, authenticated;
grant execute on function public.admin_lms_reorder(text,uuid,uuid[]) to service_role;

-- Keep the paid-order access override and enrollment status in the same transaction.
create or replace function public.admin_lms_update_enrollment(p_enrollment_id uuid,p_status text,p_expires_at timestamptz,p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_enrollment crm_v2.enrollments%rowtype; v_email text; v_name text; v_phone text; v_slug text;
begin
  if p_status not in ('active','completed','paused','revoked') or p_status is null then raise exception 'invalid_enrollment_status'; end if;
  select * into strict v_enrollment from crm_v2.enrollments where id=p_enrollment_id for update;
  select lower(nullif(trim(c.email),'')), c.full_name, c.phone into v_email,v_name,v_phone from crm_v2.contacts c where c.id=v_enrollment.contact_id;
  v_email := coalesce(v_email,lower(nullif(trim(v_enrollment.metadata->>'student_email'),'')));
  select coalesce(nullif(v_enrollment.course_slug,''),c.slug) into v_slug from public.courses c where c.id=v_enrollment.course_id or c.slug=v_enrollment.course_slug limit 1;
  if v_slug is null then raise exception 'missing_enrollment_course'; end if;
  if p_status in ('paused','revoked') then
    if v_email is null then raise exception 'missing_email_for_effective_access_revoke'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_email || ':' || v_slug,0));
    update crm_v2.enrollments e set status=p_status, updated_at=now()
      where (e.course_slug=v_slug or e.course_id=v_enrollment.course_id)
      and (e.id=p_enrollment_id or e.contact_id=v_enrollment.contact_id
        or (v_enrollment.user_id is not null and e.user_id=v_enrollment.user_id)
        or lower(e.metadata->>'student_email')=v_email
        or exists(select 1 from crm_v2.contacts c where c.id=e.contact_id and lower(trim(c.email))=v_email));
    insert into public.leads(name,email,phone,source,message) values(v_name,v_email,v_phone,'admin-access-revoke:'||v_slug,'Thu quyền học từ quản trị khóa học.');
  elsif v_enrollment.status in ('paused','revoked') and p_expires_at is null and v_email is not null then
    insert into public.leads(name,email,phone,source,message) values(v_name,v_email,v_phone,'admin-access-grant:'||v_slug,'Khôi phục quyền học từ quản trị khóa học.');
  end if;
  update crm_v2.enrollments set status=p_status,expires_at=p_expires_at,user_id=coalesce(p_user_id,user_id),updated_at=now() where id=p_enrollment_id;
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.admin_lms_update_enrollment(uuid,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.admin_lms_update_enrollment(uuid,text,timestamptz,uuid) to service_role;

-- A multi-course admin access change either writes every enrollment/override or none.
create or replace function public.admin_lms_set_student_access(p_action text,p_course_slugs text[],p_email text,p_name text,p_phone text,p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_email text := lower(nullif(trim(p_email),'')); v_slug text; v_course public.courses%rowtype; v_result jsonb;
begin
  if p_action is null or p_action not in ('grant','revoke') or v_email is null
    or p_course_slugs is null or cardinality(p_course_slugs) not between 1 and 100
    or array_position(p_course_slugs,null) is not null
    or cardinality(p_course_slugs) <> (select count(distinct x) from unnest(p_course_slugs) x) then raise exception 'invalid_access_change'; end if;
  -- Serializes this student's manual batches; no student/order/Auth deletion.
  perform pg_advisory_xact_lock(hashtextextended(v_email,0));
  foreach v_slug in array p_course_slugs loop
    select * into strict v_course from public.courses where slug=v_slug;
    -- Email is the authoritative identity. A shared/reused phone must not merge accounts.
    v_result := public.crm_v2_lms_upsert_enrollment(v_course.id,v_slug,v_course.title,p_name,v_email,null,p_user_id,
      case when p_action='grant' then 'active' else 'revoked' end,null);
    if p_action='revoke' then
      perform public.admin_lms_update_enrollment((v_result->>'id')::uuid,'revoked',null,p_user_id);
    else
      update crm_v2.enrollments set expires_at=null,updated_at=now() where id=(v_result->>'id')::uuid;
      insert into public.leads(name,email,phone,source,message) values(p_name,v_email,p_phone,'admin-access-grant:'||v_slug,'Cấp quyền học từ quản trị học viên.');
    end if;
  end loop;
  return jsonb_build_object('ok',true,'changed',cardinality(p_course_slugs));
end;
$$;
revoke all on function public.admin_lms_set_student_access(text,text[],text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_lms_set_student_access(text,text[],text,text,text,uuid) to service_role;
