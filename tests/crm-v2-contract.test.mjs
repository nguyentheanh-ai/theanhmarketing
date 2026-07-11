import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walkFiles(relativePath, extensions = new Set([".ts", ".tsx", ".mjs", ".md"])) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) return [];
  const stats = fs.statSync(target);
  if (stats.isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(relativePath, entry.name);
    if (entry.isDirectory()) return walkFiles(next, extensions);
    return extensions.has(path.extname(entry.name)) ? [path.join(root, next)] : [];
  });
}

test("crm v2 required docs, mockups, scripts, and smoke tests exist", () => {
  const requiredPaths = [
    "docs/crm-v2/SCHEMA_AUDIT.md",
    "docs/crm-v2/DATA_MIGRATION_PLAN.md",
    "docs/crm-v2/VISUAL_SPEC.md",
    "docs/crm-v2/FUNCTIONAL_AUDIT.md",
    "docs/crm-v2/IMPLEMENTATION_STATUS.md",
    "docs/crm-v2/README.md",
    "scripts/crm-v2/audit-current-data.ts",
    "scripts/crm-v2/backfill-crm-v2.ts",
    "scripts/crm-v2/verify-migration.ts",
    "scripts/crm-v2/seed-crm-v2-demo.ts",
    "tests/playwright/crm-v2.spec.ts",
  ];

  for (const relativePath of requiredPaths) {
    assert.ok(exists(relativePath), `${relativePath} must exist`);
  }

  const mockupsDir = path.join(root, "docs/crm-v2/mockups");
  const mockups = fs.readdirSync(mockupsDir).filter((file) => file.endsWith(".png"));
  assert.equal(mockups.length, 10, "CRM v2 should keep all 10 supplied mockups");
  assert.ok(mockups.includes("03-leads-pipeline.png"), "mockups should be copied with stable names");

  const readme = read("docs/crm-v2/README.md");
  assert.match(readme, /CRM_V2_ENABLED/, "README documents the feature flag");
  assert.match(readme, /production.*không silently mock|Production safety/is, "README documents the no-production-mock rule");
  assert.match(readme, /backfill-crm-v2/, "README documents backfill");
  assert.match(readme, /verify-migration/, "README documents verification");
});

test("crm v2 production actions fail closed instead of silently mocking", () => {
  const featureFlag = read("lib/crm-v2/feature-flag.ts");
  const actionApis = [
    "app/api/admin/crm-v2/email/actions/route.ts",
    "app/api/admin/crm-v2/orders/actions/route.ts",
    "app/api/admin/crm-v2/segments/actions/route.ts",
    "app/api/admin/crm-v2/students/actions/route.ts",
    "app/api/admin/crm-v2/team/actions/route.ts",
    "app/api/admin/crm-v2/integrations/actions/route.ts",
    "app/api/admin/crm-v2/automation/actions/route.ts",
  ];

  assert.match(featureFlag, /process\.env\.NODE_ENV !== "production"/, "demo mode must be blocked in production");
  assert.match(featureFlag, /getCrmV2MissingLiveConfigMessage/, "missing live env must have a shared explicit message");
  for (const relativePath of actionApis) {
    const source = read(relativePath);
    assert.doesNotMatch(source, /shouldUseCrmV2DemoData\(\) \|\| !client/, `${relativePath} must not mix demo mode with missing live client`);
    assert.match(source, /getCrmV2MissingLiveConfigMessage/, `${relativePath} must return an explicit live config error`);
  }
});

