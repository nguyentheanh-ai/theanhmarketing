# CMS Guide

## Current CMS/Data Flow - 2026-05-13

The project is now a hybrid CMS:

- Supabase is the real data source when available.
- Static files in `data/` remain the fallback.
- Admin pages keep local backup tools so the site does not break if Supabase is empty or offline.

This is intentional. Do not remove fallback data until production auth, RLS, and migration flows are stable.

## Auth/Admin Guard Notes

- Supabase Auth client flow is now connected.
- `/dang-nhap` signs in through Supabase password auth.
- `/dang-ky` creates a Supabase Auth user and writes a lead to `leads`.
- Admin/student shells include a sign-out button.
- `/admin/*`, `/dashboard`, and `/learn/*` call server auth guards.
- These guarded route groups are forced dynamic so session checks run per request.
- Local `.env.local` currently keeps `AUTH_GUARD_ENABLED=false` to avoid locking development out.
- Before deployment:
  - set `AUTH_GUARD_ENABLED=true`
  - set `ADMIN_EMAILS=owner@example.com`
  - replace demo RLS policies with real role-based policies

## What Uses Supabase Now

- Courses:
  - Public read: `services/courseService.ts`
  - Admin write: `components/admin/course-editor.tsx`
  - Tables: `courses`, `course_modules`, `lessons`
- Resources:
  - Public read: `services/resourceService.ts`
  - Admin create form: `components/admin/resource-form.tsx`
  - Table: `resources`
- Leads:
  - Public write: `components/forms/lead-form.tsx`
  - Admin read: `services/leadService.ts`
  - Table: `leads`
- Testimonials:
  - Public read: `services/testimonialService.ts`
  - Table: `testimonials`
- Blog posts:
  - Public read: `services/blogService.ts`
  - Admin create/edit/delete: `components/admin/blog-post-manager.tsx`
  - Table: `blog_posts`
- Database health:
  - Page: `/admin/database`
  - Service: `services/databaseHealthService.ts`

## Working CMS Modules

- `/admin/cms`
  - control center with live counts and links
  - no longer contains fake unsaved edit forms
- `/admin/khoa-hoc`
  - manages courses/modules/lessons
  - writes to Supabase when saved
- `/admin/tai-lieu`
  - manages resources
  - create/edit/delete works for rows that exist in Supabase
  - fallback file resources are visible but cannot be deleted until imported into Supabase
- `/admin/bai-viet`
  - manages blog posts
  - create/edit/delete works for rows that exist in Supabase
  - fallback file posts are visible but cannot be deleted until imported into Supabase
- `/admin/leads`
  - reads leads from Supabase
  - can add manual leads from Facebook/Zalo
- `/admin/hoc-vien`
  - stores manual Facebook/Zalo student intake as Supabase leads
  - does not yet create Supabase Auth users or enrollments
- Brand settings:
  - managed in `/admin/cms`
  - table: `site_settings`
  - key: `brand`
  - controls header logo/name/CTA, footer contact/tagline, and optional homepage hero image/video

## Public Refresh Behavior

CMS-backed public pages are forced dynamic, so Supabase edits can appear on the
next request without rebuilding the site:

- `/`
- `/khoa-hoc`
- `/khoa-hoc/[slug]`
- `/blog`
- `/blog/[slug]`
- `/tai-lieu`
- `/hoc-vien`

## Current Course Editing Workflow

For normal course edits:

1. Open `/admin/khoa-hoc`.
2. Select or create a course.
3. Edit course fields:
   - title
   - slug
   - descriptions
   - price/original price
   - status
   - banner image URL
   - thumbnail image URL
   - preview video YouTube URL
   - CTA
   - duration
   - level
   - updated date
4. Add/edit modules.
5. Expand a module to add/edit lessons.
6. For lessons, set:
   - title
   - description
   - duration
   - YouTube URL
   - access type: `free_preview`, `enrolled_only`, or `locked`
   - sort order
7. Click the Supabase save action.
8. Check `/khoa-hoc/[slug]`.

The admin still stores a browser backup under localStorage key `tam-admin-courses`.

## YouTube Rules

Accepted inputs:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- existing embed URLs

The app converts them to YouTube embed URLs through the shared YouTube utility and stores/uses `embed_url` where relevant.

## Fallback Rules

If Supabase is unavailable, empty, or returns an error:

- course pages fallback to `data/courses.ts`
- resources fallback to `data/resources.ts`
- testimonials fallback to `data/testimonials.ts`
- leads admin can fallback to sample data

This keeps public UI online during database setup or migration.

## Legacy Static CMS Overview

The notes below describe the original static CMS/config approach. That static layer still matters as fallback data, but Supabase is now the first data source for courses/resources/leads/testimonials.

The goal is to let future developers or Codex sessions edit content without
digging into public UI components.

Most website content lives in `data/`.

The admin CMS page at `/admin/cms` displays the content groups and CMS health
checks. It is not a real database CMS yet.

## Main Content Files

### `data/site.ts`

Controls:

- Brand name
- Short brand name
- Logo mark
- Tagline
- Domain URL
- Phone/Zalo
- Email
- Main navigation
- Homepage stats
- FAQ

Edit this when changing global brand/contact/navigation content.

