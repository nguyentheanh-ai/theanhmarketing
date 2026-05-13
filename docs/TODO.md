# TODO

## HANDOFF PRIORITY - 2026-05-13

Current focus for the next session should be production hardening, not redesign.

1. Secure admin/student flows:
   - Supabase Auth UI/client flow is now added
   - request-time guards are wired for `/admin/*`, `/dashboard`, and `/learn/*`
   - next: configure `AUTH_GUARD_ENABLED=true` and `ADMIN_EMAILS`
   - next: replace demo anon write policies with role-based RLS

2. Finish real LMS data:
   - create real `users/profiles`
   - create `enrollments`
   - create `lesson_progress`
   - make lesson access depend on enrollment

3. Complete admin CMS depth:
   - resource edit/delete is now added
   - blog CMS is now added with Supabase fallback
   - testimonial edit/delete is now added
   - image/file upload via Supabase Storage

4. Deployment readiness:
   - move env vars to hosting provider
   - review `robots.txt` and noindex rules
   - final route smoke test
   - final mobile QA

## DONE

- Multi-route public website.
- Public homepage.
- Course listing page `/khoa-hoc`.
- Dynamic course detail `/khoa-hoc/[slug]`.
- Course cards link to detail pages.
- Course detail academy-style structure.
- Course media supports preview video, thumbnail, or placeholder.
- Course price card on desktop.
- Responsive mobile course detail.
- Course tabs: Tổng quan, Quyền lợi, Giáo trình, Giảng viên, Đánh giá.
- Curriculum generated from course data.
- Data-driven modules and lessons.
- Lesson access states:
  - `free`
  - `paid`
  - `locked`
- Free lessons can show public YouTube embed.
- Locked/paid lessons show CTA/register message.
- YouTube URL conversion utility.
- Admin course editor with localStorage.
- Admin course fields:
  - title
  - slug
  - description
  - price
  - original price
  - status
  - status label
  - CTA text
  - banner image URL
  - thumbnail image URL
  - video preview YouTube URL
  - duration
  - level
  - updated date
- Admin module management:
  - add module
  - delete module
  - edit order/title/description
  - show/collapse lessons with arrow
- Admin lesson management:
  - add lesson
  - delete lesson
  - edit order/title/duration/YouTube URL/access
- Admin local CMS safety tools:
  - export courses JSON
  - import courses JSON
  - reset courses to static defaults
- Manual student creation form in `/admin/hoc-vien`.
- Admin can assign selected course to manually created student.
- Student dashboard mock.
- Dynamic learning page shell using `/learn/[course]/[lesson]`.
- Learning page lesson navigation and previous/next controls.
- Blog/resources/about/students/contact pages.
- Static CMS registry.
- Admin CMS page.
- CMS validation.
- Sitemap and robots.
- OG image.
- JSON-LD.
- Build and lint passing.
- Supabase package installed.
- `.env.local` and `.env.example` created.
- Supabase helpers created:
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
- Supabase services created:
  - `services/courseService.ts`
  - `services/resourceService.ts`
  - `services/leadService.ts`
  - `services/testimonialService.ts`
  - `services/databaseHealthService.ts`
- Public pages now read Supabase first with fallback:
  - `/`
  - `/khoa-hoc`
  - `/khoa-hoc/[slug]`
  - `/tai-lieu`
  - `/hoc-vien`
  - `/lien-he`
  - `/dashboard`
  - `/learn/[course]/[lesson]`
- `/admin/database` added for Supabase health checks.
- `/admin/khoa-hoc` can save course/module/lesson data to Supabase.
- `/admin/khoa-hoc` can delete selected course from Supabase and local state.
- Supabase seed SQL created:
  - `docs/SUPABASE_SEED_FACEBOOK_ADS_2026.sql`
- Facebook Ads 2026 seed data verified in Supabase:
  - 1 course
  - 3 modules
  - 8 lessons
- Supabase CRUD test passed for:
  - course create/update/delete
  - module create/update
  - lesson create/update
- Supabase Auth foundation added:
  - `@supabase/ssr`
  - login form signs in with password
  - register form signs up and creates lead
  - sign out button in admin/student shells
  - auth guards in admin/dashboard/learn layouts
  - protected route segments forced dynamic
- CMS shell replaced with working modules:
  - `/admin/cms` now links to real CMS modules and shows live counts
  - `/admin/tai-lieu` can create/edit/delete Supabase resources
  - `/admin/bai-viet` can create/edit/delete Supabase blog posts
  - `/admin/leads` can add manual leads to Supabase
  - `/admin/hoc-vien` writes manual Facebook/Zalo student intake into Supabase leads
  - homepage and blog pages read blog posts through `services/blogService.ts`
