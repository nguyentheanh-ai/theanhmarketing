import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8").replace(/\r\n/g, "\n");

function parseAdminNavItems(shell) {
  const navGroupsSource = shell.match(/const adminNavGroups = \[([\s\S]*?)\] satisfies Array</)?.[1];
  assert.ok(navGroupsSource, "adminNavGroups source must be available to verify its exact contract");

  return [...navGroupsSource.matchAll(
    /\{\s*label:\s*"([^"]+)",\s*href:\s*"([^"]+)",\s*icon:\s*"[^"]+",\s*allowedRoles:\s*\[([^\]]*)\]\s*\}/g,
  )].map((match) => ({
    label: match[1],
    href: match[2],
    allowedRoles: [...match[3].matchAll(/"([^"]+)"/g)].map((role) => role[1]),
  }));
}

test("the complete admin entry chain defaults to the solo command center", () => {
  const index = read("app/admin/page.tsx");
  const dashboard = read("app/admin/dashboard/page.tsx");

  assert.match(index, /redirect\("\/admin\/dashboard"\)/);
  assert.match(dashboard, /getSoloCommandCenterModel\(range\)/);
  assert.match(dashboard, /await requireAdminAuth\("\/admin\/dashboard", \["owner"\]\)/);
  assert.ok(dashboard.indexOf("await requireAdminAuth") < dashboard.indexOf("await searchParams"));
  assert.ok(dashboard.indexOf("await requireAdminAuth") < dashboard.indexOf("getSoloCommandCenterModel(range)"));
  assert.match(dashboard, /<CommandCenterDashboard model=\{model\} selectedTaskId=\{selectedTaskId\}/);
  assert.match(dashboard, /<AdminShell adminRole=/);

  for (const [file, source] of [
    ["app/admin/page.tsx", index],
    ["app/admin/dashboard/page.tsx", dashboard],
  ]) {
    assert.doesNotMatch(source, /isCrmV2Enabled|\/admin\/crm-v2/, `${file} must not redirect the solo entry chain to CRM V2`);
  }
});

