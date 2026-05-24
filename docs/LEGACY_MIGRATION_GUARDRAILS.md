# Legacy Migration Guardrails

Source website inspected: `E:\TheAnh-Business-Workspace\02_Website\landing-page`.

## Non-Negotiables

- Do not recreate, rename, truncate, or reshape the existing production tables used by the current website admin.
- Keep course, student access, order, and tracking logic compatible with the old services.
- Treat the new admin as a premium UI and analytics layer first. Data ownership stays with the existing Supabase tables until a deliberate migration is planned and backed up.

## Existing Source Of Truth

| Area | Existing contract to preserve |
| --- | --- |
| Courses | `courses`, `course_modules`, `lessons`, `lesson_resources`; `courses.price` and `courses.original_price` are numeric/integer values in the verified project. |
| Leads | `leads` with `name`, `phone`, `email`, `message`, `source`, `created_at`; manual student intake uses `source` starting with `admin-student:`. |
| Orders/payments | `orders` with `order_code`, `student_name`, `email`, `phone`, `course_slug`, `course_title`, `amount`, `status`, `paid_at`, `order_items` when available. |
| Student access | Derived from paid orders plus admin-student leads in `services/studentAccessService.ts`; do not switch to a new `students` source of truth silently. |
| Facebook Pixel | `site_settings` row where `key = 'marketing'`, JSON fields `trackingEnabled`, `facebookPixelEnabled`, `facebookPixelId`. |
| Branding | Website logo copied from `public/brand/ta-logo.svg` and mark from `public/brand/ta-mark.svg`. |

## Additive Migration Policy

The migration in `supabase/migrations/20260524170500_admin_growth_os_additive.sql` only adds tables for new admin capabilities:

- `landing_pages`
- `click_events`
- `email_templates`
- `automation_flows`
- `automation_runs`
- `coupons`
- `activity_logs`
- `app_settings`

It intentionally does not create or alter `courses`, `course_modules`, `lessons`, `leads`, `orders`, or `site_settings`.

## Cutover Checklist

1. Back up Supabase before running any migration.
2. Run the additive migration in staging first.
3. Verify old website routes still read courses, orders, student dashboard, and marketing scripts.
4. Verify Facebook Pixel is still read from `site_settings.key = 'marketing'`.
5. Verify new admin reads the same Supabase URL and public anon/publishable key.
6. Only after a data-diff check passes, point operators from old admin screens to the new admin UI.

## Validation Queries

Use row counts before and after. Counts for existing tables must not decrease.

```sql
select 'courses' as table_name, count(*) from public.courses
union all select 'course_modules', count(*) from public.course_modules
union all select 'lessons', count(*) from public.lessons
union all select 'leads', count(*) from public.leads
union all select 'orders', count(*) from public.orders
union all select 'site_settings', count(*) from public.site_settings;
```

Check Pixel config without exposing the value:

```sql
select
  key,
  value ? 'facebookPixelId' as has_pixel_id,
  value ->> 'facebookPixelEnabled' as pixel_enabled,
  value ->> 'trackingEnabled' as tracking_enabled
from public.site_settings
where key = 'marketing';
```
