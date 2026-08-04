import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function loadTsModule(relativePath) {
  const source = fs.readFileSync(path.resolve(relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  new Function("exports", "module", compiled)(cjsModule.exports, cjsModule);
  return cjsModule.exports;
}

test("campaign product mapping keeps Ebook separate from the Facebook Ads course", () => {
  const { classifyCampaignProduct } = loadTsModule("lib/reports/telegram-product-report.ts");

  assert.equal(classifyCampaignProduct("2026 | SALES | Ebook FB Ads 2026 | KB5"), "ebook");
  assert.equal(classifyCampaignProduct("2026 | SALES | EBOOK | Pic"), "ebook");
  assert.equal(classifyCampaignProduct("2026 | SALES | FBA | KB1"), "facebook_ads_course");
  assert.equal(classifyCampaignProduct("2026 | SALES | FB Ads 2026 | Adv+"), "facebook_ads_course");
  assert.equal(classifyCampaignProduct("ENGAGEMENT | Follow page"), "unclassified");
});

test("order product mapping uses canonical slug and title without merging Ebook into FBA", () => {
  const { classifyOrderProduct } = loadTsModule("lib/reports/telegram-product-report.ts");

  assert.equal(classifyOrderProduct({ courseSlug: "ebook-facebook-ads-2026", courseTitle: "Ebook Facebook Ads 2026" }), "ebook");
  assert.equal(classifyOrderProduct({ courseSlug: "facebook-ads-2026", courseTitle: "Facebook Ads 2026" }), "facebook_ads_course");
  assert.equal(classifyOrderProduct({ courseSlug: "ai-master", courseTitle: "AI Master" }), "unclassified");
});

test("seven-day report uses seven complete Vietnam business days ending at 14:00", () => {
  const { buildSevenDayWindow } = loadTsModule("lib/reports/telegram-product-report.ts");

  assert.deepEqual(buildSevenDayWindow(new Date("2026-08-04T07:00:00.000Z")), {
    startIso: "2026-07-28T07:00:00.000Z",
    endIso: "2026-08-04T07:00:00.000Z",
  });
  assert.deepEqual(buildSevenDayWindow(new Date("2026-08-04T01:00:00.000Z")), {
    startIso: "2026-07-27T07:00:00.000Z",
    endIso: "2026-08-03T07:00:00.000Z",
  });
});

test("month-to-date report starts at Vietnam month midnight and ends at report time", () => {
  const { buildMonthToDateWindow } = loadTsModule("lib/reports/telegram-product-report.ts");

  assert.deepEqual(buildMonthToDateWindow(new Date("2026-08-04T01:00:00.000Z")), {
    startIso: "2026-07-31T17:00:00.000Z",
    endIso: "2026-08-04T01:00:00.000Z",
  });
});

test("product metrics apply the approved formula to Ebook and FBA separately", () => {
  const { aggregateProductMetrics } = loadTsModule("lib/reports/telegram-product-report.ts");
  const report = aggregateProductMetrics({
    orders: [
      { amount: 1_000_000, courseSlug: "ebook-facebook-ads-2026", courseTitle: "Ebook" },
      { amount: 2_000_000, courseSlug: "facebook-ads-2026", courseTitle: "Facebook Ads 2026" },
      { amount: 2_000_000, courseSlug: "facebook-ads-2026", courseTitle: "Facebook Ads 2026" },
    ],
    campaigns: [
      { campaignName: "SALES | Ebook FB Ads 2026", spend: 200_000 },
      { campaignName: "SALES | FBA | KB1", spend: 1_000_000 },
    ],
    ads: { available: true },
  });

  assert.deepEqual(report.rows, [
    {
      key: "ebook",
      label: "Ebook",
      orderCount: 1,
      grossReceived: 1_000_000,
      vat: 80_000,
      adSpend: 200_000,
      conversionFee: 4_000,
      estimatedResult: 716_000,
    },
    {
      key: "facebook_ads_course",
      label: "Khóa Facebook Ads",
      orderCount: 2,
      grossReceived: 4_000_000,
      vat: 320_000,
      adSpend: 1_000_000,
      conversionFee: 20_000,
      estimatedResult: 2_660_000,
    },
  ]);
  assert.equal(report.totals.estimatedResult, 3_376_000);
});

test("unclassified campaigns remain visible instead of being silently allocated", () => {
  const { aggregateProductMetrics } = loadTsModule("lib/reports/telegram-product-report.ts");
  const report = aggregateProductMetrics({
    orders: [],
    campaigns: [{ campaignName: "ENGAGEMENT | Follow page", spend: 125_000 }],
    ads: { available: true },
  });

  assert.deepEqual(report.rows[0], {
    key: "unclassified",
    label: "Chưa phân loại",
    orderCount: 0,
    grossReceived: 0,
    vat: 0,
    adSpend: 125_000,
    conversionFee: 2_500,
    estimatedResult: -127_500,
  });
});

test("missing or unreconciled Ads hides product profit instead of treating spend as zero", () => {
  const { aggregateProductMetrics } = loadTsModule("lib/reports/telegram-product-report.ts");
  const report = aggregateProductMetrics({
    orders: [{ amount: 1_000_000, courseSlug: "ebook-facebook-ads-2026", courseTitle: "Ebook" }],
    campaigns: [],
    ads: { available: false, reason: "Thiếu snapshot MCP theo giờ" },
  });

  assert.equal(report.available, false);
  assert.equal(report.rows[0].adSpend, null);
  assert.equal(report.rows[0].estimatedResult, null);
  assert.equal(report.totals.estimatedResult, null);
});

test("Telegram product report returns ordered current, seven-day, and month sections", () => {
  const { aggregateProductMetrics, buildTelegramProductReportMessages } = loadTsModule("lib/reports/telegram-product-report.ts");
  const metrics = aggregateProductMetrics({
    orders: [{ amount: 1_000_000, courseSlug: "ebook-facebook-ads-2026", courseTitle: "Ebook" }],
    campaigns: [{ campaignName: "Ebook", spend: 200_000 }],
    ads: { available: true },
  });
  const messages = buildTelegramProductReportMessages({
    slot: "full-day",
    test: true,
    current: { startIso: "2026-08-03T07:00:00.000Z", endIso: "2026-08-04T07:00:00.000Z", metrics },
    sevenDay: { startIso: "2026-07-28T07:00:00.000Z", endIso: "2026-08-04T07:00:00.000Z", metrics },
    month: { startIso: "2026-07-31T17:00:00.000Z", endIso: "2026-08-04T07:00:00.000Z", metrics },
  });

  assert.equal(messages.length, 3);
  assert.match(messages[0], /^\[TEST\] BÁO CÁO CHỐT NGÀY 14:00/);
  assert.match(messages[0], /THEO SẢN PHẨM/);
  assert.match(messages[1], /7 NGÀY · 14:00 → 14:00/);
  assert.match(messages[1], /Khóa Facebook Ads|Ebook/);
  assert.match(messages[2], /DOANH THU THÁNG ĐẾN HIỆN TẠI/);
  assert.match(messages[2], /Ebook: 1\.000\.000 ₫/);
  assert.ok(messages.every((message) => message.length <= 4096));
});
