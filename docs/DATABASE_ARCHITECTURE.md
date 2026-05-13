# Database Architecture

## Current Verified Database State - 2026-05-13

Supabase is now active for the current project. The architecture is no longer future-only.

### Active Tables

- `courses`
- `course_modules`
- `lessons`
- `resources`
- `leads`
- `testimonials`
- `blog_posts`

### Verified Data

- `courses` contains the seeded `facebook-ads-2026` course.
- `course_modules` contains 3 modules for the seeded course.
- `lessons` contains 8 lessons for the seeded course.
- `resources`, `leads`, and `testimonials` exist and may be empty.
- `blog_posts` is now part of the CMS setup. If this table has not been run in Supabase yet, public blog pages fallback to `data/blog.ts`.

### Verified CRUD

Anon CRUD was tested successfully after demo policies were applied:

- course create/update/delete
- module create/update
- lesson create/update
- cascade delete from course to modules/lessons

This is acceptable for local/admin prototype testing only. Before public production use, replace demo write policies with Supabase Auth and role-based RLS.

### Current Application Data Layer

The app uses a service layer:

- `services/courseService.ts`
- `services/resourceService.ts`
- `services/leadService.ts`
- `services/testimonialService.ts`
- `services/databaseHealthService.ts`

Public pages read Supabase first and fallback to static config/mock data.

### Important Schema Note

The currently verified Supabase project stores `courses.price` and `courses.original_price` as numeric/integer values. The UI still displays formatted Vietnamese prices, so `services/courseService.ts` maps numbers like `799000` to `799.000đ`, and the admin converts display strings back to numeric values before upsert.

Keep this numeric database shape unless there is a deliberate migration.

## Legacy State Notes

The notes below describe the earlier static/localStorage phase. They are kept for context only. The current project now has a verified Supabase integration as described above.

Current data layers:

1. **Static config**
   - `data/site.ts`
   - `data/home.ts`
   - `data/pages.ts`
   - `data/courses.ts`
   - `data/resources.ts`
   - `data/blog.ts`
   - `data/testimonials.ts`
   - `data/platform.ts`
   - `data/cms.ts`

2. **localStorage**
   - Used only by `/admin/khoa-hoc`
   - Key: `tam-admin-courses`
   - Stores edited course/module/lesson data in the browser

3. **Mock data**
   - Students, orders, leads, metrics in `data/platform.ts`

This is intentional. The project is currently validating product structure and
admin UX before introducing Supabase.

## Future Direction

Recommended backend:

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage for images/resources
- Row Level Security for admin/student access

## Core Entities

### users

Represents auth users.

Fields:

- `id uuid primary key`
- `email text unique not null`
- `full_name text`
- `phone text`
- `role text` - `student`, `admin`
- `avatar_url text`
- `created_at timestamptz`
- `updated_at timestamptz`

### courses

Represents a course.

Fields:

- `id uuid primary key`
- `slug text unique not null`
- `title text not null`
- `eyebrow text`
- `description text`
- `short_description text`
- `price numeric`
- `price_label text`
- `original_price numeric`
- `original_price_label text`
- `status text` - `open`, `coming-soon`, `closed`
- `status_label text`
- `cta_text text`
- `duration text`
- `level text`
- `updated_at_label text`
- `format text`
- `banner_image_url text`
- `thumbnail_image_url text`
- `video_preview_url text`
- `video_preview_embed_url text`
- `thumbnail_label text`
- `preview_note text`
- `topics text[]`
- `audience text[]`
- `outcomes text[]`
- `benefits text[]`
- `includes text[]`
- `requirements text[]`
- `instructor_id uuid references instructors(id)`
- `published boolean`
- `sort_order integer`
- `created_at timestamptz`
- `updated_at timestamptz`

### instructors

Fields:

- `id uuid primary key`
- `name text not null`
- `title text`
- `bio text`
- `avatar_url text`
- `created_at timestamptz`
- `updated_at timestamptz`

### modules

Represents course modules.

Fields:

- `id uuid primary key`
- `course_id uuid references courses(id) on delete cascade`
- `title text not null`
- `description text`
- `sort_order integer not null`
- `created_at timestamptz`
- `updated_at timestamptz`

### lessons

Represents lessons inside modules.

Fields:

