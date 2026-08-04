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
