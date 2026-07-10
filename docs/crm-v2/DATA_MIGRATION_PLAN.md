# CRM v2 Data Migration Plan

Date: 2026-06-15

CRM v2 is built as a parallel read/write CRM schema. Legacy customer data remains in place. The first backfill creates CRM v2 contacts, lead opportunities, timeline events, email history, orders/payments read models, and student/course read models without changing legacy ownership.

## Non-Negotiable Rules

- No destructive SQL.
- No legacy route replacement.
- Backfill is idempotent and can be re-run.
- Every legacy row copied into CRM v2 receives a row in `crm_v2.legacy_id_map`.
- Every run writes `crm_v2.migration_runs`.
- Verification must stop on abnormal count drift, missing mappings, duplicate normalized contacts above threshold, or unsafe source access.

## Mapping

| Legacy source | Target table | Mapping notes |
| --- | --- | --- |
| `public.leads` | `crm_v2.contacts` | Dedupe by `normalized_email`, then `normalized_phone`; if neither exists, use `legacy_id_map` to prevent duplicate anonymous contacts on rerun. |
| `public.leads` | `crm_v2.leads` | One opportunity per legacy lead; stage maps from sale/payment status when available. |
| `public.leads` | `crm_v2.crm_events` | Create `form_submit`, `stage_change`, `lead_created`, and note-like events from available columns. |
| `public.lead_activities` | `crm_v2.crm_events` | Preserve actor, type, metadata, created time. |
| `public.lead_notes` | `crm_v2.notes`, `crm_v2.crm_events` | Notes are linked to contact/lead through legacy map when possible. |
| `public.orders` | `crm_v2.contacts` | Order contact identity dedupes against existing lead contacts by normalized email/phone. |
| `public.orders` | `crm_v2.leads` | Creates an order-only opportunity when `public.orders.lead_id` has no mapped CRM lead. |
| `public.orders` | `crm_v2.orders` | Read model only; keep `public.orders` as payment source of truth. |
| `public.orders` | `crm_v2.payments` | One read-model payment row per legacy order; paid/pending/failed/refunded status mapped from order/payment status. |
| `public.orders` | `crm_v2.enrollments` | Paid orders with one or more course slugs create active enrollment read models. |
| `public.orders` | `crm_v2.crm_events` | Deterministic `order_created` and `payment_paid` events use stable idempotency keys. |
| `public.email_logs`, `public.lead_email_logs` | `crm_v2.email_sends`, `crm_v2.email_events` | Preserve provider message id, status, subject, recipient hash/masked recipient. |
| `public.activity_logs` | `crm_v2.crm_events` | Student/customer/admin timeline events. |
| `public.courses` | referenced by CRM v2 `course_id` | Do not duplicate course catalog unless a denormalized label is needed. |
| Student access services | `crm_v2.enrollments`, `crm_v2.course_progress`, `crm_v2.student_notes` | Read model for student lifecycle and retention workflows. |

## Stage Mapping

| Legacy signal | CRM v2 stage |
| --- | --- |
| New form submit | `new` |
| No owner/untouched | `not_contacted` |
| `sale_status=da_lien_he` or activity call success | `consulting` |
| High score or repeated engagement | `high_intent` |
| Pending order | `pending_payment` |
| Paid order | `paid` |
| No need / invalid / hard bounce | `disqualified` |

## Backfill Run Flow

1. Run `audit-current-data.ts --require-live` from a secure machine.
2. Run `backfill-crm-v2.ts` without `--apply` to dry-run.
3. Review planned inserts/upserts and duplicate contact summary.
4. Run `backfill-crm-v2.ts --apply --run-label <label>`.
5. Run `verify-migration.ts --strict`.
6. Store run counts in `crm_v2.migration_runs`.
7. Keep CRM v2 hidden unless `CRM_V2_ENABLED=true`.

## Idempotency

- `crm_v2.legacy_id_map` has unique `(source_table, source_id, target_table)`.
- Contacts use unique partial indexes on `normalized_email` and `normalized_phone`.
- Email events use provider event id or deterministic idempotency key.
- Workflow step runs use unique `idempotency_key`.
- Backfill scripts read `legacy_id_map` before insert/update and use stable deterministic keys for CRM events. Live-required modes fail closed when Supabase env is missing.

## Rollback

CRM v2 rollback is operational, not destructive:

- Set `CRM_V2_ENABLED=false`.
- Stop running CRM v2 backfill/automation workers.
- Leave `crm_v2` tables intact for audit.
- Legacy CRM/admin routes continue reading legacy `public` tables.

No rollback step should remove legacy data.
