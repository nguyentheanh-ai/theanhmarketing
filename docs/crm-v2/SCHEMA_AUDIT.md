# CRM v2 Schema Audit

Date: 2026-06-15

Scope: initial safe audit from the website codebase, existing SQL contract files, and admin services before adding any CRM v2 migration. No production table was modified during this audit.

## Source Files Reviewed

- `services/leadService.ts`
- `services/orderService.ts`
- `services/studentAccessService.ts`
- `services/activityLogService.ts`
- `services/emailLogService.ts`
- `services/leadActivityService.ts`
- `services/leadNoteService.ts`
- `services/adminDataService.ts`
- `docs/SUPABASE_ADMIN_LEADS_FLOW.sql`
- `docs/SUPABASE_ADMIN_OPERATIONS.sql`
- `docs/SUPABASE_ACTIVITY_LOGS.sql`
- `docs/SUPABASE_TRACKING_ATTRIBUTION.sql`
- `docs/SUPABASE_PRODUCTION_RLS.sql`
- `docs/DATABASE_ARCHITECTURE.md`
- `docs/SECURITY_HARDENING.md`

## Existing Legacy Tables And Data Contracts

| Legacy object | Current role | CRM v2 treatment |
| --- | --- | --- |
| `public.leads` | Lead capture, admin sale status, Google Sheet metadata, soft-delete markers | Backfill into `crm_v2.contacts`, `crm_v2.leads`, `crm_v2.crm_events`; remain source for old CRM. |
| `public.orders` | Payment/order source of truth, pending/paid/refunded status, SePay order code | Backfill read model into `crm_v2.orders` and `crm_v2.payments`; ownership stays in `public.orders`. |
| `public.lead_activities` | Admin lead timeline and operational activity | Backfill into `crm_v2.crm_events`. |
| `public.lead_notes` | Lead notes | Backfill into `crm_v2.notes` and timeline events. |
| `public.email_logs` / `public.lead_email_logs` | Operational email history and resend markers | Backfill into `crm_v2.email_sends`, `crm_v2.email_events`, and `crm_v2.crm_events`. |
| `public.activity_logs` | Student/customer/admin activity timeline | Backfill into `crm_v2.crm_events` with `source_table='activity_logs'`. |
| `public.courses`, `course_modules`, `lessons` | Course catalog and LMS source | Referenced by CRM v2 using `course_id`/metadata; no ownership change. |
| Student access records from services | Course access and account operations | Backfill into `crm_v2.enrollments`, `crm_v2.course_progress`, `crm_v2.student_notes` when source columns exist. |
| Auth users | Admin/student identity | Read only through server-side admin services; no CRM v2 auth table copy. |

## Existing Safety Constraints

- Legacy CRM/admin routes are under `/admin/leads`, `/admin/dashboard`, `/admin/don-hang`, `/admin/hoc-vien`, and related legacy pages. CRM v2 must not replace them.
- Current admin lead read model merges `public.leads` with order-only rows that use synthetic IDs like `order:<orderCode>`.
- Sale status belongs on `public.leads.sale_status`, not on `public.orders`.
- Payment source of truth remains `public.orders`; CRM v2 order/payment tables are read-model/backfill targets until a future approved migration changes ownership.
- Existing customer emails, orders, activity logs, and Auth users must never be mass-deleted or renamed.

## Live Database Audit Status

This repository audit did not query production Supabase because service-role credentials are not stored in code and must not be printed. The script `scripts/crm-v2/audit-current-data.ts` is provided to run the live audit from a secure environment. It masks PII by default and records counts for leads, orders, activity logs, email logs, courses, and student-access related sources.

Required live audit command before applying backfill:

```powershell
npx.cmd tsx scripts/crm-v2/audit-current-data.ts --require-live
```

## Additive Migration Requirements

- Create private schema `crm_v2`.
- Create only new CRM v2 tables, indexes, functions, policies, and read-model tables.
- Do not change legacy route ownership.
- Do not alter existing `public` tables except future approved additive columns if needed.
- Use `crm_v2.legacy_id_map` for every backfilled entity.
- Use `crm_v2.migration_runs` to record source/target counts, duplicate counts, missing mappings, and drift.
- Enable RLS on CRM v2 tables; expose CRM v2 only through server-side routes by default.

## Supabase Platform Note

Supabase announced in 2026 that newly created public tables are not automatically exposed to Data API/GraphQL. CRM v2 still uses a private schema to keep the admin CRM behind server routes and RLS by default. Reference docs:

- https://supabase.com/changelog
- https://supabase.com/docs/guides/deployment/database-migrations
- https://supabase.com/docs/guides/database/postgres/row-level-security
