# CRM v2 Parallel Admin

CRM v2 lives under `/admin/crm-v2/*` and is feature-flag gated. Legacy CRM/admin routes remain untouched.

## Feature Flag

Default behavior:

```env
CRM_V2_ENABLED=false
```

Enable locally:

```powershell
$env:CRM_V2_ENABLED="true"
npm.cmd run dev
```

When disabled, `/admin/crm-v2/*` renders a safe disabled state after admin auth and does not replace legacy CRM.

## Migration

Migration file:

```text
supabase/migrations/20260615183000_crm_v2.sql
```

Apply through the normal Supabase migration flow after review:

```powershell
supabase migration up
```

CRM v2 is additive and creates a private `crm_v2` schema. It does not change ownership of legacy payment/order/customer data.

## Audit

Dry local/offline audit:

```powershell
npx.cmd tsx scripts/crm-v2/audit-current-data.ts
```

Require live Supabase access:

```powershell
npx.cmd tsx scripts/crm-v2/audit-current-data.ts --require-live
```

## Backfill

Dry-run is the default:

```powershell
npx.cmd tsx scripts/crm-v2/backfill-crm-v2.ts
```

Apply after reviewing the dry-run:

```powershell
npx.cmd tsx scripts/crm-v2/backfill-crm-v2.ts --apply --run-label crm-v2-initial
```

The backfill is idempotent through `crm_v2.legacy_id_map`, normalized contact dedupe, and stable idempotency keys. It maps legacy leads, order-only leads, contacts, orders, payments, paid-order enrollments, legacy email history, lead activities, student/admin activity logs, lead notes, and CRM timeline events without changing legacy tables.

## Verify

```powershell
npx.cmd tsx scripts/crm-v2/verify-migration.ts --strict
```

Verification checks row-count drift, missing lead/order/payment/enrollment/activity/note mappings, duplicate normalized email/phone, and source/target count mismatches.

## Server-Side Lists

CRM v2 modules use server-side data services with 10/20/50 page sizes where list pagination is relevant:

- `listCrmV2Leads()`
- `listCrmV2Orders()`
- `listCrmV2Students()`
- `listCrmV2SegmentsRows()`
- `listCrmV2EmailCampaigns()`
- `listCrmV2AutomationWorkflows()`
- `listCrmV2TeamMembers()`
- `listCrmV2Integrations()`

Search and filters run through server-side Supabase queries when `CRM_V2_ENABLED=true`; local development falls back to demo rows without touching legacy CRM routes.

Production safety:

- Demo/mock data is local/test only. In production, CRM v2 does not silently mock if Supabase live env or service-role access is missing.
- Production action APIs return an explicit configuration error instead of writing fake records.

## Admin APIs

All CRM v2 admin APIs require owner access, rate limit requests, and return `404` while `CRM_V2_ENABLED=false`:

```text
GET  /api/admin/crm-v2/leads
POST /api/admin/crm-v2/leads/actions
GET  /api/admin/crm-v2/orders
POST /api/admin/crm-v2/orders/actions
GET  /api/admin/crm-v2/students
POST /api/admin/crm-v2/students/actions
GET  /api/admin/crm-v2/segments
POST /api/admin/crm-v2/segments/actions
POST /api/admin/crm-v2/segments/preview
GET  /api/admin/crm-v2/email
POST /api/admin/crm-v2/email/actions
GET  /api/admin/crm-v2/automation
POST /api/admin/crm-v2/automation/actions
GET  /api/admin/crm-v2/reports
GET  /api/admin/crm-v2/team
POST /api/admin/crm-v2/team/actions
GET  /api/admin/crm-v2/integrations
POST /api/admin/crm-v2/integrations/actions
```

Automation actions support `test_workflow`, `save_draft`, `publish`, and `version_history`. The Automation page uses an editable React Flow builder with all CRM v2 node types, posts the live canvas state to the action API, stores JSON draft versions, writes normalized `workflow_nodes` / `workflow_edges`, and shows version history.

`bulkAddWorkflowRuns()` creates `workflow_runs` and prepares idempotent `workflow_step_runs` through the server-side workflow runner helper. `test_workflow` evaluates nodes only; long-running execution such as sending queued email/webhook/notify actions must stay in server/background workers.

Workflow hardening migration:

```text
supabase/migrations/20260615232000_crm_v2_workflow_hardening.sql
```

Email actions support campaign draft creation, test sending, real campaign sending, and broadcast scheduling. Real sending uses the configured provider through the CRM v2 email adapter. In production, missing `RESEND_API_KEY` blocks send actions with a configuration error; local/test may use mock mode.

Real campaign sending requires:

- admin confirmation text `GUI THAT`;
- a campaign segment;
- suppression checks for unsubscribed, hard bounce, complaint, and missing marketing consent;
- an idempotency key per contact send;
- logging into `crm_v2.email_sends`, `crm_v2.email_events`, and `crm_v2.crm_events`.

Remaining module actions:

- Segments: `save_segment` saves or updates a CRM v2 segment and appends versioned JSON rules in `crm_v2.segment_rules`.
- Orders: `send_payment_reminder` sends a transactional payment reminder when email is configured and creates a high-priority CRM v2 task for recovery; it does not mutate `public.orders`.
- Students: `create_support_ticket` creates a CRM v2 support ticket for CSKH follow-up.
- Team: `record_permission_audit` records a permission/audit event in `crm_v2.audit_logs`.
- Integrations: `test_connection` records a mock-safe integration account sync and webhook test event without hard-coded secrets.

## Interaction Guard

CRM v2 UI controls must either submit a real form, navigate to a real route/API, or call a server API. Shared `IconButton` falls back to a non-clickable status chip when no action is provided, and `FilterBar` renders active filters as clear links while inactive filters are read-only chips.

## Text Quality Guard

CRM v2 contract tests scan the CRM v2 UI/data/docs surface for mojibake and replacement characters so Vietnamese labels stay readable in previews and production builds.

## Resend Webhook

CRM v2 exposes:

```text
POST /api/webhooks/resend
```

If `RESEND_WEBHOOK_SECRET` is set, send it in `x-resend-webhook-secret`. The route stores raw webhook payloads in `crm_v2.webhook_events`, normalized provider events in `crm_v2.email_events`, contact timeline entries in `crm_v2.crm_events`, updates `crm_v2.email_sends`, and writes suppression rows for bounced, complained, and unsubscribed events.

## Demo Seed

Demo data is blocked unless explicitly enabled:

```powershell
$env:CRM_V2_ALLOW_DEMO_SEED="true"
npx.cmd tsx scripts/crm-v2/seed-crm-v2-demo.ts --apply
```

## Rollback

Operational rollback:

1. Set `CRM_V2_ENABLED=false`.
2. Stop CRM v2 workers/backfill jobs.
3. Keep `crm_v2` tables for audit.
4. Continue using existing legacy admin routes.

Do not remove legacy tables or customer/order data.
