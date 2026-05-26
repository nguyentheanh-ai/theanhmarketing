import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin dashboard mounts Growth OS UI while preserving existing data services", () => {
  const source = readSource("app/admin/dashboard/page.tsx");

  assert.match(source, /AdminGrowthOsDashboard/);
  assert.match(source, /getAdminPaymentOrders\(\)/);
  assert.match(source, /getAdminLeads\(\)/);
  assert.match(source, /getAdminStudentAccessRecords\(\)/);
  assert.match(source, /getAdminCourses\(\)/);
  assert.doesNotMatch(source, /fallbackOrders|fallbackLeads|demo/i);
});

test("Growth OS dashboard exposes working tab targets and real admin data props", () => {
  const source = readSource("components/admin/admin-growth-os-dashboard.tsx");

  for (const label of [
    "Dashboard",
    "CRM",
    "Học viên",
    "Khóa học",
    "Automation",
    "Click events",
    "Payments",
    "Reports",
  ]) {
    assert.match(source, new RegExp(label));
  }

  for (const prop of ["orders", "leads", "students", "courses"]) {
    assert.match(source, new RegExp(`${prop}:`));
  }

  assert.match(source, /useState<AdminTabId>/);
  assert.match(source, /STT - Mã đơn/);
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

test("admin shell uses the website logo and Growth OS navigation shell", () => {
  const source = readSource("components/app/admin-shell.tsx");

  assert.match(source, /\/brand\/ta-logo\.svg/);
  assert.match(source, /AI Growth OS/);
  assert.match(source, /Global search/);
  assert.match(source, /Realtime/);
});
