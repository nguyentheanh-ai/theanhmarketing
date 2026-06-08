import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin dashboard mounts overview report UI while preserving existing data services", () => {
  const source = readSource("app/admin/dashboard/page.tsx");

  assert.match(source, /AdminOverviewDashboard/);
  assert.match(source, /getAdminPaymentOrders\(\)/);
  assert.match(source, /getAdminLeads\(\)/);
  assert.match(source, /getAdminCourses\(\)/);
  assert.doesNotMatch(source, /getAdminAdCosts/);
  assert.doesNotMatch(source, /fallbackOrders|fallbackLeads|demo/i);
});

test("overview dashboard exposes lead activity, daily revenue and best sellers without ad-cost UI", () => {
  const source = readSource("components/admin/admin-overview-dashboard.tsx");
  const model = readSource("lib/admin/overview-dashboard.ts");
  const adminData = readSource("services/adminDataService.ts");
  const shell = readSource("components/app/admin-shell.tsx");

  for (const label of [
    "Hoạt động Lead gần đây",
    "Doanh thu từng ngày",
    "Khóa bán chạy",
    "So với hôm trước",
    "Tổng doanh thu",
    "Đơn paid",
    "Số dòng",
    "Truy cập nhanh",
    "Hôm nay",
    "Hôm qua",
    "7 ngày qua",
    "Tháng này",
    "Tháng trước",
  ]) {
    assert.match(source, new RegExp(label));
  }

  assert.match(model, /buildAdminOverviewModel/);
  assert.match(model, /revenueChangePercent/);
  assert.match(model, /getDaySequence\(now, 100\)/);
  assert.match(model, /Asia\/Ho_Chi_Minh/);
  assert.match(source, /selectedRangeRows/);
  assert.match(source, /selectedRangeRevenue/);
  assert.match(source, /selectedRangePaidOrders/);
  assert.match(source, /selectedRangeLeads/);
  assert.match(source, /rangePresets/);
  assert.match(source, /reportRowLimit/);
  assert.match(source, /reportRowLimitOptions = \[14, 30, 60, 100\]/);

  for (const content of [source, model, adminData, shell]) {
    assert.doesNotMatch(content, /\/admin\/ad-costs/);
    assert.doesNotMatch(content, /AdminAdCost|getAdminAdCosts|admin_ad_costs|adCosts|adCost|costPerLead|costPerPaidOrder/);
    assert.doesNotMatch(content, /Chi phí QC|chi phí quảng cáo|CPL|Lãi\s*\/\s*lỗ/i);
  }
});

test("admin lead read model surfaces orders even when lead insert was missing", () => {
  const service = readSource("services/leadService.ts");

  assert.match(service, /buildLeadFromOrder/);
  assert.match(service, /matchedOrderCodes/);
  assert.match(service, /orderOnlyLeads/);
  assert.match(service, /Tự bổ sung từ order vì chưa có lead/);
});

test("Growth OS dashboard exposes working tab targets and real admin data props", () => {
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

test("admin shell uses the website logo and compact centralized admin navigation", () => {
  const source = readSource("components/app/admin-shell.tsx");

  assert.match(source, /\/brand\/ta-logo\.svg/);
  assert.match(source, /Admin CRM/);
  assert.match(source, /\/admin\/hoc-vien/);
  assert.match(source, /\/admin\/leads/);
  assert.match(source, /\/admin\/khoa-hoc/);
  assert.match(source, /\/admin\/thanh-vien-admin/);
  assert.match(source, /\/admin\/dashboard/);
  assert.doesNotMatch(source, /\/admin\/ad-costs/);
  assert.doesNotMatch(source, /\/admin\/facebook-ads/);
  assert.doesNotMatch(source, /Chi phí QC|Ads & doanh thu/);
  assert.match(source, /Admin Panel/);
  assert.doesNotMatch(source, /moduleSearch/);
  assert.doesNotMatch(source, /Tìm module admin/);
  assert.doesNotMatch(source, /Global search/);
  assert.match(source, /Realtime/);
});
