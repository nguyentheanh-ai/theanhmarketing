# CRM v2 Functional Audit

Date: 2026-06-16
Worktree: `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`

Goal: every visible CRM v2 control must either change real CRM v2 state, call a server API, navigate with real filters, export real data, or show a disabled/configuration reason. Production mode must not silently use demo/mock data.

Status labels:

- `pass`: implemented and covered by contract/unit/typecheck evidence.
- `partial`: implemented but still needs authenticated owner smoke or external provider verification.
- `blocked`: intentionally blocked until env/secret/migration is present.
- `missing`: not acceptable for deploy.

## Shared Query Contract

| Unit | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Range control `7/30/90 ngày` | pass | `CrmTopbar`, `normalizeCrmListQuery`, `getCrmDateRange` | Range is now a real query input, not a cosmetic link. |
| Server-side `range/dateFrom/dateTo/page/pageSize/search/sort/filters` | pass | `lib/crm-v2/query.ts`, `lib/crm-v2/data.ts` | Dashboard, Leads, Orders, Students pass date args to server-only RPC. |
| Production demo guard | pass | `shouldUseCrmV2DemoData()` | Demo data is local/test only; production missing env returns configuration errors. |
| Private schema read path | pass | `crm_v2_*_raw` RPC migrations | CRM v2 tables remain private; server reads through service-role RPC wrappers. |

## Route Audit