test("crm v2 is the canonical admin destination with compatibility redirects", () => {
  const adminIndex = read("app/admin/page.tsx");
  const adminDashboard = read("app/admin/dashboard/page.tsx");
  const legacyLeads = read("app/admin/leads/page.tsx");
  const legacyOrders = read("app/admin/don-hang/page.tsx");
  const legacyStudents = read("app/admin/hoc-vien/page.tsx");
  const legacyCourses = read("app/admin/khoa-hoc/page.tsx");
  const legacyReports = read("app/admin/bao-cao/page.tsx");
  const crmLayout = read("app/admin/crm-v2/layout.tsx");
  const crmDashboard = read("app/admin/crm-v2/page.tsx");

  assert.match(adminIndex, /redirect\(\"\/admin\/crm-v2\"\)/, "admin index must default owners to CRM v2");
  assert.match(adminIndex, /redirect\(\"\/admin\/khoa-hoc\"\)/, "editor must keep the role-safe legacy course workspace");
  assert.match(adminDashboard, /redirect\(\"\/admin\/crm-v2\"\)/, "old dashboard must redirect to the canonical overview");
  assert.match(legacyLeads, /redirect\(\"\/admin\/crm-v2\/leads\"\)/);
  assert.match(legacyOrders, /redirect\(\"\/admin\/crm-v2\/orders\"\)/);
  assert.match(legacyStudents, /redirect\(\"\/admin\/crm-v2\/students\"\)/);
  assert.match(legacyCourses, /redirect\(\"\/admin\/crm-v2\/courses\"\)/);
  assert.match(legacyReports, /redirect\(\"\/admin\/crm-v2\/reports\"\)/);
  assert.match(crmLayout, /requireAdminAuth\(\"\/admin\/crm-v2\", \[\"owner\"\]\)/, "CRM v2 routes must remain owner-gated");
  assert.match(crmLayout, /isCrmV2Enabled/, "CRM v2 routes must keep their availability gate");
  assert.match(crmDashboard, /getCrmV2Dashboard/, "CRM v2 dashboard must remain available behind its route gate");
});

test("crm v2 shell exposes the executive operating system navigation", () => {
  const components = read("components/crm-v2/crm-components.tsx");

  for (const href of [
    "/admin/crm-v2",
    "/admin/crm-v2/leads",
    "/admin/crm-v2/orders",
    "/admin/crm-v2/students",
    "/admin/crm-v2/courses",
    "/admin/crm-v2/reports",
    "/admin/crm-v2/settings",
  ]) {
    assert.ok(components.includes(`href: "${href}"`), `primary navigation must include ${href}`);
  }

  assert.match(components, /Executive Operating System/);
  assert.match(components, /bg-\[#f4f6f9\]/);
  assert.match(components, /Nâng cao/);
  assert.doesNotMatch(components, /CRM hiện tại vẫn giữ nguyên\./);
});

test("lean solo admin keeps only verified modules and CRM-owned settings", () => {
  const shell = read("components/crm-v2/crm-components.tsx");
  const dataLayer = read("lib/crm-v2/data.ts");

  for (const href of [
    "/admin/crm-v2",
    "/admin/crm-v2/leads",
    "/admin/crm-v2/orders",
    "/admin/crm-v2/students",
    "/admin/crm-v2/courses",
    "/admin/crm-v2/reports",
    "/admin/crm-v2/settings",
  ]) assert.ok(shell.includes(`href: "${href}"`), `lean navigation must include ${href}`);

  for (const hiddenHref of ["/admin/crm-v2/email", "/admin/crm-v2/automation", "/admin/crm-v2/segments", "/admin/crm-v2/team", "/admin/crm-v2/integrations", "/admin/cai-dat"]) {
    assert.ok(!shell.includes(`href: "${hiddenHref}"`), `operator navigation must hide ${hiddenHref}`);
  }

  assert.ok(exists("app/admin/crm-v2/settings/page.tsx"));
  assert.ok(dataLayer.indexOf('if (/ebook/i.test(text)) return "Ebook"') < dataLayer.indexOf('if (/facebook/i.test(text)) return "FB Ads"'));
});

test("canonical dashboard renders only real actionable operating data", () => {
  const dashboardPage = read("app/admin/crm-v2/page.tsx");
  const dashboardCharts = read("components/crm-v2/dashboard-charts.tsx");
  const dataLayer = read("lib/crm-v2/data.ts");

  assert.match(dashboardPage, /getCrmV2Dashboard\(query\)/);
  assert.match(dashboardPage, /Trung tâm điều hành/);
  assert.match(dashboardPage, /Việc cần xử lý/);
  assert.match(dashboardPage, /href="\/admin\/crm-v2\/courses"/);
  assert.match(dashboardCharts, /Hiệu quả khóa học/);
  assert.doesNotMatch(dashboardPage, /data\.campaigns\.map/);
  assert.doesNotMatch(dashboardPage, /data\.workflows\.map/);
  assert.match(dataLayer, /label: "Doanh thu đã thanh toán"/);
  assert.match(dataLayer, /if \(error \|\| !data\) return getCrmV2DashboardDirectDataApi\(query\)/);
  assert.doesNotMatch(dataLayer, /const newLeadsToday = publicLeadCount/, "range lead count must not be mislabeled as today's count");
  assert.match(dataLayer, /query\.range === "today" \? "Lead mới hôm nay" : "Lead mới trong kỳ"/);
});

test("orders use selected-range aggregates instead of the current page and fake series", () => {
  const page = read("app/admin/crm-v2/orders/page.tsx");
  const client = read("components/crm-v2/orders-page-client.tsx");
  const dataLayer = read("lib/crm-v2/data.ts");

  assert.match(page, /getCrmV2OrderSummary\(query\)/);
  assert.match(client, /orderSummary/);
  assert.doesNotMatch(client, /rows\.reduce\(\(sum, row\).*row\.value/);
  assert.doesNotMatch(client, /series:\s*\[8,\s*12,\s*20/);
  assert.match(dataLayer, /dateLowerBound\(dateRange\.from\)[\s\S]*dateUpperBoundExclusive\(dateRange\.to\)/);
  assert.match(dataLayer, /export async function getCrmV2OrderSummary/);
});

test("solo dashboard uses adaptive charts and a fail-closed Meta Ads adapter", () => {
  const page = read("app/admin/crm-v2/page.tsx");
  const charts = read("components/crm-v2/dashboard-charts.tsx");
  const meta = read("services/metaAdsReportService.ts");

  assert.doesNotMatch(page, /SimpleBars|Hiệu quả Remarketing Email|Automation đang chạy/);
  assert.match(page, /getMetaAdsReport/);
  for (const chart of ["AreaChart", "BarChart", "PieChart", "ComposedChart", "ResponsiveContainer"]) assert.match(charts, new RegExp(chart));
  assert.match(meta, /META_ADS_ACCESS_TOKEN/);
  assert.match(meta, /META_ADS_AD_ACCOUNT_ID/);
  assert.match(meta, /hourly_stats_aggregated_by_advertiser_time_zone/);
  assert.doesNotMatch(meta, /mock|demo/i);
});

test("crm v2 source strings remain readable Vietnamese without mojibake", () => {
  const pathsToScan = [
    "app/admin/crm-v2",
    "components/crm-v2",
    "lib/crm-v2",
    "docs/crm-v2",
    "tests/playwright/crm-v2.spec.ts",
    "tests/crm-v2-core.unit.ts",
    "tests/crm-v2-migration-scripts.test.mjs",
  ];
  const mojibakePattern = /[\uFFFD\u0011]|[\u00c3\u00c4\u00c2\u00c6]|\u00e1[\u00ba\u00bb]/;
  const offenders = [];

  for (const scanPath of pathsToScan) {
    for (const absolutePath of walkFiles(scanPath)) {
      const content = fs.readFileSync(absolutePath, "utf8");
      content.split(/\r?\n/).forEach((line, index) => {
        if (mojibakePattern.test(line)) {
          offenders.push(`${path.relative(root, absolutePath)}:${index + 1}:${line}`);
        }
      });
    }
  }

  assert.deepEqual(offenders, []);
});

test("crm v2 visible Vietnamese copy keeps diacritics", () => {
  const pathsToScan = [
    "app/admin/crm-v2",
    "app/api/admin/crm-v2",
    "components/crm-v2",
    "lib/crm-v2",
    "tests/playwright/crm-v2.spec.ts",
  ];
  const forbiddenCopy = [
    "Tong quan CRM",
    "Outline CRM chuyen sau",
    "Phan khuc & Tag",
    "Don hang & Thanh toan",
    "Hoc vien & Khoa hoc",
    "Bao cao & Attribution",
    "Team & Phan quyen",
    "Tich hop",
    "Tim kiem CRM",
    "Tim ten",
    "so dien thoai",
    "Dong bo",
    "30 ngay",
    "Hom nay",
    "Hom qua",
    " ngay",
    "Unknown course",
    "Unknown product",
    "Lua chon",
    "Khong co du lieu",
    "Dieu chinh bo loc",
    "Tat ca",
    "Bo loc",
    "Dang tai",
    "dang gui",
    "khong doc duoc phan hoi",
    "Luu segment",
    "Gui nhac thanh toan",
    "Tao ticket",
    "Ghi audit quyen",
    "Kiem tra ket noi",
    "Mo workflow xu ly loi",
    "Tao chien dich",
    "Luu nhap",
    "Lich su",
    "Chon node",
    "Khong lay duoc du lieu",
    "Kiem tra lai",
    "Gui email",
    "Khong co",
    "Chua gan",
    "Chua co",
    "Thong tin lead",
    "Tong diem",
    "Cho phep marketing",
    "Goi y chuyen doi",
    "khong hop le",
    "Khong luu duoc",
    "Thieu Supabase",
    "vi thieu",
    "da tao",
    "da ghi",
    "ket noi",
    "phan quyen",
    "Blueprint",
    "Data safe",
    "Flag off",
    "CRM v2 on",
    "Checklist migration",
    "Legacy routes",
    "Untouched",
    "crm_v2 private",
    "Dry-run first",
    "legacy_id_map",
    "Row-count guard",
    "UI route ready",
    "Safety guard",
    "read-model",
    "Migration & Data Safety",
  ];
  const requiredCopy = [
    "Tổng quan CRM",
    "Đơn hàng & Thanh toán",
    "Gửi nhắc thanh toán",
    "Tìm tên, email, số điện thoại, mã đơn",
    "Bản đồ vận hành",
    "Ưu tiên vận hành",
    "Chế độ vận hành an toàn",
  ];
  const content = pathsToScan
    .flatMap((scanPath) => walkFiles(scanPath, new Set([".ts", ".tsx", ".mjs"])))
    .map((absolutePath) => fs.readFileSync(absolutePath, "utf8"))
    .join("\n");

  for (const phrase of forbiddenCopy) {
    assert.doesNotMatch(content, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `visible copy must use diacritics instead of "${phrase}"`);
  }
  for (const phrase of requiredCopy) {
    assert.match(content, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `expected accented copy "${phrase}"`);
  }
});

test("crm v2 outline hides implementation-only language from operators", () => {
  const outlineContent = fs.readFileSync(path.join(root, "app/admin/crm-v2/outline/page.tsx"), "utf8");
  const forbiddenOutlineCopy = [
    "Blueprint",
    "Data safe",
    "Checklist migration",
    "Legacy routes",
    "Untouched",
    "crm_v2",
    "Dry-run",
    "legacy_id_map",
    "Row-count",
    "UI route ready",
    "Safety guard",
    "read-model",
    "Migration",
    "webhook",
    "owner",
    "stage",
    "Smart list",
  ];
  for (const phrase of forbiddenOutlineCopy) {
    assert.doesNotMatch(outlineContent, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `outline page must hide implementation-only copy "${phrase}"`);
  }
});

test("crm v2 migration is private, additive, and contains required tables", () => {
  const migrationsDir = path.join(root, "supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => /crm_v2.*\.sql$/i.test(file))
    .sort();
  assert.ok(migrationFiles.length > 0, "a crm_v2 migration file must exist");

  const sql = migrationFiles.map((file) => read(`supabase/migrations/${file}`)).join("\n");
  assert.match(sql, /create schema if not exists crm_v2/i);
  assert.doesNotMatch(sql, /\bdrop\s+(schema|table|column|view|function)\b/i, "migration must not drop objects");
  assert.doesNotMatch(sql, /\btruncate\b/i, "migration must not truncate data");
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i, "migration must not bulk delete data");
  assert.doesNotMatch(sql, /\balter\s+table\s+public\.[\w"]+\s+rename\b/i, "migration must not rename legacy tables");

  const requiredTables = [
    "contacts",
    "leads",
    "crm_events",
    "tags",
    "contact_tags",
    "segments",
    "segment_rules",
    "segment_memberships",
    "email_templates",
    "email_campaigns",
    "email_sends",
    "email_events",
    "email_suppression_list",
    "workflows",
    "workflow_versions",
    "workflow_nodes",
    "workflow_edges",
    "workflow_runs",
    "workflow_step_runs",
    "orders",
    "payments",
    "refunds",
    "coupons",
    "enrollments",
    "course_progress",
    "student_notes",
    "support_tickets",
    "tasks",
    "notes",
    "audit_logs",
    "integration_accounts",
    "webhook_events",
    "legacy_id_map",
    "migration_runs",
  ];

  for (const table of requiredTables) {
    assert.match(sql, new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+crm_v2\\.${table}\\b`, "i"), `${table} table missing`);
    assert.match(sql, new RegExp(`alter\\s+table\\s+crm_v2\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"), `${table} must enable RLS`);
  }

  assert.match(sql, /unique\s*\(source_table,\s*source_id,\s*target_table\)/i, "legacy_id_map must be unique and idempotent");
  assert.match(sql, /create\s+index\s+if\s+not\s+exists\s+idx_crm_v2_leads_stage/i, "lead stage index missing");
  assert.match(sql, /create\s+(unique\s+)?index\s+if\s+not\s+exists\s+idx_crm_v2_contacts_normalized_email/i, "contact normalized email index missing");
  assert.match(sql, /crm_daily_metrics/i, "daily aggregate metrics missing");
  assert.match(sql, /crm_pipeline_metrics/i, "pipeline aggregate metrics missing");
});

test("crm v2 route surface is gated and complete", () => {
  const routes = new Map([
    ["app/admin/crm-v2/page.tsx", "Tổng quan CRM"],
    ["app/admin/crm-v2/outline/page.tsx", "Outline CRM chuyên sâu"],
    ["app/admin/crm-v2/leads/page.tsx", "Leads & Pipeline"],
    ["app/admin/crm-v2/leads/[id]/page.tsx", "Hồ sơ liên hệ 360"],
    ["app/admin/crm-v2/segments/page.tsx", "Phân khúc & Tag"],
    ["app/admin/crm-v2/email/page.tsx", "Remarketing Email"],
    ["app/admin/crm-v2/automation/page.tsx", "Automation Workflow"],
    ["app/admin/crm-v2/orders/page.tsx", "Đơn hàng & Thanh toán"],
    ["app/admin/crm-v2/students/page.tsx", "Học viên & Khóa học"],
    ["app/admin/crm-v2/reports/page.tsx", "Báo cáo & Attribution"],
    ["app/admin/crm-v2/team/page.tsx", "Team & Phân quyền"],
    ["app/admin/crm-v2/integrations/page.tsx", "Tích hợp"],
  ]);

  for (const [relativePath, title] of routes) {
    assert.ok(exists(relativePath), `${relativePath} must exist`);
    assert.match(read(relativePath), new RegExp(title), `${relativePath} must render ${title}`);
  }

  const layout = read("app/admin/crm-v2/layout.tsx");
  assert.match(layout, /requireAdminAuth/, "CRM v2 must keep admin auth guard");
  assert.match(layout, /CRM_V2_ENABLED/, "CRM v2 must be feature-flag gated");
  assert.match(layout, /CrmShell/, "CRM v2 must use the shared shell");

  const dataLayer = read("lib/crm-v2/data.ts");
  assert.match(dataLayer, /export async function listCrmV2Orders/, "orders must have server-side data service");
  assert.match(dataLayer, /export async function listCrmV2Students/, "students must have server-side data service");
  assert.match(dataLayer, /createWorkflowStepRunsForRun/, "bulk workflow actions must prepare workflow_step_runs after creating workflow_runs");
  const leadsApi = read("app/api/admin/crm-v2/leads/route.ts");
  const segmentPreviewApi = read("app/api/admin/crm-v2/segments/preview/route.ts");
  const ordersApi = read("app/api/admin/crm-v2/orders/route.ts");
  const studentsApi = read("app/api/admin/crm-v2/students/route.ts");
  const segmentsApi = read("app/api/admin/crm-v2/segments/route.ts");
  const segmentsActionsApi = read("app/api/admin/crm-v2/segments/actions/route.ts");
  const emailApi = read("app/api/admin/crm-v2/email/route.ts");
  const automationApi = read("app/api/admin/crm-v2/automation/route.ts");
  const automationActionsApi = read("app/api/admin/crm-v2/automation/actions/route.ts");
  const ordersActionsApi = read("app/api/admin/crm-v2/orders/actions/route.ts");
  const studentsActionsApi = read("app/api/admin/crm-v2/students/actions/route.ts");
  const reportsApi = read("app/api/admin/crm-v2/reports/route.ts");
  const teamApi = read("app/api/admin/crm-v2/team/route.ts");
  const teamActionsApi = read("app/api/admin/crm-v2/team/actions/route.ts");
  const integrationsApi = read("app/api/admin/crm-v2/integrations/route.ts");
  const integrationsActionsApi = read("app/api/admin/crm-v2/integrations/actions/route.ts");
  assert.match(leadsApi, /isCrmV2Enabled/, "CRM v2 leads API must be feature-flag gated");
  assert.match(segmentPreviewApi, /isCrmV2Enabled/, "CRM v2 segment preview API must be feature-flag gated");
  assert.match(segmentPreviewApi, /getCrmV2SegmentPreviewRows/, "segment preview API must use the CRM v2 data service");
  assert.doesNotMatch(segmentPreviewApi, /getDemoRows/, "segment preview route must not hard-code demo rows");
  assert.match(ordersApi, /isCrmV2Enabled/, "CRM v2 orders API must be feature-flag gated");
  assert.match(studentsApi, /isCrmV2Enabled/, "CRM v2 students API must be feature-flag gated");
  assert.match(ordersApi, /listCrmV2Orders/, "CRM v2 orders API must use listCrmV2Orders");
  assert.match(studentsApi, /listCrmV2Students/, "CRM v2 students API must use listCrmV2Students");
  assert.match(segmentsApi, /listCrmV2SegmentsRows/, "segments API must use listCrmV2SegmentsRows");
  assert.match(segmentsActionsApi, /save_segment/, "segments action API must save segment rules");
  assert.match(segmentsActionsApi, /segment_rules/, "segments action API must write segment_rules");
  assert.match(emailApi, /listCrmV2EmailCampaigns/, "email API must list campaigns");
  assert.match(emailApi, /getCrmV2EmailCampaignKpis/, "email API must expose campaign KPIs");
  assert.match(automationApi, /listCrmV2AutomationWorkflows/, "automation API must list workflows");
  assert.match(automationActionsApi, /test_workflow/, "automation action API must support test workflow");
  assert.match(automationActionsApi, /save_draft/, "automation action API must support draft save");
  assert.match(automationActionsApi, /publish/, "automation action API must support publish");
  assert.match(automationActionsApi, /version_history/, "automation action API must support version history");
  assert.match(automationActionsApi, /không chạy automation dài trong browser/, "workflow test must keep long jobs out of the browser");
  assert.match(automationActionsApi, /buildWorkflowDefinitionRecords/, "workflow draft save must normalize canvas nodes and edges");
  assert.match(automationActionsApi, /from\("workflow_nodes"\)/, "workflow draft save must write workflow_nodes");
  assert.match(automationActionsApi, /from\("workflow_edges"\)/, "workflow draft save must write workflow_edges");
  assert.match(automationActionsApi, /\.eq\("status", "draft"\)/, "workflow publish must only publish a draft version");
  assert.match(ordersActionsApi, /send_payment_reminder/, "orders action API must support payment reminders");
  assert.match(ordersActionsApi, /from\("tasks"\)/, "orders action API must write recovery tasks");
  assert.match(studentsActionsApi, /create_support_ticket/, "students action API must support support tickets");
  assert.match(studentsActionsApi, /from\("support_tickets"\)/, "students action API must write support_tickets");
  assert.match(reportsApi, /getCrmV2ReportSnapshot/, "reports API must expose report snapshot");
  assert.match(teamApi, /listCrmV2TeamMembers/, "team API must list team members");
  assert.match(teamActionsApi, /record_permission_audit/, "team action API must record permission audits");
  assert.match(teamActionsApi, /from\("audit_logs"\)/, "team action API must write audit_logs");
  assert.match(integrationsApi, /listCrmV2Integrations/, "integrations API must list integration accounts");
  assert.match(integrationsActionsApi, /test_connection/, "integrations action API must test connections");
  assert.match(integrationsActionsApi, /from\("webhook_events"\)/, "integrations action API must write webhook_events");
});

test("crm v2 live data mapping uses true source counts and course slugs", () => {
  const dataLayer = read("lib/crm-v2/data.ts");
  const leadsPage = read("app/admin/crm-v2/leads/page.tsx");
  const leadsClient = read("components/crm-v2/leads-page-client.tsx");
  const ordersPage = read("app/admin/crm-v2/orders/page.tsx");
  const shell = read("components/crm-v2/crm-components.tsx");
  const liveAlignment = read("supabase/migrations/20260616123000_crm_v2_live_data_alignment.sql");
  const serverRpc = read("supabase/migrations/20260616143000_crm_v2_server_rpc.sql");
  const leadDedupeRpc = read("supabase/migrations/20260616152000_crm_v2_dedupe_lead_rpc.sql");
  const dashboardDedupeRpc = read("supabase/migrations/20260616153500_crm_v2_dedupe_dashboard_rpc.sql");

  assert.match(dataLayer, /export async function getCrmV2LeadStageSummary/, "lead stage summary must be a dedicated server-side total query");
  assert.match(dataLayer, /rpc\("crm_v2_dashboard_raw"/, "dashboard must read live private-schema data through server-only RPC");
  assert.match(dataLayer, /rpc\("crm_v2_leads_list_raw"/, "leads list must read live private-schema data through server-only RPC");
  assert.match(dataLayer, /rpc\("crm_v2_orders_list_raw"/, "orders list must read live private-schema data through server-only RPC");
  assert.match(dataLayer, /rpc\("crm_v2_students_list_raw"/, "students list must read live private-schema data through server-only RPC");
  assert.match(dataLayer, /if \(error \|\| !data\) return getCrmV2DashboardDirectDataApi\(query\)/, "live RPC errors must fall back to direct production queries, not demo numbers");
  assert.match(leadsPage, /getCrmV2LeadStageSummary/, "leads page must use total stage summary");
  assert.doesNotMatch(leadsPage, /leads\.rows\.filter\(\(lead\) => lead\.stage === stage\)/, "stage cards must not count only the current page");
  assert.match(dataLayer, /from\("leads"\)[\s\S]*course_slug[\s\S]*builder = builder\.eq\("course_slug", query\.filters\.course\)/, "leads filters must use course_slug");
  assert.match(dataLayer, /from\("orders"\)[\s\S]*course_slug[\s\S]*builder = builder\.eq\("course_slug", query\.filters\.course\)/, "orders filters must use course_slug");
  assert.match(dataLayer, /from\("enrollments"\)[\s\S]*course_slug[\s\S]*builder = builder\.eq\("course_slug", query\.filters\.course\)/, "students filters must use course_slug");
  assert.doesNotMatch(dataLayer, /export async function getCrmV2Dashboard\(\)[\s\S]*if \(error \|\| !data\?\.length\) return demoDashboard/, "dashboard must not fallback to demo when live partial data exists");
  assert.match(dataLayer, /!isOrderDerivedLead\(row\.metadata\)/, "dashboard lead-today KPI must exclude order-derived opportunities");
  assert.match(liveAlignment, /course_slug/, "live alignment migration must preserve course_slug read-model fields");
  assert.match(liveAlignment, /coalesce\(metadata->>'source_table', 'public\.leads'\) <> 'public\.orders'/, "migration aggregate must count true leads only");
  assert.match(serverRpc, /grant execute on function public\.crm_v2_dashboard_raw\(\) to service_role/i, "live dashboard RPC must be service-role only");
  assert.match(serverRpc, /revoke all on function public\.crm_v2_leads_list_raw/i, "live list RPCs must not be available to anon/authenticated");
  assert.match(leadDedupeRpc, /partition by coalesce\(.*contact_id::text,\s*.*id::text\)/is, "lead list RPC must collapse duplicate rows by contact");
  assert.match(leadDedupeRpc, /lead_stage_rank/i, "lead list RPC must choose the operational stage when merging duplicates");
  assert.match(dashboardDedupeRpc, /effective_leads/i, "dashboard RPC must use one effective lead row per contact");
  assert.match(dashboardDedupeRpc, /lead_stage_rank/i, "dashboard funnel and MQL must share the lead merge stage ranking");
  assert.match(leadsClient, /key: "phone",\s*label: "SĐT"/, "lead table must show phone numbers");
  assert.doesNotMatch(leadsClient, /RightInsightPanel title="Bulk action/, "leads list must keep the data table full-width like the mockup");
  assert.match(leadsClient, /key: "course",\s*label: "Khóa học quan tâm",\s*width: "260px"/, "lead course column must have enough width to avoid vertical word wrapping");
  assert.match(ordersPage, /min-\[1840px\]:grid-cols-\[minmax\(0,1fr\)_340px\]/, "orders insight panel must not squeeze the table on normal desktop widths");
  assert.match(`${leadsClient}\n${ordersPage}`, /minmax\(0,1fr\)/, "CRM grids must prevent table overflow from expanding the viewport");
  assert.match(shell, /getColumnWidth/, "CRM data table must use explicit column widths for dense mockup-like tables");
  assert.match(shell, /line-clamp-2/, "CRM long table text must clamp instead of forcing vertical word wrapping");
  assert.match(shell, /displayStatusLabel/, "CRM stage/status badges must display operator labels, not raw stage codes");
  assert.doesNotMatch(shell, /href: "\/admin\/khoa-hoc"/, "CRM v2 course manager must not jump back to the legacy admin dashboard");
  assert.match(shell, /href: "\/admin\/crm-v2\/courses"/, "CRM v2 course manager must stay inside the CRM v2 shell");
  for (const relativePath of walkFiles("app/admin/crm-v2", new Set([".tsx"]))) {
    const source = fs.readFileSync(relativePath, "utf8");
    assert.doesNotMatch(source, /xl:grid-cols-\[1fr_360px\]/, `${path.relative(root, relativePath)} must not squeeze right panels at normal desktop widths`);
    assert.doesNotMatch(source, /xl:grid-cols-\[280px_1fr_340px\]/, `${path.relative(root, relativePath)} must not force three CRM columns at normal desktop widths`);
  }
});

test("crm v2 workflow builder is editable and not sample-only", () => {
  const builder = read("components/crm-v2/workflow-builder.tsx");
  const actionButtons = read("components/crm-v2/workflow-action-buttons.tsx");
  const canvas = read("components/crm-v2/workflow-canvas.tsx");
  const runner = read("lib/crm-v2/workflow-runner.ts");
  const migrations = fs
    .readdirSync(path.join(root, "supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .map((file) => read(path.join("supabase/migrations", file)))
    .join("\n");

  for (const nodeType of [
    "trigger_form",
    "trigger_event",
    "trigger_tag",
    "condition",
    "split",
    "send_email",
    "add_tag",
    "remove_tag",
    "update_stage",
    "notify_internal",
    "webhook",
    "delay",
    "wait_until",
    "goal",
  ]) {
    assert.match(builder, new RegExp(nodeType), `WorkflowBuilder must expose ${nodeType}`);
  }

  assert.match(builder, /useNodesState/, "WorkflowBuilder must manage editable React Flow nodes");
  assert.match(builder, /useEdgesState/, "WorkflowBuilder must manage editable React Flow edges");
  assert.match(builder, /onConnect/, "WorkflowBuilder must allow connecting nodes");
  assert.match(builder, /selectedNodeId/, "WorkflowBuilder must expose a selected node config panel");
  assert.match(builder, /version_history/, "WorkflowBuilder must render version history from the action API");
  assert.doesNotMatch(actionButtons, /sampleNodes/, "Workflow actions must use live canvas nodes, not sample nodes");
  assert.match(canvas, /nodes=\{nodes\}/, "WorkflowCanvas must receive live nodes");
  assert.match(runner, /createWorkflowStepRunsForRun/, "workflow runner must expose a server-side step-run creator");
  assert.match(runner, /from\("workflow_versions"\)/, "workflow runner must read published version nodes");
  assert.match(runner, /from\("workflow_step_runs"\)/, "workflow runner must write workflow_step_runs");
  assert.match(runner, /upsert/, "workflow runner must be idempotent when creating step runs");
  assert.match(migrations, /prevent_published_workflow_version_mutation/, "migration must prevent mutating published workflow versions");
  assert.match(migrations, /idx_crm_v2_workflow_runs_idempotency_key/, "workflow_runs must have an idempotency index");
  assert.match(migrations, /workflow_step_runs_status_check/, "workflow step runs must constrain known statuses");
});

test("crm v2 components and service interfaces are present", () => {
  const componentIndex = read("components/crm-v2/index.ts");
  const requiredComponents = [
    "CrmShell",
    "CrmSidebar",
    "CrmTopbar",
    "CrmRouteFeedback",
    "KpiCard",
    "Sparkline",
    "MetricGrid",
    "CrmDataTable",
    "FilterBar",
    "StatusBadge",
    "OwnerAvatar",
    "RightInsightPanel",
    "Timeline",
    "EmptyState",
    "LoadingState",
    "ErrorState",
  ];

  for (const component of requiredComponents) {
    assert.match(componentIndex, new RegExp(`\\b${component}\\b`), `${component} must be exported`);
  }

  const emailProvider = read("lib/crm-v2/email-provider.ts");
  for (const method of ["sendTransactionalEmail", "sendMarketingEmail", "sendBatch", "createBroadcast", "scheduleBroadcast", "handleWebhook"]) {
    assert.match(emailProvider, new RegExp(`\\b${method}\\b`), `EmailProvider missing ${method}`);
  }
  assert.match(emailProvider, /MockEmailProvider/, "Email provider must have mock mode");
  assert.match(emailProvider, /ResendEmailProvider/, "Email provider must have Resend adapter");

  const eventDestination = read("lib/crm-v2/event-destination.ts");
  for (const method of ["trackLead", "trackQualifiedLead", "trackInitiateCheckout", "trackPurchase", "trackCourseEnroll", "trackCourseProgress", "trackUpsellIntent"]) {
    assert.match(eventDestination, new RegExp(`\\b${method}\\b`), `EventDestination missing ${method}`);
  }
});

test("crm v2 shared controls expose real actions instead of inert buttons", () => {
  const components = read("components/crm-v2/crm-components.tsx");
  const loading = read("app/admin/crm-v2/loading.tsx");
  const automationPage = read("app/admin/crm-v2/automation/page.tsx");
  const emailPage = read("app/admin/crm-v2/email/page.tsx");
  const integrationsPage = read("app/admin/crm-v2/integrations/page.tsx");
  const ordersPage = read("app/admin/crm-v2/orders/page.tsx");
  const segmentsPage = read("app/admin/crm-v2/segments/page.tsx");
  const studentsPage = read("app/admin/crm-v2/students/page.tsx");
  const teamPage = read("app/admin/crm-v2/team/page.tsx");
  const emailActionsApi = read("app/api/admin/crm-v2/email/actions/route.ts");

  assert.match(components, /useRouter/, "CRM topbar refresh must call the Next router");
  assert.match(components, /method="get"/, "CRM topbar search must submit a GET query");
  assert.match(components, /name="q"/, "CRM topbar search must write the q query parameter");
  assert.match(components, /type FilterBarItem/, "FilterBar items must have action metadata");
  assert.match(components, /data-crm-action="link"/, "shared action control must mark route/API links");
  assert.match(components, /data-crm-action="button"/, "shared action control must mark handled buttons");
  assert.match(components, /data-crm-action="status"/, "shared action control must downgrade non-actions to status chips");
  assert.match(components, /CrmRouteFeedback/, "CRM shell must show route feedback during slow navigations");
  assert.match(components, /crm-v2:route-feedback/, "CRM controls must announce route feedback before server navigation");
  assert.match(components, /data-crm-route-pending/, "CRM route feedback must mark pending state for visual tuning");
  assert.match(loading, /data-crm-route-loading/, "CRM v2 routes must have a segment loading skeleton");
  assert.match(loading, /Đang tải dữ liệu CRM v2/, "CRM v2 loading skeleton must expose an accessible status");
  assert.doesNotMatch(components, /export function FilterBar[\s\S]*?<button[\s\S]*?{item\.label}/, "FilterBar must not render inert option buttons");
  assert.match(automationPage, /WorkflowBuilder/, "automation page must use the editable API-backed workflow builder");
  assert.match(emailPage, /EmailActionButtons/, "email campaign actions must be backed by an action API client");
  assert.match(segmentsPage, /SegmentActionPanel/, "segments page must expose API-backed segment actions");
  assert.match(ordersPage, /OrderActionButtons/, "orders page must expose API-backed order actions");
  assert.match(studentsPage, /StudentActionButtons/, "students page must expose API-backed student actions");
  assert.match(teamPage, /TeamActionButtons/, "team page must expose API-backed team actions");
  assert.match(integrationsPage, /IntegrationActionButtons/, "integrations page must expose API-backed integration actions");
  assert.match(emailActionsApi, /save_draft/, "email action API must save campaign drafts");
  assert.match(emailActionsApi, /preview_audience/, "email action API must preview real audiences");
  assert.match(emailActionsApi, /refresh_audience/, "email action API must refresh segment memberships");
  assert.match(emailActionsApi, /email_campaigns/, "email action API must write the CRM v2 campaign table when env is present");
});

test("crm v2 operator modules use real filters, live reports, permissions, email composer, and clear workflow recipes", () => {
  const components = read("components/crm-v2/crm-components.tsx");
  const shell = read("components/crm-v2/crm-components.tsx");
  const reportsPage = read("app/admin/crm-v2/reports/page.tsx");
  const dataLayer = read("lib/crm-v2/data.ts");
  const teamActionsApi = read("app/api/admin/crm-v2/team/actions/route.ts");
  const teamButtons = read("components/crm-v2/module-action-buttons.tsx");
  const emailButtons = read("components/crm-v2/email-action-buttons.tsx");
  const emailActionsApi = read("app/api/admin/crm-v2/email/actions/route.ts");
  const emailPage = read("app/admin/crm-v2/email/page.tsx");
  const automationPage = read("app/admin/crm-v2/automation/page.tsx");
  const workflowBuilder = read("components/crm-v2/workflow-builder.tsx");
  const leadsClient = read("components/crm-v2/leads-page-client.tsx");
  const segmentsPage = read("app/admin/crm-v2/segments/page.tsx");

  assert.match(components, /options\?:/, "FilterBar items must support selectable options");
  assert.match(components, /<select[\s\S]*name=\{item\.param\}/, "FilterBar must render real GET selects for filter params");
  assert.match(components, /router\.push\(createFilterHref/, "FilterBar select changes must update the route query");
  assert.match(leadsClient, /options:\s*stageOptions/, "Leads stage filters must expose selectable values");
  assert.match(leadsClient, /sourceOptions/, "Leads source filter must be selectable from real rows");
  assert.match(segmentsPage, /segmentStatusOptions/, "Segments status filter must be selectable");

  assert.doesNotMatch(shell, /href:\s*"\/admin\/khoa-hoc"/, "CRM v2 course menu must not jump to the legacy admin dashboard");
  assert.match(shell, /href:\s*"\/admin\/crm-v2\/courses"/, "CRM v2 course menu must stay inside CRM v2");
  assert.doesNotMatch(shell, /Outline CRM chuyên sâu|\/admin\/crm-v2\/outline/, "CRM v2 sidebar must remove internal Outline from operator navigation");
  assert.match(shell, /label:\s*"Báo cáo"/, "CRM v2 sidebar must keep Reports in the operator menu");
  assert.match(reportsPage, /searchParams/, "Reports page must accept the shared query contract");
  assert.match(reportsPage, /normalizeCrmListQuery/, "Reports page must normalize filters/range");
  assert.match(reportsPage, /getCrmV2ReportSnapshot\(query\)/, "Reports must pass query/range to live report data");
  assert.doesNotMatch(reportsPage, /ReportRangeControls/, "Reports must not own a separate date/range control");
  assert.doesNotMatch(reportsPage, /name="dateFrom"/, "Reports must use the global CRM date picker, not its own dateFrom input");
  assert.doesNotMatch(reportsPage, /name="dateTo"/, "Reports must use the global CRM date picker, not its own dateTo input");
  assert.match(reportsPage, /Theo ngày/, "Reports must support daily view");
  assert.match(reportsPage, /Theo giai đoạn/, "Reports must support period view");
  assert.match(reportsPage, /Theo nguồn/, "Reports must support source view");
  assert.match(reportsPage, /InvertedFunnelChart/, "Reports must render an inverted funnel chart");
  assert.match(reportsPage, /aria-label="Phễu tam giác đăng ký đến vào học"/, "Reports funnel must render as a visual triangle funnel");
  assert.match(reportsPage, /clipPath/, "Reports funnel segments must use clipped trapezoids instead of text-only pills");
  assert.match(reportsPage, /ReportValueBars/, "Reports daily revenue chart must use a report-specific chart renderer");
  assert.match(reportsPage, /Chưa có doanh thu trong bộ lọc này/, "Reports daily revenue chart must explain truly empty ranges");
  assert.match(reportsPage, /Khách đăng ký[\s\S]*MQL[\s\S]*Chờ thanh toán[\s\S]*Đã thanh toán[\s\S]*Vào học/, "Reports funnel must use the requested business stages");
  assert.match(dataLayer, /getCrmV2ReportSnapshot[\s\S]*getCrmV2Dashboard\(query\)/, "Reports must reuse live dashboard RPC summary instead of isolated private-table reads");
  assert.match(dataLayer, /paid_at/, "Reports must include paid_at so paid-today orders are counted even if created earlier");
  assert.match(dataLayer, /dailyRevenue/, "Reports must carry daily revenue from the direct order attribution source");
  assert.match(dataLayer, /buildReportDailyRevenueSeries/, "Reports must build daily revenue from paid public orders for the selected range");
  assert.match(dataLayer, /reportDailyRevenue[\s\S]*\.reverse\(\)/, "Reports daily revenue must render newest/today first instead of oldest first");
  assert.match(dataLayer, /dateLowerBound\(dateRange\.from\)[\s\S]*dateUpperBoundExclusive\(dateRange\.to\)/, "Reports attribution must use Vietnam-day date bounds");
  assert.match(dataLayer, /totalRevenue = attributionTotals\.revenue \|\| summary\.revenue/, "Reports KPI revenue must prefer direct order attribution totals");
  assert.match(dataLayer, /totalPaid = attributionTotals\.paid \|\| summary\.paidOrders/, "Reports KPI paid orders must prefer direct order attribution totals");
  assert.match(dataLayer, /deriveReportAttributionRowsFromDashboard/, "Reports must derive non-demo attribution rows from live dashboard sources when pipeline metrics are unavailable");
  assert.doesNotMatch(dataLayer, /getCrmV2ReportSnapshot[\s\S]*demoReportAttributionRows/, "Reports must not fall back to demo attribution rows in live mode");
  assert.match(dataLayer, /buildEmptyReportSnapshot/, "Reports must expose empty/config state instead of demo data when live data is unavailable");

  assert.match(teamActionsApi, /grant_role/, "Team API must support granting permissions");
  assert.match(teamActionsApi, /revoke_role/, "Team API must support revoking permissions");
  assert.match(teamActionsApi, /updateAdminMemberRole/, "Team API must call the existing admin role service");
  assert.match(teamButtons, /grant_role/, "Team UI must expose grant permission action");
  assert.match(teamButtons, /revoke_role/, "Team UI must expose revoke permission action");

  for (const component of ["EmailMarketingWorkspace", "EmailComposer", "EmailPreviewPanel", "AudiencePreviewPanel", "EmailTemplatePicker", "EmailSendResultPanel"]) {
    assert.match(emailButtons, new RegExp(`\\b${component}\\b`), `Email workspace must include ${component}`);
  }
  assert.match(emailButtons, /OperationalEmailTemplateCard/, "Email workspace must render operational template cards");
  assert.match(emailButtons, /buildCrmV2OperationalEmailTemplates/, "Email workspace must load complete CRM-native operational templates");
  assert.match(emailButtons, /payment_success_access/, "Email workspace must include payment success + course access template");
  assert.match(emailButtons, /pending_payment_reminder/, "Email workspace must include unpaid reminder template");
  assert.match(emailButtons, /registration_payment/, "Email workspace must include registration/payment template");
  assert.doesNotMatch(emailButtons, /const workspaceTabs =/, "Email workspace must not split campaign and composer into confusing top-level tabs");
  assert.match(emailButtons, /name="subject"/, "Email composer must allow editing subject");
  assert.match(emailButtons, /name="body"/, "Email composer must allow editing body without raw HTML as the main flow");
  assert.match(emailButtons, /name="preheader"/, "Email composer must allow editing preheader");
  assert.match(emailButtons, /name="ctaText"/, "Email composer must allow editing CTA text");
  assert.match(emailButtons, /name="ctaUrl"/, "Email composer must allow editing CTA URL");
  assert.match(emailButtons, /name="segmentId"/, "Email composer must choose an audience/segment");
  assert.match(emailButtons, /name="courseId"/, "Email composer must choose the exact course registered by recipients");
  assert.match(emailButtons, /renderCrmV2EmailPreview/, "Email live preview must use the same render path as real sends");
  assert.match(emailButtons, /MockInboxPreview/, "Email preview must look like a normal inbox/email client");
  assert.match(emailButtons, /sampleRecipient/, "Email preview must inject a real recipient/order sample");
  assert.match(emailPage, /listCrmV2CourseOptions/, "Email page must load real course options from CRM v2 orders");
  assert.match(emailButtons, /textarea/, "Email composer must include a body editor");
  assert.doesNotMatch(emailButtons, /Nội dung email HTML/, "raw HTML must not be the primary email editing flow");
  assert.match(emailActionsApi, /email_templates/, "Email campaign creation must save editable templates");
  assert.match(emailActionsApi, /segment_id/, "Email campaign creation must attach the selected audience");
  assert.match(emailActionsApi, /segment_memberships/, "Email audience refresh must persist segment memberships");
  assert.match(emailActionsApi, /audience_snapshot/, "Email campaigns must store an audience snapshot before real send");
  assert.match(emailActionsApi, /courseSlug/, "Email action API must receive the selected course scope");
  assert.match(emailActionsApi, /paymentStatus/, "Email action API must receive payment status scope");
  assert.match(emailActionsApi, /audience_scope/, "Email campaign metadata must preserve course/payment audience scope");
  assert.match(dataLayer, /listCrmV2CourseOptions/, "CRM v2 must expose real course options for email targeting");
  assert.match(emailPage, /LegacyEmailConfigPanel/, "Email page must show historical customer email configuration for editing");
  assert.match(dataLayer, /getCrmV2LegacyEmailConfigSnapshot/, "CRM v2 must expose old registration/payment email config and send history");

  assert.match(automationPage, /WorkflowRecipePanel/, "Automation page must include clear operational recipes");
  assert.match(workflowBuilder, /applyRecipe/, "Workflow builder must let operators apply a working recipe");
  assert.match(workflowBuilder, /payment_reminder_recipe/, "Workflow builder must include a payment-reminder recipe");
  assert.match(workflowBuilder, /Công thức vận hành/, "Automation must default to a simple recipe-first operating mode");
  assert.match(workflowBuilder, /Trigger[\s\S]*Điều kiện[\s\S]*Hành động[\s\S]*Log/, "Automation recipes must explain trigger, condition, action, and logs");
});

test("crm v2 date range is a real dashboard/list query input", () => {
  const types = read("lib/crm-v2/types.ts");
  const query = read("lib/crm-v2/query.ts");
  const dataLayer = read("lib/crm-v2/data.ts");
  const dashboardPage = read("app/admin/crm-v2/page.tsx");
  const topbar = read("components/crm-v2/crm-components.tsx");
  const serverRpc = read("supabase/migrations/20260616161000_crm_v2_range_rpc.sql");

  assert.match(types, /range:\s*"today"\s*\|\s*"yesterday"\s*\|\s*"7d"\s*\|\s*"30d"\s*\|\s*"90d"\s*\|\s*"custom"/, "CrmListQuery must carry the selected range");
  assert.match(types, /dateFrom\?: string/, "CrmListQuery must carry custom dateFrom");
  assert.match(types, /dateTo\?: string/, "CrmListQuery must carry custom dateTo");
  assert.match(query, /export function getCrmDateRange/, "query layer must build a date window");
  assert.match(query, /value === "today"/, "query layer must accept the today range");
  assert.match(query, /value === "yesterday"/, "query layer must accept the yesterday range");
  assert.match(query, /shiftDateYmd\(today,\s*-1\)/, "yesterday range must resolve to the previous Vietnam date");
  assert.match(query, /days:\s*1/, "today range must resolve to a one-day dashboard window");
  assert.match(query, /range: normalizeCrmRange/, "normalizeCrmListQuery must parse range");
  assert.match(topbar, /CrmGlobalDateControl/, "topbar must expose one global CRM date control");
  assert.match(topbar, /CalendarDays/, "global CRM date control must show a calendar icon");
  assert.match(topbar, /label: "Hôm nay", value: "today"/, "topbar must include a Hôm nay range button");
  assert.match(topbar, /label: "Hôm qua", value: "yesterday"/, "topbar must include a Hôm qua range button");
  assert.match(topbar, /rangeParams\.set\("range", option\.value\)/, "topbar range controls must change the active query");
  assert.match(dashboardPage, /searchParams/, "overview dashboard must receive searchParams");
  assert.match(dashboardPage, /normalizeCrmListQuery/, "overview dashboard must normalize the same query contract");
  assert.match(dashboardPage, /getCrmV2Dashboard\(query\)/, "overview dashboard must pass range query to data layer");
  assert.match(dataLayer, /getCrmDateRange\(query/, "data layer must convert range to dates");
  assert.match(dataLayer, /p_date_from/, "RPC reads must pass p_date_from");
  assert.match(dataLayer, /p_date_to/, "RPC reads must pass p_date_to");
  assert.match(serverRpc, /p_date_from date default null/i, "range RPC migration must accept date_from");
  assert.match(serverRpc, /p_date_to date default null/i, "range RPC migration must accept date_to");
});

test("crm v2 overview daily revenue uses live public orders with clear money labels", () => {
  const dataLayer = read("lib/crm-v2/data.ts");
  const dashboardPage = read("app/admin/crm-v2/page.tsx");
  const dashboardCharts = read("components/crm-v2/dashboard-charts.tsx");
  const types = read("lib/crm-v2/types.ts");

  assert.match(dataLayer, /buildDashboardRevenueSeries/, "overview must build its adaptive revenue chart from the live order source");
  assert.match(dataLayer, /buildAdaptiveRevenueSeries\(rows, dateRange\)/, "overview must use the selected range for adaptive aggregation");
  assert.match(dataLayer, /revenueResolution:/, "overview must tell the chart whether it is hourly, daily, or weekly");
  assert.doesNotMatch(
    dataLayer,
    /revenue:\s*dailySeries\.map\(\(row\)\s*=>\s*\(\{\s*label:\s*String\(row\.metric_date\)/,
    "overview revenue chart must not be driven directly by crm_daily_metrics metric_date rows",
  );
  assert.match(dataLayer, /timestampToCrmDateKey/, "overview revenue aggregation must respect Vietnam-day timestamps");
  assert.match(dataLayer, /formatExactVnd/, "overview daily revenue labels must use exact VND amounts, not rounded compact labels");
  assert.doesNotMatch(
    dataLayer,
    /buildDashboardRevenueSeries[\s\S]*displayValue:\s*formatMoney\(row\.value\)/,
    "overview daily revenue labels must not use rounded compact formatMoney labels",
  );
  assert.doesNotMatch(
    dataLayer,
    /dashboardRevenue\.rows\.map\(\(row\)\s*=>\s*Math\.round/,
    "overview daily revenue KPI series must keep real values instead of rounded million buckets",
  );
  assert.match(types, /displayValue\?: string/, "CRM dashboard bar rows must support a separate display label");
  assert.match(dashboardCharts, /formatter=\{\(value\) => money\(Number\(value\)\)\}/, "revenue tooltip must display exact VND");
  assert.match(dashboardPage, /DashboardCharts/, "overview must pass live data to the adaptive chart surface");
  assert.doesNotMatch(dashboardPage, /value:\s*Math\.round\(row\.value\)/, "overview revenue bars must keep the real amount, not round it before rendering");
});

test("crm v2 dashboard and unified pipeline use production source-of-truth data", () => {
  const dataLayer = read("lib/crm-v2/data.ts");
  const leadsClient = read("components/crm-v2/leads-page-client.tsx");
  const types = read("lib/crm-v2/types.ts");
  const leadActionsApi = read("app/api/admin/crm-v2/leads/actions/route.ts");
  const leadsPage = read("app/admin/crm-v2/leads/page.tsx");

  assert.match(dataLayer, /countPublicLeadsForRange/, "dashboard must count true new leads from public.leads");
  assert.match(dataLayer, /listPublicOrdersForRange/, "dashboard paid and revenue metrics must read public.orders");
  assert.match(dataLayer, /buildCrmV2RecentActivity/, "dashboard must build recent activity from real event sources");
  assert.match(dataLayer, /listCrmV2ActivityHistory/, "data layer must expose the full CRM activity history feed");
  assert.match(dataLayer, /from\("email_logs"\)/, "recent activity must read Resend-backed public.email_logs directly");
  assert.match(dataLayer, /resend_email_id/, "recent activity must keep Resend email ids in the selected email log fields");
  assert.match(dataLayer, /student_email/, "recent activity must include student emails from learning activity logs");
  assert.match(dataLayer, /student_entered_learning/, "recent activity must recognize real learning-entry events");
  assert.match(dataLayer, /occurredAtIso/, "recent activity must sort by raw ISO timestamps instead of formatted Vietnamese strings");
  for (const label of ["Khách đăng ký", "Đã gửi email", "Mở email", "Thanh toán thành công", "Nhắc thanh toán", "Đăng nhập vào học", "Cập nhật stage"]) {
    assert.match(dataLayer, new RegExp(label), `recent activity must map ${label} in Vietnamese`);
  }

  assert.match(types, /CrmUnifiedCustomerRow/, "CRM v2 must define a unified customer pipeline row");
  assert.match(dataLayer, /listCrmV2UnifiedCustomers/, "data layer must expose unified customer/order rows");
  assert.match(dataLayer, /listPublicLeadRowsForRange/, "unified pipeline must bridge fresh public.leads rows instead of relying only on stale read-model data");
  assert.match(dataLayer, /listFreshUnifiedCustomerRows/, "unified pipeline must merge fresh public leads and orders for the selected range");
  assert.match(dataLayer, /listFreshUnifiedCustomerRows[\s\S]*listPublicLeadRowsForRange[\s\S]*listPublicOrdersForRange/, "fresh pipeline bridge must read both public.leads and public.orders");
  assert.match(dataLayer, /listPublicLeadRowsForRange[\s\S]*dateLowerBound\(range\.from\)[\s\S]*dateUpperBoundExclusive\(range\.to\)/, "fresh public lead bridge must use Vietnam-day date bounds");
  assert.match(dataLayer, /filterUnifiedCustomerRows/, "unified pipeline must apply filters after merging private read-model rows with fresh public rows");
  assert.match(dataLayer, /normalizeFacebookSource/, "data layer must normalize Facebook/Meta sources");
  assert.match(dataLayer, /fbclid|facebook_ads|meta/i, "source normalization must include Facebook ad identifiers");
  for (const column of ["Thời gian", "Tên khách", "SĐT", "Khóa học", "Mail", "Tình trạng thanh toán", "Hoạt động gần nhất"]) {
    assert.match(leadsClient, new RegExp(column), `Leads unified table must show ${column}`);
  }
  assert.match(dataLayer, /formatCrmLeadDateTime/, "Leads unified table must format row timestamps with hour and minute");
  assert.doesNotMatch(dataLayer, /date:\s*\w+\.slice\(0,\s*10\)/, "Leads unified table must not truncate timestamps to date-only labels");
  assert.match(leadsClient, /expandedRowId/, "Leads unified table must move extra fields into an expandable detail row");
  assert.match(leadsClient, /orderCode[\s\S]*amount[\s\S]*leadScore[\s\S]*emailStatus/, "Leads details must include order/payment/lead metadata");

  const dashboardPage = read("app/admin/crm-v2/page.tsx");
  const activityPage = read("app/admin/crm-v2/activity/page.tsx");
  assert.match(dashboardPage, /\/admin\/crm-v2\/activity/, "overview recent activity card must link to the full activity history");
  assert.match(activityPage, /listCrmV2ActivityHistory/, "full activity page must use the shared live activity history feed");
  assert.match(activityPage, /limit:\s*100/, "full activity page must show a longer activity history than the overview");
  assert.match(activityPage, /Hoạt động CRM/, "full activity page must be clearly labeled as CRM activity history");

  assert.match(types, /"mark_zalo_messaged"/, "CRM lead bulk actions must include a Zalo messaged status action");
  assert.match(types, /action: "mark_zalo_messaged"[\s\S]*email\?: string[\s\S]*orderCode\?: string/, "Zalo action payload must carry email/orderCode to resolve bridge rows");
  assert.match(leadActionsApi, /mark_zalo_messaged/, "Lead action API must accept mark_zalo_messaged");
  assert.match(leadActionsApi, /email:[\s\S]*body\.email[\s\S]*orderCode:[\s\S]*body\.orderCode/, "Lead action API must forward bridge row email/orderCode for Zalo resolution");
  assert.match(dataLayer, /bulkMarkLeadZaloMessaged/, "data layer must persist Zalo messaged status");
  assert.match(dataLayer, /last_zalo_messaged_at/, "Zalo action must persist the last Zalo message timestamp in metadata");
  assert.match(dataLayer, /from\("crm_events"\)/, "Zalo action must write a CRM timeline event");
  assert.match(dataLayer, /da-nhan-zalo/, "Zalo action must attach a stable Zalo follow-up tag");
  assert.match(dataLayer, /public-order:/, "Zalo action must handle public-order bridge rows");
  assert.match(dataLayer, /resolveZaloLeadIds/, "Zalo action must resolve CRM/public lead ids from bridge row phone/email/order code");
  assert.match(dataLayer, /createZaloFallbackPublicLead/, "Zalo action must create a public lead anchor when a bridge row has no existing lead");
  assert.match(dataLayer, /sale_status:\s*"Da nhan Zalo"/, "Zalo fallback anchor must persist the Zalo sale status");
  assert.match(leadsClient, /zalo:\/\/conversation\?phone=/, "Leads table must try to open Zalo PC by normalized phone");
  assert.match(leadsClient, /https:\/\/zalo\.me\//, "Zalo button must keep a web fallback");
  assert.match(leadsClient, /aria-label=\{`Nhắn Zalo/, "Zalo button must be accessible and explicit");
  assert.match(leadsClient, /openZaloConversation\(zaloPhone\)[\s\S]*JSON\.stringify\(\{ action: "mark_zalo_messaged"[\s\S]*email: row\.email[\s\S]*orderCode: row\.orderCode/, "Zalo click must open Zalo before the background status update");
  assert.match(leadsClient, /keepalive:\s*true/, "Zalo background status update must use keepalive");
  assert.match(leadsClient, /key: "phone"[\s\S]*key: "zalo"[\s\S]*key: "course"/, "Zalo column must sit next to SĐT so it is not clipped at the far right");
  assert.match(leadsClient, /hasZaloMessaged/, "expanded detail must derive whether Zalo was already messaged");
  assert.match(leadsClient, /label="Zalo"[\s\S]*hasZaloMessaged\(row\)/, "expanded detail must show Zalo messaged status");

  assert.match(leadsPage, /getCourses/, "CRM leads page must load real courses for customer-detail access actions");
  assert.match(leadsPage, /courseOptions=\{courseOptions\}/, "CRM leads page must pass course options into the expanded detail UI");
  assert.match(leadsClient, /type CourseOption/, "Leads client must define a compact real course option contract");
  assert.match(leadsClient, /function CustomerLearningActions/, "customer learning actions must live inside the expanded customer detail");
  assert.match(leadsClient, /<CustomerLearningActions[\s\S]*row=\{row\}/, "expanded lead detail must render learning actions for the clicked customer");
  assert.match(leadsClient, /\/api\/admin\/students\/access/, "expanded lead detail must reuse the real student access API");
  assert.match(leadsClient, /\/api\/admin\/students\/password-reset/, "expanded lead detail must reuse the real password reset email API");
  assert.match(leadsClient, /action:\s*"grant"/, "detail actions must support granting course access");
  assert.match(leadsClient, /action:\s*"revoke"/, "detail actions must support revoking course access");
  assert.match(leadsClient, /courseSlugs:\s*selectedCourseSlugs/, "detail actions must send selected real course slugs");
  assert.match(leadsClient, /Gửi lại mật khẩu/, "detail actions must expose the password email resend control");
});

test("crm v2 LMS and permissions are focused and owner-safe", () => {
  const studentsClient = read("components/crm-v2/students-page-client.tsx");
  const lmsManager = read("components/crm-v2/lms-management-client.tsx");
  const courseWorkspace = read("app/admin/course-studio/[courseSlug]/page.tsx");
  const teamActionsApi = read("app/api/admin/crm-v2/team/actions/route.ts");
  const adminEmails = read("lib/admin/admin-emails.ts");
  const adminMembers = read("lib/admin/admin-members.ts");

  assert.match(courseWorkspace, /CourseLmsManager/, "dedicated course route must render a focused LMS manager");
  assert.match(courseWorkspace, /selectedCourseSlug:\s*courseSlug/, "LMS manager must edit one selected course at a time");
  assert.match(lmsManager, /Tổng quan[\s\S]*Nội dung bán hàng[\s\S]*Curriculum[\s\S]*Media & tài liệu[\s\S]*Học viên & quyền học[\s\S]*Analytics[\s\S]*Kiểm tra & xuất bản/, "LMS manager must use the approved guided workspace");
  assert.doesNotMatch(studentsClient, /courses\.map[\s\S]*textarea[\s\S]*courses\.map/s, "LMS manager must not dump all course edit forms on one screen");

  assert.match(adminEmails, /theanhnguyen\.marketing@gmail\.com/, "main owner email must be part of configured owner source");
  assert.match(adminMembers, /Owner cấu hình bằng ADMIN_EMAILS không thể hạ quyền/, "env owner must not be downgraded from UI");
  assert.match(teamActionsApi, /create_admin_member|invite_admin_member|add_member/, "Team API must support adding a real admin member");
  assert.match(teamActionsApi, /audit_logs/, "Team permission changes must write audit logs");
});

test("crm v2 email and payment actions execute real server outcomes", () => {
  const emailActionsApi = read("app/api/admin/crm-v2/email/actions/route.ts");
  const ordersActionsApi = read("app/api/admin/crm-v2/orders/actions/route.ts");
  const emailActionButtons = read("components/crm-v2/email-action-buttons.tsx");
  const moduleButtons = read("components/crm-v2/module-action-buttons.tsx");
  const emailActionsService = read("lib/crm-v2/email-actions.ts");
  const emailPage = read("app/admin/crm-v2/email/page.tsx");
  const ordersPage = read("app/admin/crm-v2/orders/page.tsx");

  for (const action of ["save_draft", "preview_audience", "refresh_audience", "send_test_email", "send_campaign_now", "schedule_campaign", "cancel_schedule"]) {
    assert.match(emailActionsApi, new RegExp(action), `email action API must support ${action}`);
  }
  assert.match(emailActionsApi, /sendCrmV2CampaignNow/, "campaign send action must call the CRM v2 email sending service");
  assert.match(emailActionsApi, /sendCrmV2TestEmail/, "test email action must call the CRM v2 email sending service");
  assert.match(emailActionsApi, /buildCrmV2MarketingEmailContent/, "email API must render block composer content into provider payload");
  assert.match(emailActionsApi, /previewCrmV2CampaignAudience/, "email API must preview audience before sending");
  assert.match(emailActionsApi, /refreshCrmV2CampaignAudience/, "email API must refresh audience before scheduled or live send");
  assert.match(emailActionsApi, /RESEND_API_KEY/, "live sends must check Resend env instead of silently mocking");
  assert.match(emailActionsService, /getEmailProvider/, "email service must use EmailProvider");
  assert.match(emailActionsService, /from\("email_sends"\)/, "email service must write email_sends");
  assert.match(emailActionsService, /from\("email_events"\)/, "email service must write email_events");
  assert.match(emailActionsService, /from\("crm_events"\)/, "email service must write crm_events");
  assert.match(emailActionsService, /canSendMarketingEmail/, "marketing sends must enforce suppression");
  assert.match(emailActionsService, /filterAudienceContactsByOrderScope/, "marketing sends must filter recipients by course/payment order scope");
  assert.match(emailActionsService, /getCampaignAudienceScope/, "campaign send must reload course/payment scope before sending");
  assert.match(emailActionsService, /idempotency_key/, "email service must persist idempotency keys");
  assert.match(emailActionButtons, /send_test_email/, "email UI must expose test send");
  assert.match(emailActionButtons, /send_campaign_now/, "email UI must expose confirmed real send");
  assert.match(emailActionButtons, /preview_audience/, "email UI must expose audience preview");
  assert.match(emailActionButtons, /refresh_audience/, "email UI must expose audience refresh");
  assert.match(emailActionButtons, /confirmText/, "real customer send must require an explicit confirmation");
  assert.match(emailPage, /EmailActionButtons[\s\S]*campaign=\{campaigns\[0\]\}/, "email page must send actions against a real campaign row");

  assert.match(ordersActionsApi, /sendCrmV2PaymentReminder/, "order reminder must call email service");
  assert.match(ordersActionsApi, /email_send_queued:\s*true/, "order reminder task metadata must record real email queue/send");
  assert.doesNotMatch(ordersActionsApi, /email_send_queued:\s*false/, "order reminder cannot stop at a task-only fake action");
  assert.match(ordersPage, /OrderActionButtons order=\{orders\[0\]\}/, "orders UI must pass the real selected order, not only a string id");
  assert.doesNotMatch(moduleButtons, /"manual"/, "module actions must not default to manual placeholder IDs");
  assert.doesNotMatch(moduleButtons, /ops@theanhmarketing\.com/, "team action must not hard-code a fake member");
});

test("crm v2 Resend webhook records email events, CRM events, and suppression state", () => {
  const dataLayer = read("lib/crm-v2/data.ts");
  const route = read("app/api/webhooks/resend/route.ts");

  assert.match(route, /recordCrmEmailWebhookEvent/, "Resend webhook route must call CRM v2 recorder");
  assert.match(dataLayer, /from\("webhook_events"\)/, "webhook payloads must be preserved");
  assert.match(dataLayer, /from\("email_events"\)/, "normalized email events must be inserted");
  assert.match(dataLayer, /from\("crm_events"\)/, "contact timeline must receive email events");
  assert.match(dataLayer, /from\("email_suppression_list"\)/, "bounce/complaint/unsubscribe must write suppression");
  assert.match(dataLayer, /marketing_consent:\s*false/, "suppressed contacts must be removed from marketing");
  assert.match(dataLayer, /provider_message_id/, "webhook ingestion must link provider messages");
});

test("crm v2 migration scripts cover orders, payments, enrollments, and events", () => {
  const backfill = read("scripts/crm-v2/backfill-crm-v2.ts");
  const verify = read("scripts/crm-v2/verify-migration.ts");
  const audit = read("scripts/crm-v2/audit-current-data.ts");

  for (const table of ["orders", "payments", "enrollments", "email_sends", "email_events", "crm_events", "notes", "legacy_id_map", "migration_runs"]) {
    assert.match(backfill, new RegExp(`crm_v2\\.${table}|from\\("${table}"\\)`), `backfill must touch ${table}`);
  }

  assert.match(backfill, /public\.orders/, "backfill must map public.orders");
  assert.match(backfill, /public\.lead_activities/, "backfill must map public.lead_activities");
  assert.match(backfill, /public\.activity_logs/, "backfill must map public.activity_logs");
  assert.match(backfill, /public\.lead_notes/, "backfill must map public.lead_notes");
  assert.match(backfill, /orderLeadsUpserted/, "backfill must create order-only lead read models");
  assert.match(backfill, /expectedEnrollmentRows/, "backfill must verify expected paid-order enrollments");
  assert.match(backfill, /idempotencyKey/, "backfill must guard event idempotency");
  assert.match(verify, /paymentMappings/, "verify must check payment mappings");
  assert.match(verify, /enrollmentMappings/, "verify must check enrollment mappings");
  assert.match(verify, /leadActivityEventMappings/, "verify must check legacy lead activity event mappings");
  assert.match(verify, /activityLogEventMappings/, "verify must check legacy activity log event mappings");
  assert.match(verify, /leadNoteMappings/, "verify must check legacy lead note mappings");
  assert.match(verify, /ordersWithoutPayments/, "verify must stop on order/payment drift");
  assert.match(audit, /admin_deleted_students/, "audit should include student tombstones when present");
});

test("crm v2 unit suite runs against implementation code", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "--test", "tests/crm-v2-core.unit.ts"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