- `id uuid primary key`
- `module_id uuid references modules(id) on delete cascade`
- `course_id uuid references courses(id) on delete cascade`
- `title text not null`
- `duration text`
- `youtube_url text`
- `embed_url text`
- `access text` - `free`, `paid`, `locked`
- `sort_order integer not null`
- `content text`
- `resource_url text`
- `created_at timestamptz`
- `updated_at timestamptz`

### enrollments

Represents which student owns which course.

Fields:

- `id uuid primary key`
- `user_id uuid references users(id) on delete cascade`
- `course_id uuid references courses(id) on delete cascade`
- `status text` - `active`, `pending`, `cancelled`, `expired`
- `source text` - `website`, `facebook`, `zalo`, `manual`
- `created_by uuid references users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

### lesson_progress

Tracks student lesson progress.

Fields:

- `id uuid primary key`
- `user_id uuid references users(id) on delete cascade`
- `course_id uuid references courses(id) on delete cascade`
- `lesson_id uuid references lessons(id) on delete cascade`
- `status text` - `not_started`, `in_progress`, `completed`
- `completed_at timestamptz`
- `last_watched_seconds integer`
- `created_at timestamptz`
- `updated_at timestamptz`

### resources

Represents downloadable/lead magnet resources.

Fields:

- `id uuid primary key`
- `slug text unique not null`
- `title text not null`
- `type text`
- `access text` - `free`, `paid`, `student-only`
- `description text`
- `file_url text`
- `thumbnail_url text`
- `published boolean`
- `download_count integer`
- `created_at timestamptz`
- `updated_at timestamptz`

### testimonials

Fields:

- `id uuid primary key`
- `name text not null`
- `role text`
- `quote text not null`
- `avatar_url text`
- `course_id uuid references courses(id)`
- `published boolean`
- `sort_order integer`
- `created_at timestamptz`
- `updated_at timestamptz`

### blog_posts

Fields:

- `id uuid primary key`
- `slug text unique not null`
- `title text not null`
- `category text`
- `read_time text`
- `author_id uuid references users(id)`
- `excerpt text`
- `content text`
- `seo_title text`
- `seo_description text`
- `cover_image_url text`
- `published boolean`
- `published_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

### leads

Represents form submissions or manual leads.

Fields:

- `id uuid primary key`
- `name text`
- `email text`
- `phone text`
- `need text`
- `source text`
- `status text` - `new`, `call-back`, `consulted`, `registered`, `lost`
- `notes text`
- `assigned_to uuid references users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

### orders

Represents purchases/payments.

Fields:

- `id uuid primary key`
- `user_id uuid references users(id)`
- `course_id uuid references courses(id)`
- `lead_id uuid references leads(id)`
- `amount numeric`
- `currency text default 'VND'`
- `status text` - `pending`, `paid`, `failed`, `refunded`
- `payment_method text`
- `coupon_id uuid references coupons(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

### coupons

Fields:

- `id uuid primary key`
- `code text unique not null`
- `type text` - `fixed`, `percent`
- `value numeric`
- `active boolean`
- `starts_at timestamptz`
- `ends_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

## Relationships

- One instructor has many courses.
- One course has many modules.
- One module has many lessons.
- One course has many lessons through modules.
- One user can have many enrollments.
- One enrollment belongs to one user and one course.
- One user can have many lesson progress records.
- One course can have many testimonials.
- One lead can become one user and one order.
- One order can create one enrollment after payment/manual approval.

## Access Rules

### Public

Can read:

- Published courses
- Free lessons
- Published blog posts
- Published resources with `access = free`
- Published testimonials

### Student

Can read:

- Their own profile
- Their own enrollments
- Lessons in courses they are enrolled in
- Student-only resources for enrolled courses
- Their own lesson progress

Can update:

- Their own profile
- Their own lesson progress

### Admin

Can create/update/delete:

- Courses
- Modules
- Lessons
- Resources
- Blog posts
- Testimonials
- Leads
- Orders
- Enrollments
- Student notes/status

## Migration Strategy

Phase 1:

- Keep static config.
- Finalize UX and schema.

Phase 2:

- Create Supabase schema.
- Seed database from current `data/` files.
- Replace read-only data imports with server functions/API.

Phase 3:

- Add auth.
- Protect `/admin`, `/dashboard`, `/learn`.
- Connect admin forms to database mutations.

Phase 4:

- Add storage uploads.
- Add analytics and CRM automation.
- Add email notifications.
