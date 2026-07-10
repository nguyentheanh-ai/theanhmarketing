# Solo Admin Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Replace the competing admin entry experiences with a truthful, fast Solo Business Command Center and a safe paid/free/trial student-provisioning wizard.

**Architecture:** Keep all privileged reads and mutations on the server. Add one pure aggregation model for dashboard/report data, small client-only Recharts views, an operational queue derived from real records, and a durable provisioning-operation journal that makes student creation resumable and idempotent. Preserve the existing order, account, LMS enrollment, email, auth, and activity services.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/PostgreSQL, Recharts 3, Node test runner, Playwright, Tailwind CSS.

---

## File Structure

### Create

- **lib/admin/solo-command-center.ts**: pure date filtering, comparisons, chart rows, funnel linking, access health, and priority-task derivation.
- **services/adminCommandCenterService.ts**: bounded parallel server reads and one command-center model entry point.
- **components/admin/solo-command-center/command-center-dashboard.tsx**: owner dashboard composition and date controls.
- **components/admin/solo-command-center/command-center-charts.tsx**: client-only Recharts components.
- **components/admin/solo-command-center/priority-queue.tsx**: actionable exception list.
- **app/admin/viec-can-xu-ly/page.tsx**: full priority queue.
- **app/admin/bao-cao/page.tsx**: detailed report surface.
- **app/api/admin/reports/export/route.ts**: authenticated aggregate CSV export.
- **app/admin/cai-dat/page.tsx**: owner/admin access and advanced-module links.
- **app/api/admin/students/activity/route.ts**: bounded per-student activity endpoint.
- **components/admin/student-activity-timeline.tsx**: lazy student activity UI.
- **supabase/migrations/20260711090000_admin_student_provisioning_operations.sql**: durable idempotency journal and owner/editor policy.
- **services/studentProvisioningOperationService.ts**: operation claim, resume, and safe outcome persistence.
- **services/studentProvisioningService.ts**: paid/free/trial orchestration through existing services.
- **components/admin/student-provisioning-wizard.tsx**: three-step drawer/full-screen mobile flow.
- **tests/admin-solo-command-center.test.mjs**: route, shell, chart, report, and no-placeholder contracts.
- **tests/admin-solo-command-center-model.test.mjs**: pure reporting calculations.
- **tests/admin-student-provisioning.test.mjs**: operation store and orchestration contracts.
- **tests/admin-student-activity-lazy.test.mjs**: N+1 regression guard.

### Modify

- **app/admin/page.tsx**: stop CRM V2 from taking over the default entry.
- **app/admin/dashboard/page.tsx**: render the new server-driven dashboard.
- **components/app/admin-shell.tsx**: owner-first navigation and existing role visibility.
- **app/admin/hoc-vien/page.tsx**: remove eager activity reads and launch the unified wizard.
- **components/admin/student-access-actions.tsx**: load activity only when detail opens.
- **components/admin/student-create-dialog.tsx**: host the unified wizard while keeping payment-link mode available.
- **app/api/admin/students/grant/route.ts**: validate input and delegate to the provisioning orchestrator.
- **app/api/admin/students/access/route.ts**: reuse shared access helpers and keep narrow grant/revoke behavior.
- **services/lmsService.ts**: enforce enrollment expiry when resolving entitlement.
- **services/adminDataService.ts**: expose bounded command-center data without fallback/demo records.
- **tests/student-access-admin-controls.test.mjs**: update the existing UI/API contract.
- **tests/admin-growth-os-dashboard.test.mjs**: replace old dashboard assertions with Solo Command Center assertions.
- **tests/admin-performance-guardrails.test.mjs**: lock lazy activity loading and bounded chart data.
- **FEATURE_MAP.md**, **CURRENT_STATE.md**, **docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md**, **SESSION_LOG.md**: cross-session handoff.

## Task 1: Lock the Default Admin Route and Solo Navigation

**Files:**
- Create: tests/admin-solo-command-center.test.mjs
- Modify: app/admin/page.tsx
- Modify: components/app/admin-shell.tsx
- Create: app/admin/cai-dat/page.tsx

- [ ] **Step 1: Write the failing route and shell contract**

Create tests/admin-solo-command-center.test.mjs with:

~~~js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

