# Project State

## Handoff Snapshot - 2026-05-13

## Audit Snapshot - 2026-05-13

Latest verification after course landing animation and offer CMS work:

- `npm.cmd run lint`: pass.
- `npm.cmd run build`: pass.
- `npm.cmd run verify:routes`: pass, all checked routes returned 200.
- Browser console audit on key pages found 0 localhost warnings/errors:
  - `/`
  - `/khoa-hoc`
  - `/khoa-hoc/marketing-operation-management`
  - `/khoa-hoc/ai-fullstack-marketing-system`
  - `/blog`
  - `/dang-nhap`
  - `/admin/cms`
  - `/admin/khoa-hoc`
  - `/learn/facebook-ads-2026/lesson-1`

Local response timing sample on `http://localhost:3000`:

| Route | Status | HTML bytes | Time |
| --- | ---: | ---: | ---: |
| `/` | 200 | 154,276 | 977 ms |
| `/khoa-hoc` | 200 | 118,853 | 606 ms |
| `/khoa-hoc/marketing-operation-management` | 200 | 70,758 | 749 ms |
| `/khoa-hoc/ai-fullstack-marketing-system` | 200 | 72,449 | 692 ms |
| `/blog` | 200 | 64,209 | 355 ms |
| `/dang-nhap` | 200 | 60,674 | 347 ms |
| `/dashboard` | 200 | 56,168 | 518 ms |
| `/admin/cms` | 200 | 76,510 | 580 ms |
| `/admin/khoa-hoc` | 200 | 75,453 | 480 ms |
| `/learn/facebook-ads-2026/lesson-1` | 200 | 55,673 | 490 ms |

Performance and reliability warnings:

- Many public routes are currently `force-dynamic`, so they depend on server render and Supabase latency instead of static/CDN caching.
- Homepage HTML is the heaviest sample route. It pulls brand, courses, resources, testimonials, and blog data in one request.
- Course detail pages are now richer and use a large client component for interaction, animation, offer popup, accordion, and counters.
- Admin CMS performs several parallel Supabase reads. This is acceptable for admin, but slow Supabase/RLS queries will show up there first.
- Uploaded images and brand/course media currently render through plain `img`/video URLs. Next priority should include image sizing/optimization and avoiding oversized uploaded assets.
- YouTube iframes and preview media should stay lazy or conditional; do not add many always-loaded embeds to listing pages.
- Offer settings are stored in `site_settings` key `offer`; brand settings use key `brand`. Keep these keys stable.

Latest shipped UX/CMS changes:

- All course detail pages now use the course sales landing template inspired by `ai-fullstack-marketing-system`, with per-course content.
- Course stats animate up, including student count to `2.000+`.
- Course cards/content boxes have stronger hover animation with green accent, border shift, shadow, and card title color.
- Login/header UX was updated so authenticated users see `Khóa học của tôi` and sign-out behavior.
- Admin CMS has an offer popup manager for title, description, coupon code, discount label, CTA, and benefit lines.
- Course offer popup reads Supabase `site_settings.offer` with fallback defaults.
- Blog post editor has basic rich content support including image upload to URL and HTML insertion workflow.
- Brand CMS can upload/update logo and homepage hero media through the media upload workflow.

Recommended next-session plan:

1. Performance pass for public routes.
   - Decide which pages can move away from `force-dynamic`.
   - Add caching/revalidation around brand, offer, course, blog, resource, and testimonial reads.
   - Split the course sales page so non-interactive content can stay server-rendered while only accordion/counter/popup remain client-side.

2. Media optimization pass.
   - Add size guidance for uploaded logo/banner/thumbnail/hero media.
   - Consider `next/image` or a safe wrapper for known public media URLs.
   - Add lazy loading for non-critical images/iframes where missing.

3. Supabase/RLS hardening.
   - Replace demo anon write policies with admin-only writes.
   - Keep public reads for public content.
   - Verify `site_settings` write access only for admins before production.

4. UX QA pass on mobile.
   - Check course landing hero, offer popup, accordion, and admin CMS forms on small screens.
   - Tune hover-only effects with focus/tap states for mobile users.

5. Product flow pass.
   - Connect coupon/offer code to registration/order flow if discounts should affect checkout later.
   - Continue enrollment/progress model and admin student creation.

Project da chuyen tu mock/local-only sang kien truc **Supabase-first with mock fallback** cho cac phan quan trong. Public UI hien tai dang on va KHONG duoc redesign manh neu khong co yeu cau rieng.

