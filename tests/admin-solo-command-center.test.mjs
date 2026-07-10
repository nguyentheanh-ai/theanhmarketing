import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

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
  assert.match(strictLeadReader, /select\("id,email,phone,created_at"\)/);
  assert.match(strictLeadReader, /createSupabaseAdminClient/);
  assert.doesNotMatch(strictLeadReader, /getLeads\(|getPaymentOrders|emailLogs|buildLeadFromOrder|fallbackLeads/);
  assert.match(adminData, /getAdminCommandCenterLeadsStrict[\s\S]*?getCommandCenterLeadsStrict\(\)/);
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

test("transition routes preserve task selection until full pages land", () => {
  const queueTransition = read("app/admin/viec-can-xu-ly/page.tsx");
  assert.match(queueTransition, /searchParams/);
  assert.match(queueTransition, /task/);
  assert.match(queueTransition, /\/admin\/dashboard\?task=/);
  assert.match(queueTransition, /#viec-can-xu-ly/);
  const reportTransition = read("app/admin/bao-cao/page.tsx");
  assert.match(reportTransition, /redirect\("\/admin\/dashboard#bao-cao"\)/);
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