test("admin defaults to the solo command center", () => {
  const index = read("app/admin/page.tsx");
  assert.match(index, /redirect\("\/admin\/dashboard"\)/);
  assert.doesNotMatch(index, /isCrmV2Enabled|\/admin\/crm-v2/);
});

test("owner shell exposes the approved solo navigation", () => {
  const shell = read("components/app/admin-shell.tsx");
  for (const href of [
    "/admin/dashboard",
    "/admin/viec-can-xu-ly",
    "/admin/hoc-vien",
    "/admin/don-hang",
    "/admin/leads",
    "/admin/khoa-hoc",
    "/admin/bao-cao",
    "/admin/cai-dat",
  ]) {
    assert.match(shell, new RegExp(href.replaceAll("/", "\\/")));
  }
  assert.doesNotMatch(shell, /Team|Automation|Segments|Integrations/);
});
~~~

- [ ] **Step 2: Run the new contract and confirm RED**

Run: node --test tests/admin-solo-command-center.test.mjs

Expected: FAIL because app/admin/page.tsx still imports isCrmV2Enabled and the shell lacks the new routes.

- [ ] **Step 3: Make the default route deterministic**

Replace app/admin/page.tsx with:

~~~tsx
import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";

export default async function AdminIndexPage() {
  const { adminRole } = await getCurrentAuth();
  redirect(adminRole === "editor" ? "/admin/khoa-hoc" : "/admin/dashboard");
}
~~~

Update adminNavGroups in components/app/admin-shell.tsx so owner sees the eight approved entries. Keep editor visibility limited to Học viên and Khóa học. Point Đơn hàng to the existing simpler /admin/don-hang route, not CRM V2.

Create app/admin/cai-dat/page.tsx as a ProtectedAdminShell owner page containing links to /admin/thanh-vien-admin and /admin/crm-v2. Label CRM V2 as Nâng cao and do not duplicate it in the main navigation.

- [ ] **Step 4: Run focused and existing shell tests**

Run: node --test tests/admin-solo-command-center.test.mjs tests/admin-growth-os-dashboard.test.mjs tests/admin-editor-role.test.mjs

Expected: new tests PASS; existing tests may fail only where old labels/routes must be updated in Task 1 before proceeding.

- [ ] **Step 5: Commit**

~~~powershell
git add app/admin/page.tsx app/admin/cai-dat/page.tsx components/app/admin-shell.tsx tests/admin-solo-command-center.test.mjs tests/admin-growth-os-dashboard.test.mjs
git commit -m "feat: make solo command center the admin entry"
~~~

## Task 2: Build the Truthful Command-Center Model

**Files:**
- Create: lib/admin/solo-command-center.ts
- Create: tests/admin-solo-command-center-model.test.mjs

- [ ] **Step 1: Write failing pure-model tests**

The test must load the TypeScript module with the existing TypeScript transpile pattern and cover:

~~~js
test("counts only paid revenue and compares equal periods", () => {
  const model = buildSoloCommandCenterModel({
    range: { from: "2026-07-01", to: "2026-07-07" },
    now: new Date("2026-07-08T02:00:00.000Z"),
    orders: [
      order("paid-current", "paid", 1000000, "2026-07-02T02:00:00.000Z"),
      order("pending-current", "pending", 9000000, "2026-07-03T02:00:00.000Z"),
      order("paid-previous", "paid", 500000, "2026-06-25T02:00:00.000Z"),
    ],
    leads: [],
    students: [],
    activities: [],
  });
  assert.equal(model.kpis.revenue.value, 1000000);
  assert.equal(model.kpis.revenue.previousValue, 500000);
  assert.equal(model.kpis.revenue.changePercent, 100);
});

test("never reports free or trial access as revenue", () => {
  const model = buildSoloCommandCenterModel({
    range,
    orders: [],
    leads: [],
    students: [student("free"), student("trial")],
    activities: [],
  });
  assert.equal(model.kpis.revenue.value, 0);
  assert.deepEqual(model.studentGrowth.map((row) => row.kind).sort(), ["free", "trial"]);
});

test("discloses unlinked funnel records", () => {
  const model = buildSoloCommandCenterModel(funnelFixture);
  assert.equal(model.funnel.unlinkedCount, 1);
  assert.equal(model.funnel.rows.find((row) => row.stage === "paid").count, 1);
});
~~~

Also test Asia/Ho_Chi_Minh boundaries, unknown order status grouped as Khác, expiring trials, failed email/access queue ordering, and zero previous-period text state.

