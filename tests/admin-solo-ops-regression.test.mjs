import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Course Studio tab navigation retains its route and focuses the selected curriculum", () => {
  const manager = read("components/crm-v2/lms-management-client.tsx");
  assert.match(manager, /studioMode \? "\/admin\/course-studio" : "\/admin\/crm-v2\/courses"/);
  assert.match(manager, /encodeURIComponent\(course\?\.slug/);
  assert.match(manager, /setTab\(next\)/);
  assert.match(manager, /visibleModules\.find\(\(item\) => item\.id === moduleId\)/);
  assert.doesNotMatch(manager, />\{lesson\.slug\}</);
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

test("Ebook order slug determines the short CRM label when the product title only says Facebook Ads", () => {
  const data = read("lib/crm-v2/data.ts");
  const functionSource = data.match(/function courseShortName\([\s\S]*?\n\}/)?.[0];

  assert.ok(functionSource, "courseShortName must remain available for CRM course labels");

  const runnableSource = functionSource
    .replace(/value:\s*string/g, "value")
    .replace(/slug\?:\s*string/g, "slug");
  const courseShortName = new Function(`${runnableSource}; return courseShortName;`)();

  assert.equal(
    courseShortName("Thư viện kiến thức Facebook Ads 2026", "ebook-facebook-ads-2026"),
    "Ebook",
  );
  assert.equal(
    courseShortName("Quảng cáo Facebook Master 2026", "facebook-ads-2026"),
    "FB Ads",
  );
  assert.equal(
    courseShortName("Marketing giỏi phải kiếm được tiền", "marketing-gioi-phai-kiem-duoc-tien"),
    "Marketing giỏi phải",
    "Non-target products must keep the existing title-based fallback label",
  );
});

test("orders only live inside customer profiles", () => {
  const shell = read("components/crm-v2/crm-components.tsx");
  const ordersPage = read("app/admin/crm-v2/orders/page.tsx");
  const profile = read("components/admin/customer-directory.tsx");
  assert.doesNotMatch(shell, /href:\s*"\/admin\/crm-v2\/orders"/);
  assert.match(ordersPage, /redirect\("\/admin\/crm-v2\/leads"\)/);
  assert.match(profile, /tab === "orders"/);
});

test("reports share the sales workspace and keep optional Ads isolated", () => {
  const page = read("app/admin/crm-v2/reports/page.tsx");
  const workspace = read("components/crm-v2/analytics-workspace.tsx");
  const server = read("components/crm-v2/analytics-page.tsx");
  assert.match(page, /AnalyticsPage/);
  assert.match(server, /getAdminAnalytics/);
  assert.doesNotMatch(server, /getMetaAdsReport/);
  assert.match(workspace, /AdminDialog/);
  assert.match(workspace, /table-fixed/);
  assert.match(workspace, /break-words/);
  assert.match(workspace, /MER/);
  assert.doesNotMatch(workspace, /Chưa đủ dữ liệu/);
});
