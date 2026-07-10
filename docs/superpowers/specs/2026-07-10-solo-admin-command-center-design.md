# Solo Admin Command Center Design

Status: approved direction, awaiting written-spec review  
Project ID: `theanh-main`  
Production domain: `theanhmarketing.com`  
Design date: 2026-07-10  
Implementation branch: `feat/solo-command-center-20260710`

## 1. Decision

Build a new owner-first admin experience inside the existing Next.js application. Keep the current authentication, order, student-account, enrollment, email, and activity-log services. Preserve the current Supabase schema; the only permitted additive data structure is a small owner-only provisioning-operation journal required for durable idempotency. Do not create a separate admin application and do not rewrite the working provisioning services.

The product is a **Solo Business Command Center**: it helps one owner answer what happened, what needs attention, and what action to take next. CRM V2 remains available as an advanced compatibility surface, but it no longer controls the default admin entry point or primary navigation.

## 2. Why This Direction

The source currently has two competing admin experiences:

- the classic admin shell and dashboard under `/admin/dashboard`;
- CRM V2 under `/admin/crm-v2`, which becomes the default when `CRM_V2_ENABLED=true`.

Student provisioning already exists through real server routes and services, but the entry point is buried in `/admin/hoc-vien`, the form mixes payment and access concepts, and non-paid modes do not complete an account-and-access flow. The student page also loads activity logs once per visible student, creating an N+1 request pattern.

The new design keeps the proven backend and replaces the fragmented operator experience with one clear shell, one command-center dashboard, one provisioning wizard, and one truthful reporting model.

## 3. Goals

1. Let the owner create a paid, free, or trial student without code.
2. Make account, course access, order, and email outcomes independently visible and retryable.
3. Show many useful charts, but only from real production data with explicit definitions.
4. Put failures and incomplete work ahead of decorative metrics.
5. Make the default admin usable on desktop, tablet, and mobile.
6. Reduce page latency and avoid loading student histories until requested.
7. Preserve existing security boundaries, business logic, API contracts where still in use, and production behavior outside admin.

## 4. Non-Goals

- No separate admin repository or Vercel project.
- No Supabase project change, schema rewrite, framework upgrade, or dependency upgrade. One additive provisioning-operation journal is allowed; no existing table or column is removed or reinterpreted.
- No production deployment as part of implementation without a separate explicit approval.
- No new team-management, automation-builder, segment-builder, or omnichannel CRM work.
- No CAC, ROAS, ROI, ad profit, deliverability, or unsubscribe metric unless its required source is connected and verified.
- No deletion of CRM V2 routes in this release.
- No change to public checkout, SePay confirmation, student login, LMS lesson access, or public website design.

## 5. Information Architecture

The owner navigation uses these entries in this order:

| Label | Canonical route | Purpose |
| --- | --- | --- |
| Tổng quan | `/admin/dashboard` | KPIs, charts, priority queue, quick actions |
| Việc cần xử lý | `/admin/viec-can-xu-ly` | Filtered list of real operational exceptions |
| Học viên | `/admin/hoc-vien` | Search, access state, student detail, provisioning |
| Đơn hàng | `/admin/crm-v2/orders` | Existing order-management surface, relabeled in the simple shell |
| Leads | `/admin/leads` | Existing lead-management surface |
| Khóa học | `/admin/khoa-hoc` | Existing course-management surface |
| Báo cáo | `/admin/bao-cao` | Detailed date-range charts and breakdowns |
| Cài đặt | `/admin/cai-dat` | Owner/admin access and links to advanced compatibility modules |

`/admin` redirects to `/admin/dashboard`. `CRM_V2_ENABLED` may continue to protect and enable CRM V2 routes, but it must not redirect `/admin` or `/admin/dashboard` away from the Solo Command Center.

Advanced CRM V2 features remain reachable from Cài đặt for the owner. They are not shown in the primary navigation. Editor permissions remain restricted to the modules already permitted by `ProtectedAdminShell` and role checks.

## 6. Visual System

The admin follows the existing design rules:

- `Be Vietnam Pro` typography;
- calm off-white page background;
- white cards with subtle borders and shadows;
- black primary actions and restrained warm accent;
- green, amber, red, and blue used only for semantic status;
- no loud gradients, neon effects, decorative chart animation, or excessive color;
- responsive cards on mobile instead of forced desktop tables;
- reduced-motion support.

The desktop dashboard uses a fixed/collapsible left rail and a content grid. Mobile uses a compact header, horizontal primary navigation, stacked cards, and bottom-safe action drawers. Every graph includes a text summary or accessible label; color is never the only status signal.

## 7. Command Center Dashboard

### 7.1 Header

The header contains:

- date-range selector: 7 days, 30 days, this month, previous month, custom range;
- `Asia/Ho_Chi_Minh` timezone label;
- last successful data refresh time;
- manual refresh action;
- primary `Tạo học viên` action;
- secondary `Xuất báo cáo` action.

### 7.2 KPI Row

The first row contains four values for the selected period:

1. **Doanh thu đã thanh toán**: sum of `orders.amount` for `status=paid` only.
2. **Đơn đã thanh toán**: count of paid orders.
3. **Học viên mới**: distinct users with their first active enrollment created in the period.
4. **Lead mới**: count of leads created in the period.

Each KPI shows comparison with the immediately preceding period of equal length. If the preceding value is zero, show `Chưa có kỳ so sánh`; do not show an infinite or fabricated percentage.

### 7.3 Priority Queue

The priority queue appears before charts and contains only actionable records derived from real state:

- a paid order whose account provisioning did not complete;
- a paid order whose payment-success email failed or is missing its sent marker;
- a student whose account exists but selected course access is missing;
- a trial enrollment expiring within three days;
- an unresolved failed student activity event;
- a pending order older than the configured operational threshold.

Each row includes severity, customer identifier, reason, age, safe next action, and link to the relevant detail. The default threshold for stale pending orders is 24 hours and is a named constant, not a hidden magic number.

### 7.4 Real Charts

The dashboard contains the following charts:

1. **Revenue trend**: daily paid revenue for the selected period with the previous-period series.
2. **Order status**: paid, pending, failed, and refunded counts; unknown statuses appear as `Khác` instead of being discarded.
3. **Top courses**: horizontal bars showing paid revenue and paid-order count from order items/course slugs.
4. **Sales-to-learning funnel**: linked leads, pending orders, paid orders, and active enrollments for the selected cohort. Records that cannot be linked by stable identifiers are shown separately and excluded from conversion percentages.
5. **Student growth**: daily first active enrollments, with paid versus free/trial breakdown.
6. **Access health**: active access, pending access, expiring trial, and access error counts.

Every chart has a visible empty state, a Vietnamese tooltip, formatted VND/count values, and a short definition. The dashboard never substitutes demo arrays when production data is empty.

## 8. Detailed Reports

`/admin/bao-cao` reuses the same reporting model and date contract as the dashboard. It provides:

- full-width revenue and order charts;
- course comparison table with revenue, paid orders, new enrollments, and linked leads;
- cohort funnel with unlinked-record disclosure;
- student growth and access-health history;
- CSV export of the currently filtered, non-secret aggregate data.

The report does not infer ad spend or profit from lead count. Adplan integration is a separate future design because the current website repository does not own a verified ad-spend data contract.

## 9. Unified Student Provisioning Wizard

### 9.1 Entry Points

The same wizard opens from:

- dashboard `Tạo học viên`;
- student page `Tạo học viên`;
- priority-queue recovery actions when the operation is safe to resume.

The wizard is a focused drawer on desktop and a full-screen sheet on mobile. It has three steps: `Loại học viên`, `Thông tin & khóa học`, and `Kiểm tra & thực hiện`.

### 9.2 Modes

#### Paid

Required: name, phone, valid email, at least one course, and source. Revenue uses the selected course prices resolved by the existing order service; this release does not introduce a free-form revenue amount. The server reuses:

- `createManualPaidOrder()`;
- `ensureStudentAccountForPaidOrder()`;
- existing enrollment/access synchronization;
- `sendPaymentSuccessEmail()`;
- account login verification already owned by `studentAccountService`.