- [ ] **Step 2: Run the model tests and confirm RED**

Run: node --test tests/admin-solo-command-center-model.test.mjs

Expected: FAIL with module not found for lib/admin/solo-command-center.ts.

- [ ] **Step 3: Implement the model public contract**

Create these exported types and function:

~~~ts
export type CommandCenterRange = { from: string; to: string };
export type Metric = {
  value: number;
  previousValue: number;
  changePercent: number | null;
};
export type PriorityTask = {
  id: string;
  severity: "critical" | "warning" | "info";
  kind: "account" | "email" | "access" | "trial" | "pending-order";
  title: string;
  detail: string;
  href: string;
  createdAt: string;
};
export type SoloCommandCenterModel = {
  range: CommandCenterRange;
  generatedAt: string;
  dataStatus: Record<"orders" | "leads" | "students" | "activities", "ready" | "error">;
  kpis: {
    revenue: Metric;
    paidOrders: Metric;
    newStudents: Metric;
    newLeads: Metric;
  };
  revenueTrend: Array<{ date: string; current: number; previous: number }>;
  orderStatuses: Array<{ status: string; label: string; count: number }>;
  topCourses: Array<{ slug: string; title: string; revenue: number; paidOrders: number }>;
  funnel: {
    rows: Array<{ stage: "lead" | "pending" | "paid" | "enrolled"; count: number }>;
    unlinkedCount: number;
  };
  studentGrowth: Array<{ date: string; kind: "paid" | "free" | "trial"; count: number }>;
  accessHealth: Array<{ status: "active" | "pending" | "expiring" | "error"; count: number }>;
  priorityTasks: PriorityTask[];
};

export declare function buildSoloCommandCenterModel(
  input: CommandCenterInput,
): SoloCommandCenterModel;
~~~

Implement named pure helpers: getPeriodKeys produces inclusive Vietnam-calendar keys for the chosen range and its equal-length predecessor; inPeriod checks normalized keys; normalizeIdentity prefers lowercased email and falls back to digits-only phone; buildRevenueTrend includes every calendar day; buildOrderStatuses preserves unknown statuses under Khác; buildTopCourses allocates paid revenue from order items; buildFunnel excludes unlinked records from conversion denominators; buildStudentGrowth counts first enrollment dates by paid/free/trial; buildAccessHealth classifies active/pending/expiring/error; buildPriorityTasks orders critical, warning, info, then oldest first. Do not import Supabase or React. If dataStatus for a source is error, preserve that status so the UI renders an error card rather than interpreting an empty source as zero.

- [ ] **Step 4: Run the pure-model tests**

Run: node --test tests/admin-solo-command-center-model.test.mjs

Expected: all model tests PASS with no network or environment variables.

- [ ] **Step 5: Commit**

~~~powershell
git add lib/admin/solo-command-center.ts tests/admin-solo-command-center-model.test.mjs
git commit -m "feat: add truthful admin reporting model"
~~~

## Task 3: Add Bounded Server Reads and the Visual Dashboard

**Files:**
- Create: services/adminCommandCenterService.ts
- Create: components/admin/solo-command-center/command-center-dashboard.tsx
- Create: components/admin/solo-command-center/command-center-charts.tsx
- Create: components/admin/solo-command-center/priority-queue.tsx
- Modify: app/admin/dashboard/page.tsx
- Modify: tests/admin-solo-command-center.test.mjs

- [ ] **Step 1: Add failing dashboard contracts**

Append assertions that app/admin/dashboard/page.tsx calls getSoloCommandCenterModel, that the chart file imports ResponsiveContainer, AreaChart, PieChart, BarChart, and that no primary dashboard/report source contains CAC, ROI, Deliverability, demo, or fallback arrays.

- [ ] **Step 2: Run RED**

Run: node --test tests/admin-solo-command-center.test.mjs

Expected: FAIL because the new service and components do not exist.

- [ ] **Step 3: Create the bounded server service**

Implement services/adminCommandCenterService.ts with this contract:

~~~ts
export async function getSoloCommandCenterModel(
  range: CommandCenterRange,
): Promise<SoloCommandCenterModel>;
~~~

