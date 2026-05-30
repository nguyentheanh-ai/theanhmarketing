import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const fullPath = path.resolve(relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", "require", compiled);
  runner(cjsModule.exports, cjsModule, require);
  return cjsModule.exports;
}

const dateRange = {
  startDate: "2026-05-01",
  endDate: "2026-05-07",
};

test("product ads report calculates spend, revenue, ME/RE, CPL and CVR per product", () => {
  const { buildProductAdsPerformanceRows } = loadTsModule("lib/admin/product-ads-report.ts");

  const rows = buildProductAdsPerformanceRows({
    ...dateRange,
    mappings: [
      {
        id: "map-manh-vibe",
        productName: "Mạnh Vibe THCN",
        courseSlug: "manh-vibe-thcn",
        campaignKeywords: ["manh vibe"],
        adsetKeywords: [],
        utmCampaignKeywords: ["manh-vibe"],
        utmSourceKeywords: [],
        active: true,
      },
    ],
    kpis: [
      {
        productName: "Mạnh Vibe THCN",
        kpiLeadsPerDay: 42,
        targetCpl: 60000,
      },
    ],
    campaigns: [
      {
        campaignId: "cmp-1",
        campaignName: "MANH VIBE - Lead - cold",
        adsetName: "Interest cold",
        spend: 19084369,
        clicks: 4511,
        leads: 257,
      },
    ],
    orders: [
      {
        status: "paid",
        amount: 85858000,
        courseSlug: "manh-vibe-thcn",
        courseTitle: "Mạnh Vibe THCN",
        paidAt: "2026-05-03T10:00:00.000Z",
        createdAt: "2026-05-01T10:00:00.000Z",
        orderItems: [],
      },
      {
        status: "pending",
        amount: 999000,
        courseSlug: "manh-vibe-thcn",
        courseTitle: "Mạnh Vibe THCN",
        paidAt: null,
        createdAt: "2026-05-04T10:00:00.000Z",
        orderItems: [],
      },
    ],
    leads: [],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].productName, "Mạnh Vibe THCN");
  assert.equal(rows[0].adSpend, 19084369);
  assert.equal(rows[0].funnelRevenue, 85858000);
  assert.equal(rows[0].meRePercent, 22.23);
  assert.equal(rows[0].leads, 257);
  assert.equal(rows[0].averageLeadsPerDay, 36.7);
  assert.equal(rows[0].kpiLeadsPerDay, 42);
  assert.equal(rows[0].targetCpl, 60000);
  assert.equal(rows[0].actualCostPerLead, 74258);
  assert.equal(rows[0].clicks, 4511);
  assert.equal(rows[0].cvrLpPercent, 5.7);
});