### Supabase Status

- Supabase env da co trong `.env.local`.
- Package `@supabase/supabase-js` da cai.
- Client/server helpers:
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
- Health route/page:
  - `/admin/database`
  - `services/databaseHealthService.ts`
- Cac bang da duoc kiem tra hoat dong:
  - `courses`
  - `course_modules`
  - `lessons`
  - `resources`
  - `leads`
  - `testimonials`
- Trang thai du lieu Supabase da verify gan nhat:
  - `courses`: co khoa `facebook-ads-2026`
  - `course_modules`: co 3 modules mau
  - `lessons`: co 8 lessons mau
  - `resources`, `leads`, `testimonials`: bang da ton tai, co the rong
- CRUD test voi anon policies da pass:
  - tao/sua/xoa course
  - tao/sua module
  - tao/sua lesson
  - cascade delete lesson khi course bi xoa

### Current Data Flow

Public pages now read Supabase first, then fallback to static/mock data if env is missing, query fails, or data is empty.

- `/` reads courses/resources/testimonials through services.
- `/khoa-hoc` reads `getCourses()`.
- `/khoa-hoc/[slug]` reads `getCourseBySlug(slug)`.
- `/tai-lieu` reads `getResources()`.
- `/hoc-vien` reads `getTestimonials()`.
- `/lien-he` uses `LeadForm` and writes leads to Supabase.
- `/dashboard` reads courses/resources from services.
- `/learn/[course]/[lesson]` reads dynamic course/lesson data and supports legacy `lesson-1` URLs.

### Service Layer

- `services/courseService.ts`
  - Supabase-first course reads.
  - Joins nested `course_modules` and `lessons`.
  - Maps database rows into existing `Course` UI shape.
  - Converts numeric DB price to display text, for example `799000` -> `799.000đ`.
  - Falls back to `data/courses.ts`.
  - If Supabase course exists but lacks rich marketing fields/modules, merges safe mock details from matching static course.
- `services/resourceService.ts`
  - Reads `resources`.
  - Falls back to `data/resources.ts`.
- `services/leadService.ts`
  - Writes contact/lead form submissions to `leads`.
  - Admin lead listing falls back to sample data if needed.
- `services/testimonialService.ts`
  - Reads `testimonials`.
  - Falls back to `data/testimonials.ts`.
- `services/databaseHealthService.ts`
  - Checks table existence/count/errors for admin diagnostics.

### Admin Course System

- `/admin/khoa-hoc` uses `getCourses()` for initial data.
- `components/admin/course-editor.tsx` is still a client-side editor, but now supports Supabase persistence.
- Admin can:
  - add/edit/delete course
  - add/delete module
  - expand/collapse module lessons
  - add/delete lesson
  - edit sort order
  - enter YouTube URL and auto-convert embed URL
  - preview banner/thumbnail/video
  - save selected course/modules/lessons to Supabase
  - delete selected course from Supabase and local state
  - export/import/reset JSON backup
- Local browser backup still uses key `tam-admin-courses`.

### Verified Commands