Implement getSoloCommandCenterModel with Promise.allSettled over getAdminPaymentOrders, getAdminLeads, getAdminCourses, getAdminStudentAccessRecords, and getFailedStudentActivities. Pass successful arrays to buildSoloCommandCenterModel and pass dataStatus=error for each rejected source. Courses may fall back to an empty title lookup, but no failed business source may be represented as a successful zero. Add a bounded failed-activity query to activityLogService.ts using the existing explicit activityLogSelect, selected date range, failed status, descending creation date, and maximum 200 rows.

- [ ] **Step 4: Build real responsive charts**

In command-center-charts.tsx use "use client", Recharts ResponsiveContainer, accessibilityLayer, Vietnamese tooltips, and no hard-coded business values. The chart component contract is:

~~~tsx
export function CommandCenterCharts({ model }: { model: SoloCommandCenterModel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <RevenueTrendChart rows={model.revenueTrend} status={model.dataStatus.orders} />
      <OrderStatusChart rows={model.orderStatuses} status={model.dataStatus.orders} />
      <TopCoursesChart rows={model.topCourses} status={model.dataStatus.orders} />
      <FunnelChart rows={model.funnel.rows} unlinkedCount={model.funnel.unlinkedCount} status={model.dataStatus.leads} />
      <StudentGrowthChart rows={model.studentGrowth} status={model.dataStatus.students} />
      <AccessHealthChart rows={model.accessHealth} status={model.dataStatus.students} />
    </div>
  );
}
~~~

Implement all six named chart components in the same file. RevenueTrendChart uses AreaChart with current and previous Area series. OrderStatusChart uses PieChart and Pie. TopCoursesChart uses a horizontal BarChart. FunnelChart uses BarChart and visibly prints unlinkedCount. StudentGrowthChart uses stacked paid/free/trial Bar series. AccessHealthChart uses PieChart and four semantic states. Every chart is wrapped by ResponsiveContainer with height 320, uses accessibilityLayer, and renders a Vietnamese tooltip. When status is error, render Không tải được dữ liệu instead of a graph or zero.

Use a dynamic import from command-center-dashboard.tsx with ssr false for the client chart bundle. Render KPI cards and PriorityQueue before the lazy chart boundary. Use a fixed 320px chart skeleton. Put KPI/queue and charts in separate Suspense boundaries; both may await the same memoized model promise, while dataStatus keeps source failures section-local. The refresh button uses router.refresh inside useTransition and remains disabled until 60 seconds after model.generatedAt, except when any dataStatus is error.

- [ ] **Step 5: Replace the dashboard page**

Parse searchParams from/to, default to the most recent 30 Vietnam-calendar days, fetch the model once, and render:

~~~tsx
return (
  <ProtectedAdminShell nextPath="/admin/dashboard" allowedRoles={["owner"]}>
    <CommandCenterDashboard model={model} />
  </ProtectedAdminShell>
);
~~~

- [ ] **Step 6: Run contracts, typecheck, and a production build**

Run:

~~~powershell
node --test tests/admin-solo-command-center.test.mjs tests/admin-solo-command-center-model.test.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run build
~~~

Expected: tests PASS, TypeScript exits 0, Next.js build exits 0.

- [ ] **Step 7: Commit**

~~~powershell
git add app/admin/dashboard/page.tsx components/admin/solo-command-center lib/admin/solo-command-center.ts services/adminCommandCenterService.ts services/activityLogService.ts tests/admin-solo-command-center.test.mjs
git commit -m "feat: add solo business command center dashboard"
~~~

## Task 4: Add the Full Priority Queue, Reports, and Safe CSV

**Files:**
- Create: app/admin/viec-can-xu-ly/page.tsx
- Create: app/admin/bao-cao/page.tsx
- Create: app/api/admin/reports/export/route.ts
- Modify: tests/admin-solo-command-center.test.mjs

- [ ] **Step 1: Write failing route contracts**

Require both pages to use getSoloCommandCenterModel and ProtectedAdminShell. Require the CSV route to call getCurrentAuth, allow owner only, set text/csv; charset=utf-8, prefix UTF-8 BOM, and omit email, phone, password, token, metadata, and notes columns.

- [ ] **Step 2: Run RED**

Run: node --test tests/admin-solo-command-center.test.mjs

Expected: FAIL with missing report/queue routes.

- [ ] **Step 3: Implement queue and report pages**

The queue page renders model.priorityTasks with severity filters and links; it performs no mutations. The report page renders the same six chart groups at larger size, the course summary table, data definitions, unlinked funnel disclosure, date controls, and an export link preserving from/to.