test("product ads report maps campaign, adset and CRM UTM data into the correct product", () => {
  const { buildProductAdsPerformanceRows } = loadTsModule("lib/admin/product-ads-report.ts");

  const rows = buildProductAdsPerformanceRows({
    ...dateRange,
    mappings: [
      {
        id: "map-facebook-master",
        productName: "Quảng cáo Facebook Master 2026",
        courseSlug: "facebook-ads-2026",
        campaignKeywords: ["fb master"],
        adsetKeywords: ["facebook master"],
        utmCampaignKeywords: ["fb-master"],
        utmSourceKeywords: ["facebook"],
        active: true,
      },
    ],
    kpis: [],
    campaigns: [
      {
        campaignId: "cmp-2",
        campaignName: "Awareness general",
        adsetName: "Facebook Master - retarget",
        spend: 1200000,
        clicks: 300,
        leads: 0,
      },
    ],
    orders: [],
    leads: [
      {
        id: "lead-1",
        name: "Lead A",
        phone: "090",
        email: "a@example.com",
        need: "Khóa: Quảng cáo Facebook Master 2026\nUTM source: facebook\nUTM campaign: fb-master-cold",
        source: "Website",
        status: "Mới",
        createdAt: "2026-05-05T08:00:00.000Z",
      },
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].productName, "Quảng cáo Facebook Master 2026");
  assert.equal(rows[0].adSpend, 1200000);
  assert.equal(rows[0].crmLeads, 1);
  assert.equal(rows[0].leads, 1);
  assert.equal(rows[0].actualCostPerLead, 1200000);
  assert.equal(rows[0].cvrLpPercent, 0.33);
});

test("product ads report keeps unmapped and zero-denominator rows stable", () => {
  const { buildProductAdsPerformanceRows } = loadTsModule("lib/admin/product-ads-report.ts");

  const rows = buildProductAdsPerformanceRows({
    ...dateRange,
    mappings: [],
    kpis: [],
    campaigns: [
      {
        campaignId: "cmp-unmapped",
        campaignName: "Campaign without product",
        adsetName: "",
        spend: 500000,
        clicks: 0,
        leads: 0,
      },
    ],
    orders: [],
    leads: [],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].productName, "Chưa phân loại");
  assert.equal(rows[0].funnelRevenue, 0);
  assert.equal(rows[0].meRePercent, null);
  assert.equal(rows[0].actualCostPerLead, null);
  assert.equal(rows[0].cvrLpPercent, null);
});

test("admin facebook ads route exposes the required dense product report table", () => {
  const page = read("app/admin/facebook-ads/page.tsx");
  const client = read("components/admin/product-ads-report-client.tsx");
  const nav = read("components/app/admin-shell.tsx");
  const reportRoute = read("app/api/admin/meta/product-report/route.ts");
  const kpiRoute = read("app/api/admin/meta/product-kpis/route.ts");
  const connectStartRoute = read("app/api/admin/meta/connect/start/route.ts");
  const connectCallbackRoute = read("app/api/admin/meta/connect/callback/route.ts");
  const oauth = read("lib/meta/oauth.ts");
  const providerTokenStore = read("lib/facebook-provider-token-store.ts");

  assert.match(page, /allowedRoles=\{\["owner"\]\}/);
  assert.match(nav, /\/admin\/facebook-ads/);
  assert.match(reportRoute, /buildProductAdsPerformanceRows/);
  assert.match(reportRoute, /metaAdsTokenCookie/);
  assert.match(reportRoute, /getLatestStoredFacebookProviderToken/);
  assert.match(reportRoute, /chooseSelectedAdAccountId/);
  assert.match(reportRoute, /configuredAccount/);
  assert.match(kpiRoute, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.match(connectStartRoute, /buildMetaAdsOAuthUrl/);
  assert.match(connectCallbackRoute, /exchangeMetaAdsOAuthCode/);
  assert.match(oauth, /cleanEnvValue/);
  assert.match(oauth, /replace\(\/\^\\uFEFF\//);
  assert.match(oauth, /https:\/\/www\.theanhmarketing\.com/);
  assert.match(oauth, /ads_read/);
  assert.match(oauth, /read_insights/);
  assert.match(providerTokenStore, /facebook_provider_tokens/);
  assert.match(providerTokenStore, /decryptStoredFacebookToken/);
  assert.match(providerTokenStore, /grantedScopes\.includes\("ads_read"\)/);
  assert.match(client, /Kết nối Facebook/);
  assert.match(client, /\/api\/admin\/meta\/connect\/start/);

  for (const column of [
    "#",
    "Sản phẩm",
    "Chi phí QC",
    "DT phễu",
    "ME/RE",
    "Leads",
    "Lead TB/ngày",
    "KPI Lead/ngày",
    "Giá Lead (KH)",
    "Chi phí/Lead TT",
    "Click",
    "CVR LP",
  ]) {
    assert.match(client, new RegExp(column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(client, /sticky top-0/);
  assert.match(client, /overflow-x-auto/);
  assert.doesNotMatch(client, /grid-cols-4/);
});

test("admin facebook ads report keeps operator controls for scan speed and risk review", () => {
  const client = read("components/admin/product-ads-report-client.tsx");

  assert.match(client, /summary/);
  assert.match(client, /sortRows/);
  assert.match(client, /sortKey/);
  assert.match(client, /riskOnly/);
  assert.match(client, /Chỉ cảnh báo/);
  assert.match(client, /7 ngày/);
  assert.match(client, /30 ngày/);
  assert.match(client, /Ngày bắt đầu không được sau ngày kết thúc/);
});
