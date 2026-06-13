do $$
declare
  target_module_id uuid;
  target_course_id uuid;
  next_order integer;
begin
  select id into target_course_id
  from public.courses
  where slug = 'facebook-ads-2026';

  if target_course_id is null then
    raise exception 'Course facebook-ads-2026 not found';
  end if;

  select id into target_module_id
  from public.course_modules
  where course_id = target_course_id
  order by sort_order desc nulls last
  limit 1;

  if target_module_id is null then
    raise exception 'No module found for facebook-ads-2026';
  end if;

  select coalesce(max(sort_order), 0) + 1 into next_order
  from public.lessons
  where module_id = target_module_id;

  if not exists (
    select 1
    from public.lessons
    where module_id = target_module_id
      and (
        youtube_url in ('https://www.youtube.com/watch?v=auPdBJGY_pQ', 'https://youtu.be/auPdBJGY_pQ')
        or embed_url = 'https://www.youtube.com/embed/auPdBJGY_pQ'
        or title = 'Bài 17 - Hướng dẫn lên quảng cáo tin nhắn'
      )
  ) then
    insert into public.lessons (
      module_id,
      title,
      description,
      duration,
      youtube_url,
      embed_url,
      access_type,
      sort_order
    ) values (
      target_module_id,
      'Bài 17 - Hướng dẫn lên quảng cáo tin nhắn',
      '',
      'Video bài học',
      'https://www.youtube.com/watch?v=auPdBJGY_pQ',
      'https://www.youtube.com/embed/auPdBJGY_pQ',
      'enrolled_only',
      next_order
    );
  end if;

  update public.courses
  set lesson_count = greatest(coalesce(lesson_count, 0), (
    select count(*)
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    where m.course_id = target_course_id
  ))
  where id = target_course_id;
end $$;
