# Supabase Database Setup

## Verified Status - 2026-05-13

The user's Supabase schema has been set up and verified.

Current verified state:

- connection works from the Next.js app
- `courses` table is readable
- `facebook-ads-2026` course exists
- seeded modules and lessons exist
- CRUD test passed for courses/modules/lessons
- public course pages read Supabase first and fallback to mock data
- admin course editor can save/delete Supabase course data

Important: the live Supabase project currently uses numeric/integer values for `courses.price` and `courses.original_price`. The app already handles this by formatting numeric values for public UI and converting admin display prices back to numeric values before saving.

## Auth Environment

The app now includes Supabase Auth forms and server-side route guards.

Use these env vars:

```bash
AUTH_GUARD_ENABLED=false
ADMIN_EMAILS=
```

For local development, keep `AUTH_GUARD_ENABLED=false` if you still need open access to admin/demo pages.

For production, set:

```bash
AUTH_GUARD_ENABLED=true
ADMIN_EMAILS=your-admin-email@example.com
```

Important: the current anon policies used during setup are for prototype testing. Before real users use the site, replace write policies with Supabase Auth + role-based RLS.

## Auth Settings For Production

To avoid the confusing "Confirm your mail" step during student registration:

1. Open Supabase Dashboard.
2. Go to Authentication > Providers > Email.
3. Turn off **Confirm email** if you want students to log in immediately after signup.
4. Keep a strong password requirement and consider enabling email confirmation later when enrollment/payment flow is stricter.

Google login is now available in `/dang-nhap` and `/dang-ky`. To make it work:

1. Open Authentication > Providers > Google.
2. Enable Google provider.
3. Add Google OAuth Client ID and Client Secret.
4. Add the deployed domain to Authentication > URL Configuration:
   - Site URL: `https://your-domain.com`
   - Redirect URLs:
     - `https://your-domain.com/dashboard`
     - `https://your-domain.com/dang-nhap`
     - `http://localhost:3000/dashboard`

This project now supports Supabase as the real data source while keeping static
mock fallback data. If Supabase env vars are missing, tables are missing, queries
fail, or a table is empty, the public website falls back to the existing files in
`data/`.

## Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-anon-key
```

The repository also includes `.env.example` for deployment setup.

## How To Run SQL

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Create a new query.
4. Paste the SQL below.
5. Run it once.
6. Restart the local Next.js server.
7. Open `/khoa-hoc`, `/khoa-hoc/facebook-ads-2026`, `/tai-lieu`, and
   `/admin/khoa-hoc`.

## SQL Schema

```sql
create extension if not exists "pgcrypto";

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text,
  description text,
  price numeric,
  original_price numeric,
  status text not null default 'open'
    check (status in ('open', 'coming-soon', 'closed')),
  duration text,
  lesson_count integer default 0,
  level text,
  updated_at text,
  banner_image text,
  thumbnail_image text,
  preview_video_url text,
  cta_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  description text,
  duration text,
  youtube_url text,
  embed_url text,
  access_type text not null default 'locked'
    check (access_type in ('free_preview', 'enrolled_only', 'locked')),
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null,
  student_name text not null,
  email text,
  content text not null,
  status text not null default 'new'
    check (status in ('new', 'answered', 'hidden')),
  created_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  thumbnail text,
  file_url text,
  access_type text not null default 'free'
    check (access_type in ('free', 'paid', 'enrolled_only')),
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  message text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  content text,
  avatar text,
  rating integer default 5 check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text,
  read_time text,
  author text,
  excerpt text,
  content text,
  status text not null default 'published'
    check (status in ('published', 'draft')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists courses_slug_idx on public.courses(slug);
create index if not exists course_modules_course_id_idx on public.course_modules(course_id);
create index if not exists lessons_module_id_idx on public.lessons(module_id);
create index if not exists lesson_resources_lesson_id_idx on public.lesson_resources(lesson_id);
create index if not exists lesson_comments_lesson_id_idx on public.lesson_comments(lesson_id);
create index if not exists blog_posts_slug_idx on public.blog_posts(slug);
```

## RLS Policies For Current Demo Admin

The current admin does not have real authentication yet. These policies allow
public reads, public lead creation, and anon write access for course admin during
the prototype phase.

Before production, replace anon write policies with authenticated admin-only
policies.

```sql
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.lesson_comments enable row level security;
alter table public.resources enable row level security;
alter table public.leads enable row level security;
alter table public.testimonials enable row level security;
alter table public.blog_posts enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Public read courses" on public.courses;
create policy "Public read courses"
on public.courses for select
to anon, authenticated
using (true);

drop policy if exists "Anon manage courses demo" on public.courses;
create policy "Anon manage courses demo"
on public.courses for all
to anon
using (true)
with check (true);

drop policy if exists "Public read modules" on public.course_modules;
create policy "Public read modules"
on public.course_modules for select
to anon, authenticated
using (true);

drop policy if exists "Anon manage modules demo" on public.course_modules;
create policy "Anon manage modules demo"
on public.course_modules for all
to anon
using (true)
with check (true);

drop policy if exists "Public read lessons" on public.lessons;
create policy "Public read lessons"
on public.lessons for select
to anon, authenticated
using (true);

drop policy if exists "Anon manage lessons demo" on public.lessons;
create policy "Anon manage lessons demo"
on public.lessons for all
to anon
using (true)
with check (true);

drop policy if exists "Public read lesson resources" on public.lesson_resources;
create policy "Public read lesson resources"
on public.lesson_resources for select
to anon, authenticated
using (true);

drop policy if exists "Anon manage lesson resources demo" on public.lesson_resources;
create policy "Anon manage lesson resources demo"
on public.lesson_resources for all
to anon
using (true)
with check (true);

drop policy if exists "Anon insert lesson comments" on public.lesson_comments;
create policy "Anon insert lesson comments"
on public.lesson_comments for insert
to anon, authenticated
with check (true);

drop policy if exists "Anon read lesson comments demo" on public.lesson_comments;
create policy "Anon read lesson comments demo"
on public.lesson_comments for select
to anon
using (true);

drop policy if exists "Public read resources" on public.resources;
create policy "Public read resources"
on public.resources for select
to anon, authenticated
using (true);

drop policy if exists "Anon manage resources demo" on public.resources;
create policy "Anon manage resources demo"
on public.resources for all
to anon
using (true)
with check (true);

drop policy if exists "Anon insert leads" on public.leads;
create policy "Anon insert leads"
on public.leads for insert
to anon
with check (true);

drop policy if exists "Anon read leads demo" on public.leads;
create policy "Anon read leads demo"
on public.leads for select
to anon
using (true);

drop policy if exists "Public read testimonials" on public.testimonials;
create policy "Public read testimonials"
on public.testimonials for select
to anon, authenticated
using (true);

drop policy if exists "Anon manage testimonials demo" on public.testimonials;
create policy "Anon manage testimonials demo"
on public.testimonials for all
to anon
using (true)
with check (true);

drop policy if exists "Public read blog posts" on public.blog_posts;
create policy "Public read blog posts"
on public.blog_posts for select
to anon, authenticated
using (true);

drop policy if exists "Anon manage blog posts demo" on public.blog_posts;
create policy "Anon manage blog posts demo"
on public.blog_posts for all
to anon
using (true)
with check (true);

drop policy if exists "Public read site settings" on public.site_settings;
create policy "Public read site settings"
on public.site_settings for select
to anon, authenticated
using (true);

drop policy if exists "Anon manage site settings demo" on public.site_settings;
create policy "Anon manage site settings demo"
on public.site_settings for all
to anon
using (true)
with check (true);
```

## Optional Seed Data

```sql
insert into public.courses (
  title,
  slug,
  short_description,
  description,
  price,
  original_price,
  status,
  duration,
  lesson_count,
  level,
  updated_at,
  cta_text
) values (
  'Facebook Ads 2026',
  'facebook-ads-2026',
  'Tự chạy quảng cáo, đọc dữ liệu và tối ưu chiến dịch Facebook Ads theo lộ trình thực chiến.',
  'Học cách tự triển khai Facebook Ads bài bản, hiểu đúng tư duy Marketing & Kinh doanh Online, biết đọc dữ liệu và tối ưu quảng cáo theo tình huống thực tế.',
  '799.000đ',
  '3.995.000đ',
  'open',
  '4 giờ',
  1,
  'Người mới đến thực chiến',
  '12/04/2026',
  'Đăng ký khóa học'
) on conflict (slug) do nothing;

insert into public.resources (title, description, access_type)
values
  ('Checklist audit tài khoản quảng cáo', 'Danh sách câu hỏi rà soát nhanh tài khoản, chiến dịch, tracking và creative.', 'free')
on conflict do nothing;

insert into public.testimonials (student_name, content, rating)
values
  ('Minh Anh', 'Mình hiểu rõ hơn vì sao quảng cáo không hiệu quả và biết cách sửa từng phần.', 5)
on conflict do nothing;
```

## Test Checklist

- `npm run lint`
- `npm run build`
- Start the site and run `npm run verify:routes`
- Open `/khoa-hoc`; it should read Supabase courses if rows exist.
- Empty or break the table name temporarily; the page should still render mock data.
- Open `/admin/khoa-hoc`, edit a course, then click `Lưu Supabase`.
- Add a YouTube URL using `youtube.com/watch?v=` or `youtu.be/`; the embed URL is generated automatically.
- Open `/lien-he`, submit the form, then check `public.leads`.

## Production Notes

- Do not keep anon write policies in production.
- Add Supabase Auth and admin roles before real admin usage.
- Move admin mutations behind server actions or route handlers when auth is ready.
- Keep the fallback system until enough production data exists.