- [ ] **Step 4: Implement aggregate-only CSV**

The CSV route emits these columns only:

~~~ts
const rows = [
  ["Loại", "Nhãn", "Giá trị", "Từ ngày", "Đến ngày"],
  ["KPI", "Doanh thu đã thanh toán", model.kpis.revenue.value, range.from, range.to],
  ["KPI", "Đơn đã thanh toán", model.kpis.paidOrders.value, range.from, range.to],
  ...model.topCourses.map((row) => ["Khóa học", row.title, row.revenue, range.from, range.to]),
];
~~~

Escape quotes, commas, and newlines. Prefix with the UTF-8 BOM so Vietnamese opens correctly in Excel.

- [ ] **Step 5: Verify**

Run:

~~~powershell
node --test tests/admin-solo-command-center.test.mjs
npx.cmd tsc --noEmit --pretty false
~~~

Expected: PASS and exit 0.

- [ ] **Step 6: Commit**

~~~powershell
git add app/admin/viec-can-xu-ly app/admin/bao-cao app/api/admin/reports/export tests/admin-solo-command-center.test.mjs
git commit -m "feat: add admin reports and operational queue"
~~~

## Task 5: Remove the Student Activity N+1 Pattern

**Files:**
- Create: app/api/admin/students/activity/route.ts
- Create: components/admin/student-activity-timeline.tsx
- Create: tests/admin-student-activity-lazy.test.mjs
- Modify: app/admin/hoc-vien/page.tsx
- Modify: components/admin/student-access-actions.tsx
- Modify: tests/admin-performance-guardrails.test.mjs

- [ ] **Step 1: Write the N+1 regression test**

~~~js
test("student list does not preload one activity query per student", () => {
  const page = read("app/admin/hoc-vien/page.tsx");
  assert.doesNotMatch(page, /getStudentActivityLogs/);
  assert.doesNotMatch(page, /activityLogEntries|activityLogsByStudentId/);
});

test("student detail loads one bounded timeline on demand", () => {
  const actions = read("components/admin/student-access-actions.tsx");
  const route = read("app/api/admin/students/activity/route.ts");
  assert.match(actions, /\/api\/admin\/students\/activity/);
  assert.match(actions, /isPreviewOpen/);
  assert.match(route, /limit:\s*20/);
  assert.match(route, /canAccessAdminRole/);
});
~~~

- [ ] **Step 2: Run RED**

Run: node --test tests/admin-student-activity-lazy.test.mjs tests/admin-performance-guardrails.test.mjs

Expected: FAIL because the list still calls getStudentActivityLogs in Promise.all.

- [ ] **Step 3: Add the protected bounded endpoint**

GET /api/admin/students/activity?email=student%40example.com checks owner/editor auth, validates email, calls getStudentActivityLogs with limit 20, and returns { ok: true, activities }. Never accepts a caller-provided unbounded limit.

- [ ] **Step 4: Load the timeline only after detail opens**

Remove activityLogs from StudentAccessActions props. StudentActivityTimeline receives student.email and, once mounted in the open detail view, fetches the endpoint once, renders loading/error/empty states, and exposes a manual retry. Abort the request on unmount.

- [ ] **Step 5: Verify**

Run:

~~~powershell
node --test tests/admin-student-activity-lazy.test.mjs tests/admin-performance-guardrails.test.mjs tests/student-access-admin-controls.test.mjs
npx.cmd tsc --noEmit --pretty false
~~~

Expected: PASS and exit 0.

- [ ] **Step 6: Commit**

~~~powershell
git add app/admin/hoc-vien/page.tsx app/api/admin/students/activity components/admin/student-access-actions.tsx components/admin/student-activity-timeline.tsx tests/admin-student-activity-lazy.test.mjs tests/admin-performance-guardrails.test.mjs tests/student-access-admin-controls.test.mjs
git commit -m "perf: lazy load student activity history"
~~~

## Task 6: Add the Durable Provisioning Operation Journal

**Files:**
- Create: supabase/migrations/20260711090000_admin_student_provisioning_operations.sql
- Create: services/studentProvisioningOperationService.ts
- Create: tests/admin-student-provisioning.test.mjs

- [ ] **Step 1: Write failing operation-store contracts**

