import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Course Studio keeps all step navigation inside the independent studio", () => {
  const manager = read("components/crm-v2/lms-management-client.tsx");
  assert.match(manager, /studioMode\s*\?\s*`\/admin\/course-studio\/\$\{selectedCourse\?\.slug\}`/);
  assert.doesNotMatch(manager, /router\.replace\(`\/admin\/crm-v2\/courses\/\$\{selectedCourse\?\.slug\}/);
  assert.match(manager, /selectedModuleId/);
  assert.match(manager, /Bài học của module/);
});

test("customer course identity is merged atomically with paid order priority", () => {
  const data = read("lib/crm-v2/data.ts");
  assert.match(data, /courseIdentityPriority/);
  assert.match(data, /pickPreferredCourseIdentity/);
  assert.match(data, /public\.orders/);
  assert.doesNotMatch(data, /courseShort:\s*row\.courseShort/);
  assert.doesNotMatch(data, /if \(\/ebook\/i?\.test\(text\)\)/, "Facebook must not match Ebook by substring");
  assert.match(data, /\\bebook\\b/, "Ebook detection must use a real word boundary");
});

test("orders only live inside customer profiles", () => {
  const shell = read("components/crm-v2/crm-components.tsx");
  const ordersPage = read("app/admin/crm-v2/orders/page.tsx");
  const profile = read("app/admin/crm-v2/leads/[id]/page.tsx");
  assert.doesNotMatch(shell, /href:\s*"\/admin\/crm-v2\/orders"/);
  assert.match(ordersPage, /redirect\("\/admin\/crm-v2\/leads"\)/);
  assert.match(profile, /id:\s*"orders"/);
});

test("reports use the live BI surface with Meta Ads and truthful unit economics", () => {
  const page = read("app/admin/crm-v2/reports/page.tsx");
  const charts = read("components/crm-v2/report-bi-charts.tsx");
  assert.match(page, /getMetaAdsReport/);
  assert.match(page, /ReportBiCharts/);
  assert.match(page, /Chi phí \/ đơn thanh toán/);
  assert.match(page, /Chi phí \/ khách hàng mới/);
  assert.match(page, /Chưa đủ dữ liệu/);
  assert.match(charts, /layout="vertical"/);
  assert.match(charts, /Chi phí Ads/);
  assert.match(charts, /Doanh thu/);
  const components = read("components/crm-v2/crm-components.tsx");
  assert.doesNotMatch(components, /metric\.delta \?\? "On track"/);
  assert.doesNotMatch(components, /metric\.series \?\? \[1, 2, 3, 4, 5\]/);
});
