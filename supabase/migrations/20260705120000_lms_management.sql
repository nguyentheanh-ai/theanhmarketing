create extension if not exists "pgcrypto";

alter table public.courses add column if not exists lms_status text not null default 'published';
alter table public.courses add column if not exists visibility text not null default 'enrolled';
alter table public.courses add column if not exists sort_order integer not null default 100;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_lms_status_check'
  ) then
    alter table public.courses
      add constraint courses_lms_status_check
      check (lms_status in ('draft', 'published', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'courses_visibility_check'
  ) then
    alter table public.courses
      add constraint courses_visibility_check
      check (visibility in ('public', 'private', 'enrolled'));
  end if;
end $$;

update public.courses
set lms_status = case
  when status = 'open' then 'published'
  when status = 'closed' then 'archived'
  else 'draft'
end
where lms_status is null
  or lms_status not in ('draft', 'published', 'archived');

alter table public.course_modules add column if not exists status text not null default 'published';
alter table public.course_modules add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'course_modules_status_check'
  ) then
    alter table public.course_modules
      add constraint course_modules_status_check
      check (status in ('draft', 'published', 'archived'));
  end if;
end $$;

alter table public.lessons add column if not exists course_id uuid references public.courses(id) on delete cascade;
alter table public.lessons add column if not exists slug text;
alter table public.lessons add column if not exists lesson_type text not null default 'video';
alter table public.lessons add column if not exists content text;
alter table public.lessons add column if not exists status text not null default 'published';
alter table public.lessons add column if not exists published_at timestamptz;
alter table public.lessons add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lessons_status_check'
  ) then
    alter table public.lessons
      add constraint lessons_status_check
      check (status in ('draft', 'published', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'lessons_lesson_type_check'
  ) then
    alter table public.lessons
      add constraint lessons_lesson_type_check
      check (lesson_type in ('video', 'text', 'file', 'link', 'live'));
  end if;
end $$;

update public.lessons l
set course_id = m.course_id
from public.course_modules m
where l.module_id = m.id
  and l.course_id is null;

update public.lessons
set slug = lower(regexp_replace(regexp_replace(coalesce(title, id::text), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
where slug is null or slug = '';

update public.lessons
set published_at = coalesce(published_at, created_at)
where status = 'published';

alter table public.lesson_resources add column if not exists type text not null default 'link';
alter table public.lesson_resources add column if not exists description text;
alter table public.lesson_resources add column if not exists sort_order integer not null default 1;
alter table public.lesson_resources add column if not exists updated_at timestamptz not null default now();

create table if not exists public.course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  title text not null,
  type text not null default 'link',
  url text not null,
  storage_path text,
  description text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type in ('link', 'file', 'worksheet', 'template', 'video', 'other'))
);

grant select on public.course_resources to anon, authenticated;
grant select, insert, update, delete on public.course_resources to service_role;

alter table public.course_resources enable row level security;

drop policy if exists "Published course resources are readable" on public.course_resources;
drop policy if exists "Published public course resources are readable" on public.course_resources;
create policy "Published public course resources are readable"
on public.course_resources for select
to anon, authenticated
using (
  exists (
    select 1 from public.courses c
    where c.id = course_resources.course_id
      and coalesce(c.lms_status, 'published') = 'published'
      and coalesce(c.visibility, 'enrolled') = 'public'
  )
);

create index if not exists idx_public_courses_lms_status on public.courses(lms_status, visibility);
create index if not exists idx_public_course_modules_course_position on public.course_modules(course_id, sort_order);
create index if not exists idx_public_lessons_course_module_position on public.lessons(course_id, module_id, sort_order);
create unique index if not exists idx_public_lessons_course_slug on public.lessons(course_id, slug) where course_id is not null and slug is not null;
create index if not exists idx_public_course_resources_course_position on public.course_resources(course_id, sort_order);
create index if not exists idx_public_course_resources_lesson on public.course_resources(lesson_id) where lesson_id is not null;

alter table crm_v2.enrollments add column if not exists user_id uuid;
alter table crm_v2.enrollments add column if not exists expires_at timestamptz;

update crm_v2.enrollments
set status = case
  when lower(coalesce(status, '')) in ('active', 'paused', 'completed', 'revoked') then lower(status)
  when lower(coalesce(status, '')) in ('pause', 'suspended', 'inactive') then 'paused'
  when lower(coalesce(status, '')) in ('complete', 'done', 'finished') then 'completed'
  when lower(coalesce(status, '')) in ('revoke', 'removed', 'cancelled', 'canceled', 'deleted') then 'revoked'
  else 'active'
end
where status is null
  or lower(status) not in ('active', 'paused', 'completed', 'revoked');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_v2_enrollments_status_check'
  ) then
    alter table crm_v2.enrollments
      add constraint crm_v2_enrollments_status_check
      check (status in ('active', 'paused', 'completed', 'revoked'));
  end if;
end $$;

alter table crm_v2.course_progress add column if not exists completed_at timestamptz;
alter table crm_v2.course_progress add column if not exists progress_seconds integer not null default 0;

create unique index if not exists idx_crm_v2_enrollments_contact_course_slug
  on crm_v2.enrollments(contact_id, course_slug)
  where contact_id is not null and course_slug is not null;

create unique index if not exists idx_crm_v2_enrollments_user_course_slug
  on crm_v2.enrollments(user_id, course_slug)
  where user_id is not null and course_slug is not null;

create unique index if not exists idx_crm_v2_course_progress_enrollment_lesson
  on crm_v2.course_progress(enrollment_id, lesson_id)
  where enrollment_id is not null and lesson_id is not null;

create index if not exists idx_crm_v2_course_progress_contact_course
  on crm_v2.course_progress(contact_id, course_id);

update crm_v2.enrollments e
set course_slug = coalesce(e.course_slug, e.metadata->>'course_slug')
where e.course_slug is null
  and e.metadata ? 'course_slug';

update crm_v2.course_progress
set completed_at = coalesce(completed_at, last_activity_at, updated_at)
where status = 'completed'
  and completed_at is null;