| Route | KPI/Dashboard | Table/List | Primary Buttons | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/admin/crm-v2/outline` | N/A | Module outline | Navigation only | pass | Operator copy only; internal migration blueprint removed. |
| `/admin/crm-v2` | Live RPC KPI/charts by range | Recent widgets | Export/report links | partial | Data is real after migration; export link is API route and needs owner-session smoke. |
| `/admin/crm-v2/leads` | Server total stage cards | Dedupe by contact, phone visible, server pagination | assign sale, tag, email, workflow, stage, export | partial | Bulk actions call API and write CRM v2 events; owner-session smoke still required on production. |
| `/admin/crm-v2/leads/[id]` | Contact score/engagement | Timeline from `crm_events` | quick actions/profile links | partial | 360 view reads CRM v2 contact profile; deeper action audit remains in next pass. |
| `/admin/crm-v2/segments` | Summary from CRM v2 | Segment list server-side | save segment, preview | pass | Saves `segments` and versioned `segment_rules`; preview is server-side. |
| `/admin/crm-v2/email` | Email KPI from CRM v2 | Campaign list server-side | save draft, preview/refresh audience, send test, schedule/cancel, send now | pass | Rebuilt as CRM-native Email MKT workspace. Real send requires `GUI THAT`, refreshed audience snapshot, sendable segment membership, suppression checks, and Resend production config. |
| `/admin/crm-v2/automation` | Workflow summary | Workflow/version list | test, save draft, publish, history | pass | React Flow edits client-side only; persistence and publish are server-side. |
| `/admin/crm-v2/orders` | Live order/payment KPI by range | Orders list server-side | payment reminder | partial | Reminder now sends transactional email plus task when Resend is configured; production without key returns 503. |
| `/admin/crm-v2/students` | Enrollment/progress KPI | Student list server-side | create support ticket | pass | Writes `crm_v2.support_tickets`; no legacy student table mutation. |
| `/admin/crm-v2/reports` | Attribution KPI by range | Attribution table | export/drill links | partial | Report route exists; export/drilldown need owner-session smoke against live data. |
| `/admin/crm-v2/team` | Team summary | Team member list server-side | permission audit | pass | Writes `crm_v2.audit_logs`; no legacy admin role overwrite. |
| `/admin/crm-v2/integrations` | Provider status | Integration list server-side | test connection | partial | Writes `integration_accounts`/`webhook_events`; providers without env must show not configured, not connected. |

## Button Outcome Matrix

| Module | Button/control | Outcome | Status |
| --- | --- | --- | --- |
| Topbar | Search | Server query param used by lists/dashboard | pass |
| Topbar | `7/30/90 ngày` | Updates `range` and recomputes date window server-side | pass |
| Topbar | Refresh | Router refresh without resetting query contract | pass |
| Leads | Bulk assign/tag/stage/email/workflow/export | Calls `/api/admin/crm-v2/leads/actions`; writes `crm_v2` rows/events or exports CSV | partial |
| Segments | Save segment | Upserts `crm_v2.segments`; appends `segment_rules` version | pass |
| Email | Save draft | Inserts/updates `crm_v2.email_templates` and `crm_v2.email_campaigns` from the block composer | pass |
| Email | Preview audience | Evaluates selected segment server-side and returns total/sendable/suppressed/missing-email samples | pass |
| Email | Refresh audience | Upserts `crm_v2.segment_memberships` and stores campaign `metadata.audience_snapshot` | pass |
| Email | Send test | Sends rendered composer content through provider; logs `email_sends`, `email_events`, `crm_events` | pass |
| Email | Schedule/cancel | Updates campaign schedule status through `/api/admin/crm-v2/email/actions` | pass |
| Email | Send real campaign | Requires `GUI THAT`, refreshed audience snapshot, suppression checks, idempotency key | pass |
| Automation | Test workflow | Server evaluates workflow nodes without browser long-running work | pass |
| Automation | Save draft | Persists `workflows`, `workflow_versions`, `workflow_nodes`, `workflow_edges` | pass |
| Automation | Publish | Updates immutable published version and active workflow pointer | pass |
| Orders | Payment reminder | Sends transactional email and creates recovery task | partial |
| Students | Create ticket | Inserts `crm_v2.support_tickets` | pass |
| Team | Record permission audit | Inserts `crm_v2.audit_logs` | pass |
| Integrations | Test connection | Records account/webhook test; must display missing env where provider is not configured | partial |

## Email Safety Audit

| Rule | Status | Evidence |
| --- | --- | --- |
| No production mock sending | pass | `assertCanRunLiveEmailAction`, production config guard |
| Resend only when `RESEND_API_KEY` exists | pass | `getEmailProvider()` boundary |
| Suppression for unsubscribe, hard bounce, complaint, no consent | pass | `canSendMarketingEmail`, `getSuppressionReason` |
| Idempotency key on sends | pass | `sendAndRecordEmail()` checks `email_sends.idempotency_key` |
| Writes email and CRM event logs | pass | `email_sends`, `email_events`, `crm_events` inserts |
| Real campaign send cannot blast all contacts | pass | `sendCrmV2CampaignNow()` requires `segment_id` |
| Real campaign send needs refreshed audience | pass | `sendCrmV2CampaignNow()` requires `metadata.audience_snapshot` and current segment rule version |

## 2026-06-16 Email MKT Workspace Audit

| Unit | Status | Evidence |
| --- | --- | --- |
| Main workflow tabs | pass | `Chiến dịch`, `Soạn email`, `Template`, `Lịch gửi`, `Log gửi`, `Suppression` in `EmailMarketingWorkspace` |
| Block composer | pass | Fields for goal, type, segment, subject, preheader, body, CTA, footer, schedule; advanced HTML is optional only |
| Legacy template import | pass | Registration, pending payment, and payment success configs can be selected into the composer |
| Audience panel | pass | `preview_audience` and `refresh_audience` actions expose total/sendable/suppressed/missing-email |
| Send safety | pass | Production missing `RESEND_API_KEY` fails closed; real send stays disabled until preview/refresh + `GUI THAT` |
| Verification | pass | CRM v2 unit 12/12, contract 18/18, Playwright Chromium 32/32, Node tests 198/198, typecheck, lint, diff check, build |

## Current Deploy Blockers

- `partial` items need authenticated owner-session smoke on production, because unauthenticated curl can only verify redirects and guards.
- Real email send cannot be verified end-to-end until production has a valid `RESEND_API_KEY`, sender/domain config, and admin confirmation in UI.
- Integrations for Meta/Google/TikTok remain configuration-gated; they must show `chưa cấu hình` until real env and consent/hashing review are complete.

## Verification To Run Before Next Deploy

```powershell
node --test tests\*.mjs
node --import=tsx --test tests\crm-v2-core.unit.ts tests\crm-v2-migration-scripts.test.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run lint
git diff --check
npm.cmd run build
npx.cmd playwright test tests/playwright/crm-v2.spec.ts --project=chromium
npx.cmd tsx scripts/crm-v2/verify-migration.ts --strict
```