The operation must be idempotent for the submitted operation key. A new owner-only `admin_student_provisioning_operations` journal stores a unique `operation_id`, normalized request fingerprint, current step, safe step outcomes, resulting order code, actor ID, and timestamps. It never stores a password. Repeated browser submissions with the same operation ID and fingerprint return or resume the existing result instead of creating duplicate paid orders; reuse of an operation ID with different input is rejected.

#### Free

Required: name, phone, valid email, and at least one course. Phone remains required in this release because the current validation, customer matching, and operational recovery flows use it. The server creates or recovers the account through `ensureStudentAccountForAccessGrant()`, grants active course access, and optionally sends the existing student-access email. It does not create an order and does not add revenue.

#### Trial

The trial mode follows the free flow but requires an expiry date. The default expiry is seven days from creation in `Asia/Ho_Chi_Minh`, displayed explicitly and editable before confirmation. It does not create an order or revenue. The server writes the existing enrollment expiry field, and the entitlement check must deny an enrollment after that timestamp. The UI is not an access boundary and no cron job is required for correctness.

### 9.3 Result Contract

The API returns a structured result instead of one combined message:

```text
operationId
student: success | existing | failed
order: created | existing | not_applicable | failed
access: granted | existing | failed
email: sent | skipped | failed
nextActions[]
```

No temporary password is written to logs, activity metadata, documentation, analytics, or the priority queue. A temporary password may appear once in the authenticated result UI when the existing secure flow generated it; the UI warns the owner not to store it in notes.

Email failure never rolls back a valid account, paid order, or enrollment. The result screen exposes `Gửi lại email` as a narrow retry. Access failure exposes `Thử cấp lại quyền` only after re-reading current access state. A partial failure is added to the priority queue without requiring code execution.

## 10. Component and Service Boundaries

The implementation uses small units with explicit ownership:

- `SoloAdminShell`: navigation and role-aware layout only.
- `CommandCenterPage`: server component that reads the filter and composes sections.
- `buildCommandCenterModel`: pure aggregation from orders, leads, courses, enrollments/access records, and activity exceptions.
- chart components: client-only Recharts views that receive chart-ready arrays and contain no database logic.
- `OperationalQueue`: displays normalized actionable exceptions and safe links.
- `StudentProvisioningWizard`: client interaction and validation state only.
- `provisionStudent`: server orchestrator that selects paid/free/trial flow and calls existing services.
- `ProvisioningOperationStore`: the only owner of the additive idempotency journal and resume semantics.
- `StudentDetailDrawer`: lazy-loads one student's access and activity history.

Existing service functions remain the source of truth. The UI must not call Supabase directly for privileged mutations, and server orchestration must not call the application's own HTTP routes internally.

## 11. Data Loading and Performance

- Fetch independent dashboard sources in parallel on the server.
- Convert raw records into chart-ready aggregate arrays before crossing the client boundary.
- Dynamically import chart components so the first admin shell and priority queue are not blocked by Recharts.
- Put separate Suspense boundaries around KPI/queue, revenue charts, course charts, and student-health charts.
- Use fixed-height skeletons to prevent layout shift.
- Replace per-student `getStudentActivityLogs()` calls on `/admin/hoc-vien` with on-demand detail loading or one bounded batch query.
- Implement server-side student search and pagination; do not load all activity history with the list.
- Use a deliberate 60-second freshness window for dashboard client refresh state. Do not refetch the whole dashboard on every tab focus.
- Keep query ranges bounded. The default dashboard range is 30 days; larger custom ranges use aggregated rows and never send raw PII to chart components.

## 12. Security and Privacy

- All admin pages remain protected by `ProtectedAdminShell` or the equivalent server-side owner/editor check.
- Student creation and recovery remain owner/editor guarded and rate limited.
- The Supabase service-role key remains server-only.
- Reports and charts receive IDs/counts/aggregates, not passwords, tokens, or raw secret values.
- Customer PII is shown only where required for an authenticated operational action.
- CSV export excludes password fields, authentication metadata, internal tokens, and secret-bearing notes.
- Activity logging records the admin actor, operation ID, status, course slugs, and safe error code; it does not store credentials.
- The provisioning-operation journal uses owner/editor server access only, has no anonymous policy, and stores no credential or raw email content.
- Existing public checkout, SePay webhook, email bridge, and LMS entitlement guards are unchanged.

