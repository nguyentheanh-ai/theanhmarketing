import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin dashboard mounts the truthful solo command center without ad-cost UI", () => {
  const page = readSource("app/admin/dashboard/page.tsx");
  const source = readSource("components/admin/solo-command-center/command-center-dashboard.tsx");
  const charts = readSource("components/admin/solo-command-center/command-center-charts.tsx");
  const service = readSource("services/adminCommandCenterService.ts");
  const shell = readSource("components/app/admin-shell.tsx");

  assert.match(page, /CommandCenterDashboard/);
  assert.match(page, /getSoloCommandCenterModel\(range\)/);
  assert.match(page, /resolveCommandCenterRange/);

  for (const label of [
    "Doanh thu đã thanh toán",
    "Đơn đã thanh toán",
    "Học viên mới",
    "Lead mới",
    "Tạo học viên",
  ]) {
    assert.match(source, new RegExp(label));
  }

  assert.match(charts, /Doanh thu theo ngày/);
  assert.match(charts, /Khóa học bán tốt/);
  assert.match(service, /buildSoloCommandCenterModel/);
  assert.match(source, /Asia\/Ho_Chi_Minh/);

  for (const content of [page, source, charts, service, shell]) {
    assert.doesNotMatch(content, /\/admin\/ad-costs/);
    assert.doesNotMatch(content, /AdminAdCost|getAdminAdCosts|admin_ad_costs|adCosts|adCost|costPerLead|costPerPaidOrder/);
    assert.doesNotMatch(content, /Chi phí QC|chi phí quảng cáo|CPL|Lãi\s*\/\s*lỗ/i);
    assert.doesNotMatch(content, /fallbackOrders|fallbackLeads|demo/i);
  }
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
  const source = readSource("components/app/admin-shell.tsx");

  assert.match(source, /\/brand\/ta-logo\.svg/);
  assert.match(source, /Admin Panel/);
  assert.match(source, /\/admin\/hoc-vien/);
  assert.match(source, /\/admin\/leads/);
  assert.match(source, /\/admin\/khoa-hoc/);
  assert.match(source, /\/admin\/cai-dat/);
  assert.match(source, /\/admin\/dashboard/);
  assert.doesNotMatch(source, /\/admin\/ad-costs/);
  assert.doesNotMatch(source, /\/admin\/facebook-ads/);
  assert.doesNotMatch(source, /Chi phí QC|Ads & doanh thu/);
  assert.doesNotMatch(source, /moduleSearch|Tìm module admin|Global search/);
  assert.match(source, /Realtime/);
});