### `data/home.ts`

Controls homepage content:

- Hero badge
- Hero title lines
- Hero description
- Primary CTA
- Secondary CTA
- Problem section
- Ecosystem section
- Featured courses section
- Learning path
- Resources section
- Testimonials section
- Blog section
- FAQ title
- Final CTA

Use this to change homepage text without opening `app/page.tsx`.

### `data/pages.ts`

Controls page-level copy for:

- `/khoa-hoc`
- `/blog`
- `/tai-lieu`
- `/gioi-thieu`
- `/hoc-vien`
- `/lien-he`

Use this to change headings, descriptions, filters, notes and page-specific
intro copy.

### `data/courses.ts`

Controls courses, modules and lessons.

This is the most important file for the course platform.

### `data/resources.ts`

Controls resource library items.

### `data/blog.ts`

Controls blog posts.

### `data/testimonials.ts`

Controls testimonials and student feedback.

### `data/platform.ts`

Controls mock operational data:

- students
- leads
- orders
- metrics
- dashboard lessons

This is mostly for admin/student UI prototypes.

## Course Data Model

Each course has:

- `slug`
- `title`
- `eyebrow`
- `description`
- `shortDescription`
- `price`
- `originalPrice`
- `status`
- `statusLabel`
- `ctaText`
- `duration`
- `level`
- `updatedAt`
- `format`
- `bannerImageUrl`
- `thumbnailImageUrl`
- `videoPreviewUrl`
- `videoPreviewEmbedUrl`
- `thumbnailLabel`
- `previewNote`
- `topics`
- `audience`
- `outcomes`
- `benefits`
- `includes`
- `requirements`
- `modules`
- `instructor`
- `reviews`
- `relatedSlugs`

## Add A New Course

In `data/courses.ts`:

1. Copy an existing course object.
2. Change `slug`.
3. Change `title`.
4. Change descriptions.
5. Set price fields.
6. Set status:
   - `open`
   - `coming-soon`
   - `closed`
7. Set `statusLabel`.
8. Set `ctaText`.
9. Add modules and lessons.
10. Add related course slugs.

The route will automatically exist as:

```txt
/khoa-hoc/[slug]
```

Because `app/khoa-hoc/[slug]/page.tsx` uses `generateStaticParams`.

## Add A Module

Inside a course:

```ts
{
  id: "module-id",
  title: "Module title",
  description: "Module description",
  order: 1,
  lessons: []
}
```

Rules:

- `id` should be unique inside the course.
- `order` controls display order.
- Lessons are nested inside module.

## Add A Lesson

Inside `module.lessons`:

```ts
{
  id: "lesson-id",
  title: "Lesson title",
  duration: "18 phút",
  order: 1,
  youtubeUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
  embedUrl: "https://www.youtube.com/embed/VIDEO_ID",
  access: "free"
}
```

## Lesson Access

Use `access`:

- `free`: public visitors can see embedded video if `embedUrl` exists.
- `paid`: only enrolled/purchased students should access later.
- `locked`: public sees locked state and registration CTA.

Current public page behavior:

- `free` + `embedUrl`: iframe appears in curriculum.
- `paid`: message and CTA appear.
- `locked`: locked message and CTA appear.

## Convert YouTube URLs

Utility:

```ts
toYouTubeEmbedUrl(url)
```

Defined in:

```txt
lib/youtube.ts
```

Supports:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

Admin editor converts automatically when entering YouTube URLs.

## Change Banner / Thumbnail

Set:

```ts
bannerImageUrl: "https://..."
thumbnailImageUrl: "https://..."
```

Current behavior in `CourseMedia`:

1. If `videoPreviewEmbedUrl` exists, show video preview.
2. Else if `thumbnailImageUrl` or `bannerImageUrl` exists, show image.
3. Else show placeholder.

## Change Course CTA

Set:

```ts
ctaText: "Đăng ký khóa học"
```

Displayed in:

- `CoursePriceCard`

## Admin Mini CMS

### `/admin/cms`

Shows:

- CMS groups
- CMS health checks
- Mock form sections
- Content counts

### `/admin/khoa-hoc`

Uses:

```txt
components/admin/course-editor.tsx
```

Current behavior:

- Loads initial data from `data/courses.ts`.
- Saves edits to browser localStorage.
- localStorage key: `tam-admin-courses`.
- Can edit course fields.
- Can add/delete modules.
- Can expand/collapse modules.
- Can add/delete lessons.
- Can convert YouTube URLs to embed URLs.
- Can export the current local course dataset as JSON.
- Can import a previously exported course JSON file.
- Can reset the local course dataset back to `data/courses.ts`.

Important limitation:

Admin localStorage edits do not update the statically generated public course
page. This is expected until a backend is connected.

## Future Backend CMS

When Supabase is added:

- Keep the same component props.
- Replace static imports with server queries.
- Replace localStorage editor with database mutations.
- Keep public UI unchanged.

Recommended migration path:

1. Create Supabase schema from `docs/DATABASE_ARCHITECTURE.md`.
2. Seed database from `data/` files.
3. Add server functions for courses/modules/lessons.
4. Update public pages to read from database.
5. Update admin forms to write to database.
6. Add auth and route protection.