## 13. Error Handling and Recovery

Each dashboard section has its own loading, empty, and error state. A chart failure does not remove the priority queue or primary actions. The page shows the last successful refresh time and a retry for the failed section.

Provisioning uses named steps with durable outcomes:

1. validate normalized input;
2. resolve existing customer/account state;
3. create or reuse the appropriate business record;
4. grant or verify access;
5. verify account login when a password was provisioned;
6. send email if requested;
7. log safe outcomes and invalidate affected admin caches.

An error response names the failed step and completed steps. Retry actions resume from verified state rather than blindly repeating all mutations.

## 14. Testing Strategy

### Pure model tests

- paid-only revenue calculation;
- equal-length previous-period comparison;
- zero-baseline comparison behavior;
- order-status grouping including unknown status;
- paid/free/trial student counts;
- cohort funnel linking and unlinked disclosure;
- timezone boundaries in `Asia/Ho_Chi_Minh`;
- priority-queue classification and ordering.

### Provisioning contract tests

- paid flow calls existing paid-order/account/email services once;
- duplicate operation key returns the prior result;
- free and trial flows create no order and no revenue;
- trial requires and enforces expiry;
- existing paid/OAuth users are not blindly reset;
- email failure preserves completed account/access work;
- retry email does not recreate order/account/access;
- no password appears in logs or serialized queue records;
- owner/editor authorization and rate limits remain enforced.

### UI tests

- navigation and role visibility;
- date selector and empty states;
- chart accessibility labels and responsive containers;
- wizard step validation, double-submit prevention, partial-success display, and narrow retries;
- student activity loads only after opening a student detail;
- mobile drawer and desktop layout.

### Regression and release checks

- existing student access/account/email tests;
- CRM V2 protection and route tests;
- admin dashboard tests updated to assert truthful metrics;
- TypeScript, lint, full Node test suite, and production build;
- authenticated owner browser smoke in preview;
- unauthenticated admin redirect/403 smoke;
- no production deployment until the owner explicitly approves it.

## 15. Rollout Plan

Implementation is staged in reversible commits:

1. aggregation contracts and failing tests;
2. additive idempotency journal migration and operation-store tests;
3. shell and command-center dashboard;
4. operational queue and student-list performance fix;
5. unified provisioning orchestrator and wizard;
6. detailed reports and CSV export;
7. documentation, full verification, preview screenshot review.

CRM V2 routes remain intact during rollout. The default-entry redirect changes only after the Solo Command Center passes tests and authenticated preview verification. Production remains on the current release until a separate production-deploy confirmation.

## 16. Acceptance Criteria

The design is complete when all of the following are true:

1. `/admin` and `/admin/dashboard` open the Solo Command Center for an authenticated owner.
2. The owner can create paid, free, and trial students without code.
3. Paid provisioning creates at most one intended paid order per operation.
4. Free and trial provisioning never add revenue.
5. Account, order, access, and email outcomes are separately visible and retryable.
6. Dashboard and report values are derived from real sources and match documented definitions.
7. No placeholder CAC, ROI, ad-profit, or deliverability numbers remain in the primary dashboard/report.
8. At least six real chart groups render with truthful empty states.
9. Operational failures appear in a priority queue with safe next actions.
10. `/admin/hoc-vien` no longer performs one activity-log query per visible student.
11. Admin remains usable on mobile and desktop and meets basic keyboard/accessibility expectations.
12. Relevant tests, typecheck, lint, and production build pass.
13. Authenticated preview screenshots are approved before any production deployment.
14. No other project, domain, Vercel identity, or public customer flow is changed.

## 17. Required Documentation Updates During Implementation

- `FEATURE_MAP.md`: admin routes, command-center model, provisioning flow, report flow.
- `CURRENT_STATE.md`: implementation and verification status.
- `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`: new default admin entry, service boundaries, and operational recovery flow.
- `SESSION_LOG.md`: concise session result.
- Relevant `DEPLOYMENT.md` notes only if the verified release procedure changes; this design does not propose such a change.
