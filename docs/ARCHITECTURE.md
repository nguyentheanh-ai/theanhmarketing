# The Anh Marketing Admin Platform

## Hướng Nền

Stack chính:

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- Refine Core cho resource/CRUD layer
- TanStack Query cho cache và optimistic update
- TanStack Table + Virtual cho bảng dữ liệu lớn
- Zustand cho UI state nhẹ
- Recharts cho dashboard
- Supabase Postgres/Auth/Realtime/Storage/Edge Functions

## Module Vận Hành

- CRM/Data: leads, orders, click events, activity logs
- LMS: courses, modules, lessons, student access
- Marketing Automation: email templates, automation flows, automation runs
- Growth analytics: revenue, campaign, landing page, CTA, payment conversion
- Settings: SMTP, domain, tracking pixel, payment gateway, API, backup

## Data Cutover

- Existing website data stays in the current Supabase tables during cutover.
- The new admin must not replace `courses`, `course_modules`, `lessons`, `leads`, `orders`, or `site_settings`.
- Student access remains derived from paid orders and `admin-student:*` leads until a deliberate enrollment migration is designed.
- Facebook Pixel remains in `site_settings` with `key = 'marketing'`.
- The new app accepts either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the existing website `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- See `docs/LEGACY_MIGRATION_GUARDRAILS.md` for the exact preservation checklist.

## Nguyên Tắc Scale

- Không load toàn bộ bảng lớn: table dùng server pagination, filter, sort, cursor.
- Realtime chỉ subscribe phần cần vận hành: lead mới, payment success, click event nóng.
- Query key chia theo module và filter để cache không bị lẫn.
- Tác vụ nặng như export, email batch, heatmap aggregation chạy qua queue/Edge Function.
- Audit log ghi old_value/new_value bằng JSONB để truy vết và restore.

## Supabase Bảo Mật

- RLS bật cho bảng public.
- Public tracking nên đi qua `/api/track` để service role nằm server-side.
- Các bảng admin mới là additive; production cần gắn policy vào admin role trước khi mở cho toàn đội.