Test that the migration contains a unique operation_id, request_fingerprint, safe jsonb result, no password column, RLS enabled, and owner/editor policies. Test that the service rejects the same operation ID with a different fingerprint and returns completed safe outcomes for a replay.

- [ ] **Step 2: Run RED**

Run: node --test tests/admin-student-provisioning.test.mjs

Expected: FAIL because the migration and service do not exist.

- [ ] **Step 3: Create the additive migration**

Use this table shape:

~~~sql
create table if not exists public.admin_student_provisioning_operations (
  id uuid primary key default gen_random_uuid(),
  operation_id text not null unique,
  request_fingerprint text not null,
  mode text not null check (mode in ('paid', 'free', 'trial')),
  status text not null check (status in ('running', 'partial', 'completed', 'failed')),
  current_step text not null,
  order_code text,
  safe_result jsonb not null default '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_student_provisioning_operations enable row level security;
revoke all on public.admin_student_provisioning_operations from anon, authenticated;
grant select, insert, update on public.admin_student_provisioning_operations to authenticated;
~~~

Add policies using the existing admin-role JWT expression from 20260615183000_crm_v2.sql. Do not add email, phone, password, temporary_password, token, or raw request columns.

- [ ] **Step 4: Implement claim/resume primitives**

Export:

~~~ts
export async function claimProvisioningOperation(input: {
  operationId: string;
  requestFingerprint: string;
  mode: ProvisioningMode;
  actorId: string | null;
}): Promise<{ state: "new" | "resume" | "complete"; operation: ProvisioningOperation }>;

export async function saveProvisioningOutcome(input: {
  operationId: string;
  status: ProvisioningOperationStatus;
  currentStep: ProvisioningStep;
  orderCode?: string | null;
  safeResult: SafeProvisioningResult;
}): Promise<void>;
~~~

Generate the fingerprint on the server from normalized mode, email, phone, sorted course slugs, trial expiry, and sendEmail using node:crypto SHA-256. Never include temporaryPassword.

- [ ] **Step 5: Verify and commit**

Run: node --test tests/admin-student-provisioning.test.mjs

Expected: PASS.

~~~powershell
git add supabase/migrations/20260711090000_admin_student_provisioning_operations.sql services/studentProvisioningOperationService.ts tests/admin-student-provisioning.test.mjs
git commit -m "feat: add idempotent student provisioning journal"
~~~

## Task 7: Build the Paid, Free, and Trial Orchestrator

**Files:**
- Create: services/studentProvisioningService.ts
- Modify: services/lmsService.ts
- Modify: tests/admin-student-provisioning.test.mjs
- Modify: tests/student-account.test.mjs

- [ ] **Step 1: Add failing orchestration tests**

Use dependency injection so tests can supply spies. Assert:

- paid calls createManualPaidOrder, ensureStudentAccountForPaidOrder, enrollment verification, and sendPaymentSuccessEmail once;
- free/trial never call createManualPaidOrder;
- free/trial call ensureStudentAccountForAccessGrant and addLmsEnrollment;
- trial passes expiresAt;
- email failure returns partial while account/access remain success;
- completed replay performs no dependency call;
- an existing/OAuth account is not blindly reset;
- safeResult contains no password.

- [ ] **Step 2: Run RED**

Run: node --test tests/admin-student-provisioning.test.mjs tests/student-account.test.mjs

Expected: FAIL because provisionStudent does not exist.

- [ ] **Step 3: Define the structured result**

~~~ts
export type ProvisioningMode = "paid" | "free" | "trial";
export type StepState = "created" | "existing" | "granted" | "sent" | "skipped" | "failed" | "not_applicable";
export type ProvisionStudentResult = {
  ok: boolean;
  operationId: string;
  student: { state: StepState; reason?: string };
  order: { state: StepState; orderCode?: string; reason?: string };
  access: { state: StepState; courseSlugs: string[]; reason?: string };
  email: { state: StepState; reason?: string };
  temporaryCredential?: { email: string; temporaryPassword: string };
  nextActions: Array<"retry_access" | "retry_email">;
};
~~~

temporaryCredential is returned only in the authenticated HTTP response and must be removed before safeResult is persisted.

- [ ] **Step 4: Implement stepwise resume**

provisionStudent claims the operation, re-reads existing state, and performs only incomplete steps. Paid mode reuses createManualPaidOrder, ensureStudentAccountForPaidOrder, and sendPaymentSuccessEmail. Free/trial reuse ensureStudentAccountForAccessGrant, getCourses, createLeadAdmin, addLmsEnrollment, and sendStudentAccessEmail. Each completed step calls saveProvisioningOutcome before moving to the next step.

- [ ] **Step 5: Enforce trial expiry in entitlement resolution**

In services/lmsService.ts, update enrollment matching:

~~~ts
function isEnrollmentCurrentlyActive(enrollment: LmsEnrollment, now = Date.now()) {
  if (!enrollmentAccessStatuses.has(enrollment.status)) return false;
  if (!enrollment.expiresAt) return true;
  const expiry = Date.parse(enrollment.expiresAt);
  return Number.isFinite(expiry) && expiry > now;
}
~~~

Use this helper in findMatchingEnrollments. Add tests proving an expired trial is denied and a future trial is allowed.

- [ ] **Step 6: Verify and commit**

Run:

~~~powershell
node --test tests/admin-student-provisioning.test.mjs tests/student-account.test.mjs tests/lms-management-contract.test.mjs
npx.cmd tsc --noEmit --pretty false
~~~

Expected: PASS and exit 0.

~~~powershell
git add services/studentProvisioningService.ts services/lmsService.ts tests/admin-student-provisioning.test.mjs tests/student-account.test.mjs tests/lms-management-contract.test.mjs
git commit -m "feat: orchestrate paid free and trial students"
~~~

## Task 8: Replace the Buried Form with the Unified Wizard

**Files:**
- Create: components/admin/student-provisioning-wizard.tsx
- Modify: components/admin/student-create-dialog.tsx
- Modify: app/api/admin/students/grant/route.ts
- Modify: app/admin/hoc-vien/page.tsx
- Modify: components/admin/solo-command-center/command-center-dashboard.tsx
- Modify: tests/student-access-admin-controls.test.mjs
- Modify: tests/admin-student-provisioning.test.mjs

- [ ] **Step 1: Write failing UI and API contracts**

Require paid/free/trial labels, three step labels, crypto.randomUUID operation ID, double-submit disabling, trial expiry input, send-email toggle, separate student/order/access/email result cards, and retry_access/retry_email actions. Require the route to delegate to provisionStudent and never contain direct createManualPaidOrder orchestration.

- [ ] **Step 2: Run RED**

Run: node --test tests/student-access-admin-controls.test.mjs tests/admin-student-provisioning.test.mjs

Expected: FAIL because the old single form and monolithic route remain.

- [ ] **Step 3: Make the API a thin authenticated adapter**

The POST body is:

~~~ts
type RequestBody = {
  operationId: string;
  mode: "paid" | "free" | "trial";
  name: string;
  phone: string;
  email: string;
  courseSlugs: string[];
  source: string;
  note?: string;
  trialExpiresAt?: string;
  sendEmail: boolean;
  temporaryPassword?: string;
};
~~~

Keep rate limit and owner/editor checks in the route. Normalize and validate all fields, validate future trial expiry, then call provisionStudent. Return HTTP 200 for complete, 207 for partial, 409 for operation-ID fingerprint conflict, 400 for invalid input, 403 for role failure, and 500 only for an unclassified server failure.

- [ ] **Step 4: Build the three-step wizard**

State shape:

~~~ts
type WizardStep = 1 | 2 | 3;
type WizardState = {
  step: WizardStep;
  mode: "paid" | "free" | "trial";
  name: string;
  phone: string;
  email: string;
  courseSlugs: string[];
  source: string;
  note: string;
  trialExpiresAt: string;
  sendEmail: boolean;
  operationId: string;
};
~~~

Generate operationId once when the drawer opens. Step 1 selects mode. Step 2 validates identity, courses, and trial expiry. Step 3 shows the exact action summary and requires one explicit Tạo học viên button. While submitted, disable navigation and submit. Render separate result cards and only the narrow retries returned by nextActions.

- [ ] **Step 5: Wire both entry points**

StudentCreateDialog renders StudentProvisioningWizard in student mode and preserves PaymentLinkForm behind a secondary Gửi form thanh toán tab. Dashboard Tạo học viên links to /admin/hoc-vien?add_student=1 so only one wizard implementation exists.

- [ ] **Step 6: Verify and commit**

Run:

~~~powershell
node --test tests/student-access-admin-controls.test.mjs tests/admin-student-provisioning.test.mjs tests/student-account.test.mjs tests/payment-success-email.test.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run lint
~~~

Expected: PASS and exit 0.

~~~powershell
git add app/api/admin/students/grant/route.ts app/admin/hoc-vien/page.tsx components/admin/student-create-dialog.tsx components/admin/student-provisioning-wizard.tsx components/admin/solo-command-center/command-center-dashboard.tsx tests/student-access-admin-controls.test.mjs tests/admin-student-provisioning.test.mjs
git commit -m "feat: add unified student provisioning wizard"
~~~

## Task 9: Full Regression, Authenticated Preview, and Visual Review

**Files:**
- Modify only files found by failing checks; no unrelated cleanup.

- [ ] **Step 1: Run the focused admin suite**

~~~powershell
node --test tests/admin-solo-command-center.test.mjs tests/admin-solo-command-center-model.test.mjs tests/admin-student-provisioning.test.mjs tests/admin-student-activity-lazy.test.mjs tests/admin-performance-guardrails.test.mjs tests/student-access-admin-controls.test.mjs tests/student-account.test.mjs tests/student-email-access-flow.test.mjs tests/crm-v2-contract.test.mjs
~~~

Expected: all focused tests PASS.

- [ ] **Step 2: Run repository gates**

~~~powershell
node --test tests\*.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run lint
npm.cmd run build
git diff --check
~~~

Expected: full Node suite PASS, typecheck/lint/build exit 0, no whitespace errors.

- [ ] **Step 3: Start local or preview verification**

Run the project from its absolute root. Do not run Vercel from E:\ or a parent workspace. Verify unauthenticated /admin redirects to login and admin POST routes return 403.

- [ ] **Step 4: Authenticated owner smoke**

With the owner's existing browser session, verify:

1. /admin opens /admin/dashboard.
2. All six chart groups use real data and show no demo values.
3. Date changes update KPIs and charts consistently.
4. Queue links open the right record.
5. Student list opens without eager activity requests.
6. Paid/free/trial wizard reaches the confirmation step.
7. Do not submit a real student during visual smoke unless the owner provides a designated test account.
8. Mobile 390px and desktop 1440px layouts have no clipped controls.

- [ ] **Step 5: Capture screenshots**

Capture desktop dashboard, mobile dashboard, paid wizard confirmation, free/trial mode, and partial-failure result using synthetic/local fixtures or an explicitly designated test account. Do not expose customer PII in screenshots.

- [ ] **Step 6: Route any verification failure back to its owning task**

Run git status --short and git diff --check. If a check fails, return to the task that owns the failing file, apply the smallest fix, rerun that task's exact focused command, and amend that task's commit. Do not create a mixed verification-fixes commit. If all checks pass, make no commit in this step.

## Task 10: Update Handoff Documentation and Release Readiness

**Files:**
- Modify: FEATURE_MAP.md
- Modify: CURRENT_STATE.md
- Modify: docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md
- Modify: SESSION_LOG.md

- [ ] **Step 1: Update feature routing and source maps**

Document the canonical admin routes, model/service/component map, chart definitions, operation journal, paid/free/trial flow, retry semantics, and lazy student activity endpoint. Do not include environment values or temporary credentials.

- [ ] **Step 2: Record verified state**

CURRENT_STATE.md must state actual test/build results and that production is unchanged. SESSION_LOG.md gets one concise 2026-07-11 entry with files, checks, remaining preview/production status, and risk.

- [ ] **Step 3: Re-run documentation safety checks**

Run:

~~~powershell
rg -n -i "password\s*=|api[_-]?key\s*=|access[_-]?token\s*=|service[_-]?role\s*=" FEATURE_MAP.md CURRENT_STATE.md docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md SESSION_LOG.md
git diff --check
~~~

Expected: no secret assignments; diff check exits 0.

- [ ] **Step 4: Commit**

~~~powershell
git add FEATURE_MAP.md CURRENT_STATE.md docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md SESSION_LOG.md
git commit -m "docs: hand off solo admin command center"
~~~

- [ ] **Step 5: Final deploy gate report**

Report focused tests, full tests, typecheck, lint, build, authenticated visual smoke, remaining risks, branch, and exact preview command. Do not deploy production, push Git, change domains, or relink Vercel without a separate explicit owner confirmation.