test("command center service performs bounded independent real-data reads", () => {
  const service = read("services/adminCommandCenterService.ts");
  const activities = read("services/activityLogService.ts");
  const leads = read("services/leadService.ts");
  const adminData = read("services/adminDataService.ts");

  assert.match(service, /Promise\.allSettled\(/);
  assert.match(service, /getCommandCenterAnalysisWindow/);
  assert.match(service, /COMMAND_CENTER_PAGE_SIZE/);
  assert.match(service, /MAX_COMMAND_CENTER_SOURCE_ROWS/);
  for (const readName of [
    "getAdminPaymentOrdersStrict",
    "getAdminCommandCenterLeadsStrict",
    "getCourseSummariesStrict",
    "getCommandCenterEnrollmentsStrict",
    "getCommandCenterStudentActivities",
  ]) {
    assert.match(service, new RegExp(readName));
  }
  assert.match(service, /generatedAt\s*=\s*new Date\(\)/);
  assert.match(service, /paymentEmailSentAt:\s*order\.paymentEmailSentAt/);
  assert.doesNotMatch(service, /emailSentAt:\s*order\.|paymentSuccessEmailSentAt:\s*order\./);
  assert.match(service, /mapCommandCenterEnrollment/);
  assert.doesNotMatch(service, /StudentAccessRecord|getAdminStudentAccessRecords/);

  assert.match(activities, /const activityLogSelect/);
  assert.match(activities, /getCommandCenterStudentActivities/);
  assert.match(activities, /getCommandCenterActivityQuery/);
  assert.match(activities, /\.gte\("created_at"/);
  assert.match(activities, /\.lte\("created_at"/);
  assert.match(activities, /order\("created_at",\s*\{\s*ascending:\s*false\s*\}\)/);
  assert.match(activities, /\.limit\(limit\)/);
  assert.doesNotMatch(activities, /getCommandCenterStudentActivities[\s\S]*?\.eq\("status",\s*"failed"\)/);
  assert.match(service, /courses:\s*courses\.status/);

  const strictLeadReader = leads.match(/export async function getCommandCenterLeadsStrict[\s\S]*?\n}(?=\n\nexport async function getLeads)/)?.[0] ?? "";
  assert.match(strictLeadReader, /select\("id,email,phone,created_at",\s*\{\s*count:\s*"exact"\s*\}\)/);
  assert.match(strictLeadReader, /createSupabaseAdminClient/);
  assert.doesNotMatch(strictLeadReader, /getLeads\(|getPaymentOrders|emailLogs|buildLeadFromOrder|fallbackLeads/);
  assert.match(adminData, /getAdminCommandCenterLeadsStrict[\s\S]*?getCommandCenterLeadsStrict\(window\)/);
});

test("strict command-center readers paginate bounded source windows without raw LMS fallback", () => {
  const orders = read("services/orderService.ts");
  const leads = read("services/leadService.ts");
  const courses = read("services/courseService.ts");
  const lms = read("services/lmsService.ts");
  const adminData = read("services/adminDataService.ts");
  const migration = read("supabase/migrations/20260711100000_command_center_reporting.sql");

  assert.match(orders, /getCommandCenterOrdersStrict/);
  assert.match(orders, /paid_at/);
  assert.match(orders, /created_at/);
  assert.match(orders, /\.eq\("status",\s*"pending"\)/);
  assert.match(orders, /\.range\(/);
  assert.match(orders, /select\(orderBaseSelectFields,\s*\{\s*count:\s*"exact"\s*\}\)/);
  assert.match(orders, /getCommandCenterOrdersStrict[\s\S]*?\.order\("id",\s*\{\s*ascending:\s*true\s*\}\)/);
  assert.match(leads, /getCommandCenterLeadsStrict[\s\S]*?\.gte\("created_at"/);
  assert.match(leads, /getCommandCenterLeadsStrict[\s\S]*?\.lt\("created_at"/);
  assert.match(leads, /getCommandCenterLeadsStrict[\s\S]*?\.range\(/);
  assert.match(leads, /select\("id,email,phone,created_at",\s*\{\s*count:\s*"exact"\s*\}\)/);
  assert.match(leads, /getCommandCenterLeadsStrict[\s\S]*?\.order\("id",\s*\{\s*ascending:\s*true\s*\}\)/);
  assert.match(courses, /getCourseSummariesStrict[\s\S]*?\.range\(/);
  assert.match(courses, /select\("id,slug,title",\s*\{\s*count:\s*"exact"\s*\}\)/);
  assert.match(courses, /getCourseSummariesStrict[\s\S]*?\.order\("id",\s*\{\s*ascending:\s*true\s*\}\)/);
  assert.match(lms, /crm_v2_command_center_enrollments_page/);
  const commandReader = lms.match(/export async function getCommandCenterEnrollmentsStrict[\s\S]*?\n}/)?.[0] ?? "";
  assert.doesNotMatch(commandReader, /crm_v2_lms_enrollments_raw/);
  assert.match(adminData, /getCommandCenterOrdersStrict/);

  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = public, crm_v2/i);
  assert.match(migration, /grant execute[\s\S]*service_role/i);
  assert.match(migration, /revoke all[\s\S]*public, anon, authenticated/i);
  assert.match(migration, /total_count/);
  assert.match(migration, /has_more/);
  assert.doesNotMatch(migration, /course_progress|lessons|resources/i);
  assert.doesNotMatch(migration, /crm_v2_lms_enrollments_raw/);
});

test("command center range resolves Vietnam days and rejects invalid query ranges", () => {
  const script = `
    import { resolveCommandCenterRange } from "./services/adminCommandCenterService.ts";
    const now = new Date("2026-07-10T17:30:00Z");
    console.log(JSON.stringify({
      defaultRange: resolveCommandCenterRange({}, now),
      validRange: resolveCommandCenterRange({ from: "2026-07-01", to: "2026-07-05" }, now),
      reversedRange: resolveCommandCenterRange({ from: "2026-07-05", to: "2026-07-01" }, now),
      impossibleRange: resolveCommandCenterRange({ from: "2026-02-30", to: "2026-03-01" }, now),
    }));
  `;
  const result = JSON.parse(execFileSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script],
    { cwd: process.cwd(), encoding: "utf8" },
  ));

  assert.deepEqual(result, {
    defaultRange: { from: "2026-06-12", to: "2026-07-11" },
    validRange: { from: "2026-07-01", to: "2026-07-05" },
    reversedRange: { from: "2026-06-12", to: "2026-07-11" },
    impossibleRange: { from: "2026-06-12", to: "2026-07-11" },
  });
});

test("visual command center renders truthful lazy chart and queue contracts", () => {
  const dashboard = read("components/admin/solo-command-center/command-center-dashboard.tsx");
  const charts = read("components/admin/solo-command-center/command-center-charts.tsx");
  const chartErrorBoundaryPath = "components/admin/solo-command-center/chart-error-boundary.tsx";
  const chartErrorBoundary = fs.existsSync(path.resolve(chartErrorBoundaryPath)) ? read(chartErrorBoundaryPath) : "";
  const queue = read("components/admin/solo-command-center/priority-queue.tsx");

  assert.match(dashboard, /dynamic\(/);
  assert.match(dashboard, /ssr:\s*false/);
  assert.match(dashboard, /h-\[320px\]/);
  assert.match(dashboard, /60_000/);
  assert.match(dashboard, /router\.refresh\(\)/);
  assert.match(dashboard, /\/admin\/hoc-vien\?add_student=1/);
  assert.match(dashboard, /\/admin\/bao-cao/);
  assert.match(dashboard, /Asia\/Ho_Chi_Minh/);
  assert.match(dashboard, /Chưa có kỳ so sánh/);
  assert.match(dashboard, /<PriorityQueue/);
  assert.match(dashboard, /<ChartErrorBoundary onRetry=\{refresh\} resetKey=\{model\.generatedAt\}>/);
  assert.match(dashboard, /<ChartErrorBoundary[\s\S]*?<Suspense[\s\S]*?<CommandCenterCharts[\s\S]*?<\/Suspense>[\s\S]*?<\/ChartErrorBoundary>/);
  assert.doesNotMatch(dashboard, /<ChartErrorBoundary[\s\S]*?<PriorityQueue/);

  assert.match(chartErrorBoundary, /class ChartErrorBoundary extends (?:React\.)?Component/);
  assert.match(chartErrorBoundary, /static getDerivedStateFromError/);
  assert.match(chartErrorBoundary, /componentDidUpdate/);
  assert.match(chartErrorBoundary, /prevProps\.resetKey\s*!==\s*this\.props\.resetKey/);
  assert.match(chartErrorBoundary, /this\.setState\(\{\s*hasError:\s*false\s*\}\)/);
  assert.match(chartErrorBoundary, /Không tải được biểu đồ/);
  assert.match(chartErrorBoundary, /h-\[320px\]/);

  for (const chartImport of ["ResponsiveContainer", "AreaChart", "PieChart", "BarChart"]) {
    assert.match(charts, new RegExp(chartImport));
  }
  assert.match(charts, /accessibilityLayer/);
  for (const chartName of [
    "RevenueTrendChart",
    "OrderStatusChart",
    "TopCoursesChart",
    "FunnelChart",
    "StudentGrowthChart",
    "AccessHealthChart",
  ]) {
    assert.match(charts, new RegExp(`function ${chartName}`));
  }
  assert.match(charts, /Không tải được dữ liệu/);
  assert.match(charts, /height=\{320\}/);
  assert.match(charts, /TopCoursesChart[\s\S]*?combinedStatus\(model\.dataStatus\.orders,\s*model\.dataStatus\.courses\)/);
  assert.match(charts, /toSafeTopCourseDisplayRows/);

  assert.match(queue, /id="viec-can-xu-ly"/);
  assert.match(queue, /model\.priorityTasks/);
  assert.match(queue, /Không có việc khẩn cấp/);
  assert.match(queue, /model\.dataStatus/);
  assert.match(queue, /selectedTaskId/);
  assert.match(queue, /aria-current/);
  assert.match(queue, /data-selected/);
  assert.match(queue, /id=\{`task-/);
  assert.match(queue, /Xem hướng xử lý/);
  assert.match(queue, /Hướng xử lý/);
  assert.match(queue, /getSelectedPriorityTaskDetail/);
});

test("primary command center sources contain no fake or advertising-profit metrics", () => {
  const sources = [
    "services/adminCommandCenterService.ts",
    "components/admin/solo-command-center/command-center-dashboard.tsx",
    "components/admin/solo-command-center/command-center-charts.tsx",
  ].map(read).join("\n");

  assert.doesNotMatch(sources, /fallbackOrders|fallbackLeads|demo|sample/i);
  assert.doesNotMatch(sources, /\bCAC\b|\bROI\b|Deliverability|ad profit|lợi nhuận quảng cáo/i);
});

test("owner shell exposes the approved solo navigation", () => {
  const shell = read("components/app/admin-shell.tsx");
  const navItems = parseAdminNavItems(shell);

  const ownerItems = navItems
    .filter((item) => item.allowedRoles.includes("owner"))
    .map(({ label, href }) => ({ label, href }));

  assert.deepEqual(ownerItems, [
    { label: "Tổng quan", href: "/admin/dashboard" },
    { label: "Việc cần xử lý", href: "/admin/viec-can-xu-ly" },
    { label: "Học viên", href: "/admin/hoc-vien" },
    { label: "Đơn hàng", href: "/admin/don-hang" },
    { label: "Leads", href: "/admin/leads" },
    { label: "Khóa học", href: "/admin/khoa-hoc" },
    { label: "Báo cáo", href: "/admin/bao-cao" },
    { label: "Cài đặt", href: "/admin/cai-dat" },
  ]);

  assert.doesNotMatch(shell, /Team|Automation|Segments|Integrations/);
});

test("editor shell and settings preserve the approved role boundaries", () => {
  const shell = read("components/app/admin-shell.tsx");
  const settings = read("app/admin/cai-dat/page.tsx");
  const editorItems = parseAdminNavItems(shell)
    .filter((item) => item.allowedRoles.includes("editor"))
    .map(({ label, href }) => ({ label, href }));

  assert.deepEqual(editorItems, [
    { label: "Học viên", href: "/admin/hoc-vien" },
    { label: "Khóa học", href: "/admin/khoa-hoc" },
  ]);
  assert.match(settings, /allowedRoles=\{\["owner"\]\}/);
});

test("queue and report are real owner pages with auth before range and one strict model read", () => {
  for (const [route, file] of [
    ["/admin/viec-can-xu-ly", "app/admin/viec-can-xu-ly/page.tsx"],
    ["/admin/bao-cao", "app/admin/bao-cao/page.tsx"],
  ]) {
    const source = read(file);
    assert.match(source, new RegExp(`requireAdminAuth\\(\"${route.replaceAll("/", "\\/")}\", \\[\"owner\"\\]\\)`));
    assert.ok(source.indexOf("await requireAdminAuth") < source.indexOf("await searchParams"));
    assert.ok(source.indexOf("await requireAdminAuth") < source.indexOf("const range = resolveCommandCenterRange"));
    assert.equal(source.match(/getSoloCommandCenterModel\(range\)/g)?.length, 1);
    assert.match(source, /<AdminShell adminRole=/);
    assert.doesNotMatch(source, /redirect\(/);
  }

  const queue = read("app/admin/viec-can-xu-ly/page.tsx");
  assert.match(queue, /filterPriorityQueue/);
  assert.match(queue, /selectedTaskId/);
  assert.match(queue, /<PriorityQueue/);
  assert.match(queue, /basePath="\/admin\/viec-can-xu-ly"/);

  const report = read("app/admin/bao-cao/page.tsx");
  assert.match(report, /<CommandCenterReport/);
  assert.match(report, /from/);
  assert.match(report, /to/);
});

test("detailed report reuses lazy accessible charts and exposes only truthful aggregates", () => {
  const report = read("components/admin/solo-command-center/command-center-report.tsx");
  assert.match(report, /dynamic\(/);
  assert.match(report, /ssr:\s*false/);
  assert.match(report, /<ChartErrorBoundary/);
  assert.match(report, /router\.refresh\(\)/);
  assert.match(report, /<CommandCenterCharts model=\{model\}/);
  assert.match(report, /Asia\/Ho_Chi_Minh/);
  assert.match(report, /model\.generatedAt/);
  assert.match(report, /model\.topCourses/);
  assert.match(report, /row\.revenue/);
  assert.match(report, /row\.paidOrders/);
  assert.match(report, /safeCourseDisplayTitle\(row\)/);
  assert.doesNotMatch(report, /\{row\.title\}/);
  assert.match(report, /model\.funnel\.rows/);
  assert.match(report, /model\.funnel\.unlinkedCount/);
  assert.match(report, /\/api\/admin\/reports\/export/);
  assert.doesNotMatch(report, /\bCAC\b|\bROI\b|\bROAS\b|ad spend|ad profit|Deliverability|demo data/i);
});

test("CSV export authenticates owner before query parsing or model reads and fails closed", () => {
  const route = read("app/api/admin/reports/export/route.ts");
  assert.match(route, /getCurrentAuth\(\)/);
  assert.match(route, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.ok(route.indexOf("await getCurrentAuth") < route.indexOf("new URL(request.url)"));
  assert.ok(route.indexOf("await getCurrentAuth") < route.indexOf("const range = resolveCommandCenterRange"));
  assert.ok(route.indexOf("await getCurrentAuth") < route.indexOf("getSoloCommandCenterModel(range)"));
  assert.match(route, /createPrivateNoStoreJson\([\s\S]*?,\s*403,/);
  assert.match(route, /createPrivateNoStoreJson\([\s\S]*?,\s*503,/);
  assert.match(route, /text\/csv; charset=utf-8/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /attachment;/);
  assert.match(route, /createPrivateNoStoreJson/);
  assert.doesNotMatch(route, /isAuthGuardEnabled/);
});

test("date navigation owns pending state and remounts custom date values", () => {
  const dashboard = read("components/admin/solo-command-center/command-center-dashboard.tsx");
  assert.match(dashboard, /function DateControls[\s\S]*?const \[isPending, startTransition\] = useTransition\(\)/);
  assert.match(dashboard, /key=\{`\$\{model\.range\.from\}:\$\{model\.range\.to\}`\}/);
  assert.match(dashboard, /disabled=\{isPending\}/);
  assert.doesNotMatch(dashboard, /function DateControls\(\{ model, pending \}/);
  assert.match(dashboard, /getVietnamCurrentMonthRange\(model\.generatedAt\)/);
  assert.doesNotMatch(dashboard, /model\.range\.to\.slice\(0, 7\)/);
});

test("chart boundary exposes safe retry and controlled logging", () => {
  const boundary = read("components/admin/solo-command-center/chart-error-boundary.tsx");
  const dashboard = read("components/admin/solo-command-center/command-center-dashboard.tsx");
  assert.match(boundary, /onRetry/);
  assert.match(boundary, /componentDidCatch/);
  assert.match(boundary, /command-center-chart/);
  assert.match(boundary, /Thử lại/);
  assert.match(dashboard, /onRetry=\{refresh\}/);
});
