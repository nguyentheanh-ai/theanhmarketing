import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin dashboard mounts the truthful solo command center without ad-cost UI", () => {
  const page = readSource("app/admin/dashboard/page.tsx");
  assert.match(page, /requireAdminAuth/);
  assert.match(page, /redirect\(`/);
  assert.doesNotMatch(page, /CommandCenterDashboard|getSoloCommandCenterModel/);
  assert.match(readSource("app/admin/crm-v2/page.tsx"), /getCrmV2Dashboard/);
  assert.match(readSource("lib/crm-v2/report-source.ts"), /readReportPages/);

});

test("admin lead read model surfaces orders even when lead insert was missing", () => {
  const service = readSource("services/leadService.ts");

  assert.match(service, /buildLeadFromOrder/);
  assert.match(service, /matchedOrderCodes/);
  assert.match(service, /orderOnlyLeads/);
  assert.match(service, /Tự bổ sung từ order vì chưa có lead/);
});

test("Growth OS dashboard keeps working tab targets and real admin data props while unmounted", () => {
  const source = readSource("components/admin/admin-growth-os-dashboard.tsx");

  for (const id of [
    "dashboard",
    "crm",
    "students",
    "courses",
    "automation",
    "clicks",
    "payments",
    "reports",
  ]) {
    assert.match(source, new RegExp(id));
  }

  assert.doesNotMatch(source, /label: "Dashboard"|label: "Automation"|label: "Click events"|label: "Payments"|label: "Reports"/);
  for (const prop of ["orders", "leads", "students", "courses"]) {
    assert.match(source, new RegExp(`${prop}:`));
  }
  assert.match(source, /useState<AdminTabId>/);
  assert.doesNotMatch(source, /mock|sample|demo/i);
});

test("Click events tab renders tracking analytics instead of a placeholder", () => {
  const source = readSource("components/admin/admin-growth-os-dashboard.tsx");

  assert.match(source, /function buildClickEventAnalytics/);
  assert.match(source, /topSources/);
  assert.match(source, /landingPages/);
  assert.match(source, /eventTimeline/);
  assert.match(source, /Pixel Facebook/);
  assert.match(source, /UTM source/);
  assert.match(source, /Click → payment/);
  assert.doesNotMatch(source, /Khi bảng click_events được bật/);
});

test("admin shell uses the website logo and compact solo command center navigation", () => {
  const shell = readSource("components/crm-v2/crm-components.tsx");
  for (const route of ["/admin/crm-v2/students", "/admin/crm-v2/courses", "/admin/crm-v2/leads", "/admin/crm-v2/reports", "/admin/crm-v2/settings", "/admin/viec-can-xu-ly"]) assert.ok(shell.includes(route));
  assert.match(readSource("components/app/admin-shell.tsx"), /<CrmShell/);
  assert.doesNotMatch(readSource("components/app/admin-shell.tsx"), /<aside/);
  assert.match(shell, /visibleNav/);

});
