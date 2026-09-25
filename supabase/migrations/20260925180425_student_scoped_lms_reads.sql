-- Called only by the server after verifying Auth. Never expose identity parameters to clients.
create or replace function public.student_lms_enrollments_scoped(
  p_user_id uuid, p_email text, p_course_slug text default null
) returns jsonb language sql stable security invoker set search_path = '' as $$
  with matching as materialized (
    select e.*, jsonb_build_object('email', c.email) as contacts
    from crm_v2.enrollments e
    left join crm_v2.contacts c on c.id = e.contact_id
    left join public.courses course on course.id = e.course_id
    where (e.user_id = p_user_id or (
      nullif(lower(trim(p_email)), '') is not null
      and lower(trim(coalesce(nullif(c.email, ''), e.metadata->>'student_email'))) = lower(trim(p_email))
    ))
    and (p_course_slug is null or coalesce(nullif(e.course_slug,''), nullif(e.metadata->>'course_slug',''), course.slug) = p_course_slug)
    and e.status in ('active', 'completed')
    and (e.expires_at is null or e.expires_at > now())
  )
  select jsonb_build_object(
    'lesson_counts', coalesce((select jsonb_object_agg(c.slug, (
      select count(*) from public.course_modules m join public.lessons l on l.module_id = m.id
      where m.course_id = c.id and coalesce(m.status,'published') = 'published'
      and coalesce(l.status,'published') = 'published'
      and (nullif(trim(l.youtube_url),'') is not null or nullif(trim(l.embed_url),'') is not null or nullif(trim(l.content),'') is not null)
    )) from public.courses c where (p_course_slug is null or c.slug = p_course_slug)), '{}'::jsonb),
    'enrollments', coalesce((select jsonb_agg(to_jsonb(m)) from matching m), '[]'::jsonb),
    'progress', coalesce((select jsonb_agg(jsonb_build_object(
      'enrollment_id', cp.enrollment_id, 'lesson_id', cp.lesson_id,
      'status', cp.status, 'completed_at', cp.completed_at
    )) from crm_v2.course_progress cp join matching m on m.id = cp.enrollment_id), '[]'::jsonb)
  );
$$;
revoke all on function public.student_lms_enrollments_scoped(uuid,text,text) from public, anon, authenticated;
grant execute on function public.student_lms_enrollments_scoped(uuid,text,text) to service_role;