- `blog_posts` table added to setup docs and database health checks.
- Homepage content repositioned as a broad Marketing education platform, not only Facebook Ads.
- Course curriculum modules now expand/collapse.
- Brand CMS added in `/admin/cms` with Supabase-backed `site_settings`.
- Header/footer/homepage can read brand logo/media/settings from Supabase fallback.
- 9 Marketing & AI courses added and seeded to Supabase.
- Course cards/price cards lightened.
- Lesson resources and lesson comments UI added.
- Admin course editor can manage lesson resource links and comment toggle.
- Google OAuth buttons added to login/register.
- `/admin/feedback` can create/edit/delete Supabase-backed testimonials.
- Homepage and `/khoa-hoc` course cards now show `Học thử miễn phí`.
- `/khoa-hoc` title changed to `Lộ trình học Marketing & Ứng dụng AI x5 hiệu suất công việc.`
- Course display text now normalizes broken duration/level values from Supabase/demo data, including `4 gi?` -> `4 giờ` and broken level text -> `Cơ bản đến thực chiến`.
- Supabase price handling hardened:
  - numeric-first save
  - text fallback retry
  - numeric string display formatting
- Supabase health and temp price upsert/delete verified.
- Latest successful checks:
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - `npm.cmd run verify:routes`

## IN PROGRESS

- Supabase-backed CMS architecture.
- Admin mini hardening.
- Real role-based access model.
- Student enrollment/progress model.
- Media storage/upload workflow.
- Production Supabase Auth configuration:
  - enable Google provider
  - configure deployed redirect URLs
  - decide whether to disable email confirmation

## NEXT PRIORITY

1. Performance pass for public pages.
   - Review `force-dynamic` usage on public routes.
   - Add caching/revalidation for Supabase-backed reads.
   - Reduce client JS on course landing pages by splitting interactive widgets.
   - Optimize uploaded media rendering and add size rules for admin uploads.

2. Add real auth.
   - Turn on `AUTH_GUARD_ENABLED=true` in production.
   - Set `ADMIN_EMAILS` before deploy.
   - Add database-backed profiles/roles if email allowlist is not enough.
   - Test Supabase email confirmation settings.

3. Replace demo Supabase policies.
   - Keep public reads.
   - Restrict writes to admins.
   - Restrict enrollments/progress to owner/admin.
   - Restrict `site_settings` writes for brand and offer settings.

4. Connect manual student creation to real database.
   - Current intake writes a lead.
   - Next: create user with service role.
   - Next: create enrollment.
   - Assign course
   - Send login info

5. Continue media storage hardening.
   - Banner image upload is available; add image dimension/size validation.
   - Thumbnail image upload is available; add optimization guidance.
   - Resource file upload still needs a managed workflow.

6. Improve learning page.
   - Respect real enrollment access rules
   - Save progress

7. Improve registration flow.
   - Create lead
   - Create pending order
   - Admin approval
   - Enrollment creation
   - Connect coupon/offer code to the order or lead record if discount logic is required.

## LATER IMPROVEMENTS

- Search/filter courses.
- Search/filter blog posts.
- Resource download tracking.
- Email automation.
- CRM pipeline for leads.
- Student notes and tags.
- Coupon system is partially started as editable offer/coupon display in `/admin/cms`; still needs real order/checkout discount logic.
- Payment integration.
- Community integration.
- Analytics dashboard.
- Rich text editor for blog/course content.
- Image optimization for uploaded media.
- Course completion certificates.
- Comments/questions per lesson.
- AI assistant for students.

## TECHNICAL DEBT

- Admin localStorage is not production persistence.
- Private routes are not actually protected.
- Mock forms do not write to backend.
- Public course pages do not read localStorage admin edits.
- Some text fields still exist in components and should gradually move to
  `data/pages.ts` or specific config files.
- Need robust image field strategy before adding many real assets.
- Need a migration script from `data/` files to Supabase.
- Need RLS policies before production auth.
- Need server-side validation for admin mutations.
- Need audit logging for admin changes.

## DO NOT DO NEXT

- Do not redesign the public UI.
- Do not add a heavy UI library.
- Do not build a complex SaaS backend before locking the schema.
- Do not replace course data structure with ad hoc fields.
- Do not remove current static config until backend replacement is ready.
