# Project Context

## Current Handoff Note - 2026-05-13

The project is now a Supabase-backed education platform prototype with mock fallback. It is still not a single landing page.

Current operating model:

- Keep the current public UI/design language.
- Use Supabase first for courses, modules, lessons, resources, leads, and testimonials.
- Keep static `data/` files as fallback so the website does not break if the database is empty or unavailable.
- Keep admin/course editing modular and data-driven.
- Do not redesign public pages unless the user explicitly asks.

The next major step is production hardening: Supabase Auth, role-based RLS, real enrollments, student progress, and media storage.

## Project Overview

This project is the website and education platform for **Thế Anh Marketing**.

It is not a one-off landing page. The intended product is a modern marketing
education platform that combines:

- Public brand website
- Course catalog
- Course detail pages
- Blog/content hub
- Resource library
- Mini LMS for students
- Admin mini-dashboard
- Static CMS/config layer
- Future database-backed CMS and learning system

The long-term direction is similar in spirit to a lightweight Lovable-style
builder for a single education brand: fast to operate, easy to update, and much
cheaper than building a full custom SaaS from day one.

## Brand Positioning

**Thế Anh Marketing** is positioned as a practical marketing education platform
for:

- Beginners learning marketing
- Shop owners and small business owners
- People who want to run Facebook Ads themselves
- Marketers who need a clear practical learning path
- Learners who want marketing that can be applied to real business, not just
  theory

Core positioning:

> Thế Anh Marketing helps learners study Facebook Ads and Online Marketing in a
> practical, easy-to-understand, structured way, with resources and real-world
> application.

## Product Type

The website is being built as a **modern education platform**, not a campaign
page.

It currently includes four product layers:

1. **Public Website**
   - Homepage
   - About
   - Course listing
   - Course detail
   - Blog
   - Resource library
   - Student feedback/case study page
   - Contact

2. **Course Platform**
   - Data-driven courses
   - Dynamic `/khoa-hoc/[slug]` course pages
   - Modules and lessons
   - Pricing fields
   - CTA fields
   - Course media fields
   - Related courses

3. **Mini LMS**
   - Student login/register screens
   - Student dashboard
   - Learning interface route
   - Lesson progress mock data
   - Lesson access states: free, paid, locked

4. **Admin Mini**
   - Admin dashboard
   - Course management
   - Student management
   - Manual student creation and course assignment
   - Orders
   - Leads
   - Resources
   - Blog posts
   - Static CMS preview

## Important Product Principle

This website **must not be treated as a single landing page**.

Do not collapse the architecture back into one page. Do not turn course detail
pages into isolated long-form sales pages. Keep them as part of the course
platform.

## UI Direction

The current UI direction has been approved and should be preserved:

- Minimal
- Premium
- Light cream/white background
- Editorial typography
- Large but clean headings
- Rounded black CTA buttons
- Soft white cards with subtle shadow
- Smooth but restrained animation
- Modern education platform feel

Avoid:

- Heavy redesigns
- MMO/course-selling visual language
- Loud gradients
- Brutalist borders
- Excessive animation
- Decorative clutter

## Sitemap

### Public Website

- `/` - Homepage
- `/gioi-thieu` - About Thế Anh Marketing
- `/khoa-hoc` - Course listing
- `/khoa-hoc/[slug]` - Dynamic course detail
- `/blog` - Blog listing
- `/blog/[slug]` - Dynamic blog detail
- `/tai-lieu` - Resource library
- `/hoc-vien` - Student feedback/case study
- `/lien-he` - Contact/lead form

### Auth and Student Area

- `/dang-ky` - Student registration
- `/dang-nhap` - Student login
- `/dashboard` - Student dashboard
- `/learn/[course]/[lesson]` - Learning interface

### Admin Area

- `/admin` - Admin dashboard
- `/admin/cms` - Static CMS/config preview
- `/admin/khoa-hoc` - Course management
- `/admin/hoc-vien` - Student management
- `/admin/don-hang` - Orders
- `/admin/bai-viet` - Blog post management
- `/admin/tai-lieu` - Resource management
- `/admin/leads` - Lead management

### SEO/System Routes

- `/sitemap.xml`
- `/robots.txt`
- `/opengraph-image`

## User Types

### Public Visitor

Can:

- Browse homepage
- View courses
- View course detail pages
- Read blog posts
- Browse resources
- View testimonials/case studies
- Contact the team
- Register interest

### Student

Can:

- Register/login
- View dashboard
- See enrolled course
- Track progress
- Access resources
- Continue lessons
- View notifications

Current implementation is frontend/mock. Real auth is not implemented yet.

### Admin

Can:

- View admin dashboard
- Manage courses in a localStorage editor
- Add/edit modules and lessons
- Delete modules and lessons
- Assign lesson access status
- Create student records manually
- Assign a course to students from Facebook/Zalo leads
- View mock leads/orders/resources/blog posts

Current admin is a frontend prototype. It must be protected before production
use with real users.

## User Flow

### Public Course Flow

1. Visitor lands on `/`.
2. Visitor clicks course CTA.
3. Visitor opens `/khoa-hoc`.
4. Visitor clicks a course card.
5. Visitor opens `/khoa-hoc/[slug]`.
6. Visitor views preview video/free lessons.
7. Visitor clicks registration CTA.
8. Visitor reaches `/dang-ky`.

### Student Flow

1. Student registers or is created manually by admin.
2. Student logs in.
3. Student lands on `/dashboard`.
4. Student continues learning via `/learn/[course]/[lesson]`.
5. Student tracks progress and resources.

### Admin Flow

1. Admin opens `/admin`.
2. Admin checks metrics/leads/orders.
3. Admin manages courses at `/admin/khoa-hoc`.
4. Admin manually creates students at `/admin/hoc-vien`.
5. Admin assigns courses to students.

## UX Philosophy

The UI should feel like a serious education platform:

- Calm and confident
- Clear hierarchy
- Low cognitive load
- No hard selling
- No clutter
- Modular and scalable

Course pages should teach and orient, not shout.

Admin pages should be utilitarian but still consistent with the brand style.

## Coding Philosophy

- Data-driven first.
- Keep public components reusable.
- Keep content in `data/` where possible.
- Avoid hard-coding content in components.
- Avoid introducing backend until schema is clear.
- Prefer simple static config now, database/API later.
- Keep UI stable while improving architecture.
- Build in phases.

## Data-Driven Architecture

Most content should live in:

- `data/site.ts`
- `data/home.ts`
- `data/pages.ts`
- `data/courses.ts`
- `data/resources.ts`
- `data/blog.ts`
- `data/testimonials.ts`
- `data/platform.ts`
- `data/cms.ts`

Components should render content from those configs.

The current CMS is static/config-based. Admin forms are currently mock or
localStorage-powered prototypes. Future work should replace static/localStorage
sources with Supabase/API calls without rewriting public UI components.
