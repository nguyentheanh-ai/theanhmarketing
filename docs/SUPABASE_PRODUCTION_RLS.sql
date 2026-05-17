-- Production RLS hardening for The Anh Marketing.
-- Run after creating real admin users in Supabase Auth.
-- Add admin emails to public.admin_users before enabling this in production.

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to anon, authenticated;

-- Example:
-- insert into public.admin_users (email)
-- values ('your-admin-email@example.com')
-- on conflict (email) do nothing;

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.lesson_comments enable row level security;
alter table public.resources enable row level security;
alter table public.leads enable row level security;
alter table public.orders enable row level security;
alter table public.testimonials enable row level security;
alter table public.blog_posts enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Anon manage courses demo" on public.courses;
drop policy if exists "Anon manage modules demo" on public.course_modules;
drop policy if exists "Anon manage lessons demo" on public.lessons;
drop policy if exists "Anon manage lesson resources demo" on public.lesson_resources;
drop policy if exists "Anon read lesson comments demo" on public.lesson_comments;
drop policy if exists "Anon manage resources demo" on public.resources;
drop policy if exists "Anon read leads demo" on public.leads;
drop policy if exists "Anon manage orders demo" on public.orders;
drop policy if exists "Authenticated read orders demo" on public.orders;
drop policy if exists "Anon manage testimonials demo" on public.testimonials;
drop policy if exists "Anon manage blog posts demo" on public.blog_posts;
drop policy if exists "Anon manage site settings demo" on public.site_settings;

drop policy if exists "Public read courses" on public.courses;
create policy "Public read courses"
on public.courses for select
to anon, authenticated
using (true);

drop policy if exists "Public read modules" on public.course_modules;
create policy "Public read modules"
on public.course_modules for select
to anon, authenticated
using (true);

drop policy if exists "Public read lessons" on public.lessons;
create policy "Public read lessons"
on public.lessons for select
to anon, authenticated
using (true);

drop policy if exists "Public read lesson resources" on public.lesson_resources;
create policy "Public read lesson resources"
on public.lesson_resources for select
to anon, authenticated
using (true);

drop policy if exists "Public read resources" on public.resources;
create policy "Public read resources"
on public.resources for select
to anon, authenticated
using (access_type = 'free');

drop policy if exists "Public read testimonials" on public.testimonials;
create policy "Public read testimonials"
on public.testimonials for select
to anon, authenticated
using (true);

drop policy if exists "Public read blog posts" on public.blog_posts;
create policy "Public read blog posts"
on public.blog_posts for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Public read site settings" on public.site_settings;
create policy "Public read site settings"
on public.site_settings for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage courses" on public.courses;
create policy "Admins manage courses"
on public.courses for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins manage modules" on public.course_modules;
create policy "Admins manage modules"
on public.course_modules for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins manage lessons" on public.lessons;
create policy "Admins manage lessons"
on public.lessons for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins manage lesson resources" on public.lesson_resources;
create policy "Admins manage lesson resources"
on public.lesson_resources for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Public insert lesson comments" on public.lesson_comments;
create policy "Public insert lesson comments"
on public.lesson_comments for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins read lesson comments" on public.lesson_comments;
create policy "Admins read lesson comments"
on public.lesson_comments for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Admins manage resources" on public.resources;
create policy "Admins manage resources"
on public.resources for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Public insert leads" on public.leads;
create policy "Public insert leads"
on public.leads for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins read leads" on public.leads;
create policy "Admins read leads"
on public.leads for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders"
on public.orders for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins manage testimonials" on public.testimonials;
create policy "Admins manage testimonials"
on public.testimonials for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins manage blog posts" on public.blog_posts;
create policy "Admins manage blog posts"
on public.blog_posts for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings"
on public.site_settings for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