Latest successful checks after Supabase CRUD was fixed:

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify:routes`

### Critical Production Gaps

- Supabase Auth UI/client flow has been added, but local guard is currently disabled with `AUTH_GUARD_ENABLED=false`.
- Admin, dashboard, and learn layouts now support request-time auth guards and are forced dynamic.
- Admin role check currently uses server env `ADMIN_EMAILS`. When `ADMIN_EMAILS` is empty, any authenticated user is treated as admin after `AUTH_GUARD_ENABLED=true`; configure this before production.
- Student dashboard and learning access are not tied to real enrollments yet.
- Current Supabase anon demo policies allow admin-like writes. Before deployment with real users, replace with Supabase Auth + role-based RLS.
- Orders/payments/enrollments/progress are still mock or planned.
- Blog remains static in `data/blog.ts`.
- Media upload/storage is not implemented; image fields currently use URLs.

### Do Not Change Without Explicit Request

- Do not redesign public UI.
- Do not replace the current design language.
- Do not remove mock fallback.
- Do not hard-code Supabase credentials in source files.
- Do not remove localStorage/import/export safety tools from course admin until real auth/admin flows are stable.

### Auth Foundation Added

- `@supabase/ssr` installed.
- `lib/auth/session.ts` added.
- `components/auth/login-form.tsx` added.
- `components/auth/register-form.tsx` added.
- `components/auth/sign-out-button.tsx` added.
- `/dang-nhap` now signs in through Supabase Auth.
- `/dang-ky` now signs up through Supabase Auth and writes a lead.
- `/admin/*`, `/dashboard`, and `/learn/*` call auth guards in layouts.
- Auth guards are controlled by:
  - `AUTH_GUARD_ENABLED`
  - `ADMIN_EMAILS`
- Current `.env.local` keeps `AUTH_GUARD_ENABLED=false` so local admin/demo pages remain accessible while the project is still being finished.

### CMS Functionality Added

- `/admin/cms` is now a real control center with live counts and links to working admin modules. The old unsaved demo inputs were removed.
- `/admin/tai-lieu` now uses `ResourceManager`:
  - create resource
  - edit resource
  - delete Supabase-backed resource
  - fallback resources remain read-only because they do not have Supabase ids
- `/admin/bai-viet` now uses `BlogPostManager`:
  - create blog post
  - edit blog post
  - delete Supabase-backed blog post
  - public `/blog`, `/blog/[slug]`, and homepage blog section now read `getBlogPosts()`
  - fallback blog posts remain read-only until copied into Supabase
- `/admin/leads` now uses `LeadManager`:
  - reads real leads from Supabase
  - can add manual leads from Facebook/Zalo
  - falls back to sample leads if the table is empty/unavailable
- `/admin/hoc-vien` no longer uses fake success buttons:
  - manual student intake now writes a Supabase lead with source `admin-student:*`
  - real account creation/enrollment is still pending service-role + `enrollments`
- New service:
  - `services/blogService.ts`
- New admin components:
  - `components/admin/blog-post-manager.tsx`
  - `components/admin/resource-manager.tsx`
  - `components/admin/testimonial-manager.tsx`
  - `components/admin/lead-manager.tsx`
  - `components/admin/student-intake-form.tsx`
- `blog_posts` was added to database setup docs and database health checks.
- Public CMS-backed pages are now request-time dynamic so Supabase edits can show without a rebuild:
  - `/`
  - `/khoa-hoc`
  - `/khoa-hoc/[slug]`
  - `/blog`
  - `/blog/[slug]`
  - `/tai-lieu`
  - `/hoc-vien`

### Latest UX/CMS Update

- Homepage content was repositioned from a Facebook Ads niche landing message to a broader Marketing education platform message:
  - courses
  - resources
  - blog/content hub
  - student dashboard
  - admin CMS
  - long-term platform operation
- Course curriculum now uses accordion modules:
  - each course module can expand/collapse
  - first module opens by default
  - free preview lessons still show YouTube embeds
  - locked/paid lessons still show access CTA
- Brand CMS added:
  - `services/brandService.ts`
  - `components/admin/brand-settings-manager.tsx`
  - `/admin/cms` can update brand name, short name, logo mark, logo image URL, tagline, phone, email, header CTA, homepage hero image and hero video
  - public header/footer/homepage read brand settings from Supabase first and fallback to `data/site.ts`
- `site_settings` added to database setup docs and health checks.
- Shared `ButtonLink` style was tightened with better hover/focus behavior.

### Latest Course/Auth Update

- Added 9 Marketing & AI courses to the platform catalog and seeded them into Supabase:
  - AI Fullstack Marketing System
  - Performance Marketing & Growth Ads
  - Content Traffic Engine
  - Marketing Data Analytics
  - Brandformance Foundation
  - Founder Marketing Blueprint
  - AI Content & Automation Workflow
  - Full Funnel Campaign Strategy
  - Marketing Operation Management
- Supabase `courses` count verified at 10 after seed.
- Course cards and price cards were lightened so the course area no longer relies heavily on black panels.
- Course descriptions now position the catalog around Marketing systems and AI ứng dụng, not only Facebook Ads.
- Lessons now support optional `resources` and `allowComments` in the course data model.
- Public curriculum displays lesson resources and a lesson comment form.
- Admin course editor allows adding lesson resources using `Title|URL` lines and toggling lesson comments.
- Google OAuth buttons added to login/register forms.
- `/admin/feedback` added for creating, editing, and deleting Supabase-backed testimonials.
- Email confirmation behavior is documented in `docs/DATABASE_SETUP.md`; disabling email confirmation must be done in Supabase Auth settings.

### Latest Supabase Price/Domain Readiness Check

- Supabase table health verified:
  - `courses`: 10 rows
  - `course_modules`: 3 rows
  - `lessons`: 8 rows
  - `lesson_resources`: 0 rows
  - `lesson_comments`: 0 rows
  - `resources`: 1 row
  - `leads`: 1 row
  - `testimonials`: 1 row
  - `blog_posts`: 0 rows
  - `site_settings`: 0 rows
- Price save path hardened:
  - admin course editor writes numeric prices first
  - if a Supabase project still uses text price columns, it retries with text values
  - public course service formats numeric strings like `1490000` into `1.490.000đ`
- Temporary course upsert/delete test passed with numeric `price` and `original_price`.
- Latest checks passed:
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - `npm.cmd run verify:routes`

### Latest Course Listing CTA/Text QA

- Homepage course section and `/khoa-hoc` course cards now show a clear `Học thử miễn phí` CTA for each course.
- Course detail hero and sticky price card also use `Học thử miễn phí` for the curriculum/free-preview anchor.
- `/khoa-hoc` page title changed to `Lộ trình học Marketing & Ứng dụng AI x5 hiệu suất công việc.`
- `services/courseService.ts` now normalizes broken Supabase/demo text for display:
  - course and lesson duration values like `4 gi?` / mojibake `giờ` render as `4 giờ`
  - broken level text renders as `Cơ bản đến thực chiến`
  - fallback/mock course timing is normalized too, so homepage/listing/detail stay consistent.
- Browser QA was run in the in-app browser against:
  - `/`
  - `/khoa-hoc`
  - `/khoa-hoc/marketing-operation-management`
- Latest checks passed after this update:
  - `npm.cmd run lint`
  - `npm.cmd run verify:routes`
  - `npm.cmd run build`

## Legacy Architecture Notes

The notes below describe the foundation before Supabase was connected. Keep them for historical context, but use the handoff snapshot above as the current source of truth.

The project is a Next.js App Router website using:

- Next.js 16
- React 19
- Tailwind CSS 4
- TypeScript strict mode
- Be Vietnam Pro via `next/font/google`
- Static config data in `data/`
- Mock platform data in `data/platform.ts`
- localStorage-based admin course editor

The project has evolved from a single homepage into a multi-route education
platform skeleton.

## Current Routes

### Public

- `/`
  - Platform homepage.
  - Reads much of its content from `data/home.ts`.
  - Uses courses/resources/blog/testimonials/FAQ data.

- `/gioi-thieu`
  - About page.
  - Reads page text from `data/pages.ts`.

- `/khoa-hoc`
  - Course listing page.
  - Renders multiple `CourseCard` components.
  - Reads courses from `data/courses.ts`.

- `/khoa-hoc/[slug]`
  - Dynamic course detail page.
  - Uses `generateStaticParams`.
  - Reads course by slug from `data/courses.ts`.
  - Renders `CourseDetail`.

- `/blog`
  - Blog listing page.
  - Reads page copy from `data/pages.ts`.
  - Renders posts from `data/blog.ts`.

- `/blog/[slug]`
  - Dynamic blog detail page.
  - Uses `generateStaticParams`.
  - Reads from `data/blog.ts`.

- `/tai-lieu`
  - Resource library.
  - Reads page copy from `data/pages.ts`.
  - Renders resources from `data/resources.ts`.

- `/hoc-vien`
  - Testimonials/case-study page.
  - Reads page copy from `data/pages.ts`.
  - Renders testimonials.

- `/lien-he`
  - Contact page.
  - Uses mailto-based static form.
  - Reads copy from `data/pages.ts` and contact info from `data/site.ts`.

### Auth/Student

- `/dang-ky`
  - Frontend registration form.
  - Allows selecting a course.
  - Mock behavior routes to `/dashboard`.
  - Marked noindex.

- `/dang-nhap`
  - Frontend login form.
  - Mock behavior routes to `/dashboard`.
  - Has link to admin demo.
  - Marked noindex.

- `/dashboard`
  - Student dashboard.
  - Uses mock student/course/lesson/resource data.
  - Shows current course, progress, notifications, lesson list, resources,
    profile and support CTA.
  - Marked noindex.

- `/learn/[course]/[lesson]`
  - Learning interface shell.
  - Resolves course and lesson from route params.
  - Renders lesson navigation from the selected course modules.
  - Shows embedded video when a lesson has an allowed embed URL.
  - Shows locked/empty-video states when access/media is not available.
  - Marked noindex.

### Admin

- `/admin`
  - Admin overview.
  - Metrics, recent orders, leads, students.
  - Marked noindex via `/admin/layout.tsx`.

- `/admin/cms`
  - Static CMS/config overview.
  - Shows editable content groups and form mockups.
  - Shows CMS validation result.

- `/admin/khoa-hoc`
  - Course editor.
  - Uses `CourseEditor`.
  - Uses localStorage key `tam-admin-courses`.
  - Can edit course fields, modules, lessons, YouTube URLs, access states.
  - Can add/delete modules.
  - Can add/delete lessons.
  - Modules can expand/collapse with arrow.
  - Can export current local CMS course data to JSON.
  - Can import a previously exported JSON course dataset.
  - Can reset local CMS course data back to static defaults.

- `/admin/hoc-vien`
  - Student management.
  - Includes manual student creation form for Facebook/Zalo students.
  - Allows selecting a course for manual assignment.
  - Shows mock student table.

- `/admin/don-hang`
  - Mock order management table.

- `/admin/bai-viet`
  - Mock blog management and post form.

- `/admin/tai-lieu`
  - Mock resource management and upload form.

- `/admin/leads`
  - Mock lead table and lead update form.

### SEO/System

- `/sitemap.xml`
  - Generated from static public routes, courses and blog posts.
  - Excludes private routes.

- `/robots.txt`
  - Allows public pages.
  - Disallows `/admin`, `/dashboard`, `/learn`, `/dang-nhap`, `/dang-ky`.

- `/opengraph-image`
  - Dynamic OG image generated with `ImageResponse`.

## Data Structure

### `data/site.ts`

Contains:

- Brand name
- Short name
- Logo mark
- Tagline
- Production URL
- Phone/email
- Navigation
- Platform stats
- FAQ

### `data/home.ts`

Contains homepage CMS copy:

- Hero badge/title/description
- CTA labels/hrefs
- Problem section
- Ecosystem section
- Featured courses section text
- Learning path
- Resources section text
- Testimonials section text
- Blog section text
- FAQ section text
- Final CTA

### `data/pages.ts`

Contains public page copy for:

- Course listing
- Blog listing
- Resource library
- About
- Students/case studies
- Contact

### `data/courses.ts`

Defines the full course system.

Types:

- `CourseStatus`: `open | coming-soon | closed`
- `LessonAccess`: `free | paid | locked`
- `CourseLesson`
- `CourseModule`
- `CourseReview`
- `CourseInstructor`
- `Course`

Important course fields:

- `slug`
- `title`
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
- `bannerImageUrl`
- `thumbnailImageUrl`
- `videoPreviewUrl`
- `videoPreviewEmbedUrl`
- `modules`
- `instructor`
- `reviews`
- `relatedSlugs`

Important lesson fields:

- `id`
- `title`
- `duration`
- `order`
- `youtubeUrl`
- `embedUrl`
- `access`

Helpers:

- `getCourseLessonCount(course)`
- `getRelatedCourses(course)`

### `data/resources.ts`

Resource library items:

- `slug`
- `title`
- `type`
- `access`
- `description`

### `data/blog.ts`

Blog posts:

- `slug`
- `title`
- `category`
- `readTime`
- `author`
- `excerpt`
- `content`

### `data/testimonials.ts`

Student testimonials:

- quote
- name
- title

### `data/platform.ts`

Mock operational data:

- students
- orders
- leads
- student lessons
- admin metrics

### `data/cms.ts`

CMS registry:

- `cms`
- `cmsSections`

It imports and exposes all editable static config groups.

## Component Structure

### Site Shell

- `components/site/header.tsx`
- `components/site/footer.tsx`
- `components/site/page-shell.tsx`

### UI Primitives

- `components/ui/button-link.tsx`
- `components/ui/section-heading.tsx`
- `components/ui/soft-card.tsx`
- `components/ui/stat-grid.tsx`
- `components/ui/media-placeholder.tsx`

### Content Cards

- `components/content/course-card.tsx`
- `components/content/resource-card.tsx`
- `components/content/blog-card.tsx`

### Course Components

- `components/course/course-detail.tsx`
- `components/course/course-media.tsx`
- `components/course/course-price-card.tsx`
- `components/course/course-tabs.tsx`
- `components/course/curriculum.tsx`
- `components/course/related-courses.tsx`

### Admin Components

- `components/app/admin-shell.tsx`
- `components/app/dashboard-shell.tsx`
- `components/admin/course-editor.tsx`

### SEO Components

- `components/seo/json-ld.tsx`

### Utility

- `lib/youtube.ts`
- `lib/cms-validation.ts`

## Course System

The course system is now data-driven.

Course listing:

- `/khoa-hoc`
- maps `courses` to `CourseCard`

Course detail:

- `/khoa-hoc/[slug]`
- resolves course by `slug`
- renders `CourseDetail`
- public UI reads all course fields from data
- curriculum is generated from `course.modules`
- related courses are generated from `relatedSlugs`

Course media:

- If `videoPreviewEmbedUrl` exists, render iframe.
- Else if `thumbnailImageUrl` or `bannerImageUrl` exists, render image background.
- Else render placeholder.

Lesson access behavior:

- `free`: public iframe is shown if `embedUrl` exists.
- `paid`: show message that lesson is only for purchased students.
- `locked`: show locked state and registration CTA.

## Admin Course Editor

`/admin/khoa-hoc` renders `CourseEditor`.

It uses localStorage:

- Key: `tam-admin-courses`
- Initial value: `data/courses.ts`
- Changes persist in the browser only.

Capabilities:

- Select course
- Edit title
- Edit slug
- Edit price/original price
- Edit status/status label
- Edit CTA text
- Edit duration/level/updated date
- Edit banner URL
- Edit thumbnail URL
- Edit YouTube preview URL
- Auto-convert YouTube URL to embed URL
- Preview embed video
- Add module
- Delete module
- Expand/collapse module with arrow
- Edit module order/title/description
- Add lesson
- Delete lesson
- Edit lesson order/title/duration/YouTube URL/access

Limitations:

- localStorage changes do not update static public pages after build.
- This is a frontend prototype for future database-backed admin.
- Real persistence requires Supabase/API.

## Dynamic Routes

Dynamic routes currently used:

- `/khoa-hoc/[slug]`
- `/blog/[slug]`
- `/learn/[course]/[lesson]`

Course and blog pages use `generateStaticParams`.

Learning route is dynamic/server-rendered on demand.

## Responsive Status

The public website is responsive:

- Desktop: max width layouts, two-column sections, sticky course price card.
- Tablet: cards stack logically.
- Mobile: header has horizontal nav, CTAs stack, cards become single column,
  course price card moves below media, curriculum is single column.

Admin pages:

- Desktop: sidebar nav.
- Mobile: sticky top nav with horizontal scrolling.

## Completed

- Multi-route public website
- Course listing
- Dynamic course detail
- Course modules and lessons
- Lesson access states
- Public preview video handling
- YouTube URL conversion utility
- Admin course editor with localStorage
- Delete module
- Delete lesson
- Expand/collapse module
- Export/import/reset JSON for local course CMS
- Static CMS registry
- Admin CMS page
- Student registration/login mock
- Student dashboard mock
- Dynamic learning page shell
- Previous/next lesson navigation
- Admin dashboard mock
- Sitemap/robots
- OG image
- JSON-LD for organization, website, course, article
- Build/lint passing

## In Progress / Partial

- Admin course editor is localStorage-only.
- Public course pages still read static config at build time.
- Student authentication is mocked.
- Enrollment is mocked.
- Lesson progress is mocked.
- Form submissions are mostly static/mailto/mock.
- Admin forms are not connected to backend.

## Known Issues

- Admin edits in localStorage are not reflected on public course pages unless a
  future backend/API is connected.
- No real authentication/authorization.
- `/admin`, `/dashboard`, `/learn` are UI prototypes, not secure product areas.
- Admin course JSON import performs only light client-side validation; real
  persistence still needs server-side validation.
- YouTube URLs are converted client-side in admin, but existing static data must
  include both `youtubeUrl` and `embedUrl`.
- Image fields exist but real image rendering currently supports URL background
  in `CourseMedia`; image upload/storage is not implemented.
- Terminal output on Windows may display Vietnamese mojibake, but files are
  UTF-8 and build passes.

## Technical Decisions

- Keep UI stable.
- Use static data config first.
- Use localStorage for admin prototypes.
- Avoid Supabase until schema and flows are stable.
- Avoid extra UI libraries.
- Use Tailwind utilities.
- Use reusable components.
- Keep public pages data-driven.
- Keep admin separate from public UI.

## Things Not To Change Without Approval

- Do not redesign public UI.
- Do not convert site back to a one-page landing page.
- Do not remove the data-driven course structure.
- Do not remove Be Vietnam Pro.
- Do not add loud gradients/MMO style.
- Do not make course detail pages isolated sales landing pages.
- Do not remove static CMS/data files unless replacing them with a real CMS/API.
- Do not expose `/admin` to production users without auth.
