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

test("business report windows use exact Vietnam 14:00 boundaries", () => {
  const { buildTelegramReportWindow } = loadTsModule("lib/reports/telegram-business-day.ts");

  assert.deepEqual(buildTelegramReportWindow("morning", new Date("2026-08-04T01:00:00.000Z")), {
    slot: "morning",
    startIso: "2026-08-03T07:00:00.000Z",
    endIso: "2026-08-04T01:00:00.000Z",
  });
  assert.deepEqual(buildTelegramReportWindow("full-day", new Date("2026-08-04T07:00:00.000Z")), {
    slot: "full-day",
    startIso: "2026-08-03T07:00:00.000Z",
    endIso: "2026-08-04T07:00:00.000Z",
  });
  assert.deepEqual(buildTelegramReportWindow("full-day", new Date("2026-08-04T06:59:00.000Z")), {
    slot: "full-day",
    startIso: "2026-08-02T07:00:00.000Z",
    endIso: "2026-08-03T07:00:00.000Z",
  });
});

test("business report calculations apply owner-approved VAT and Ads conversion fee", () => {
  const { calculateTelegramBusinessMetrics } = loadTsModule("lib/reports/telegram-business-day.ts");

  assert.deepEqual(calculateTelegramBusinessMetrics({ grossReceived: 10_000_000, adSpend: 2_000_000 }), {
    grossReceived: 10_000_000,
    vat: 800_000,
    adSpend: 2_000_000,
    conversionFee: 40_000,
    estimatedResult: 7_160_000,
  });
});

test("business report message is aggregate-only, explicit, and fail-closed for Ads", () => {
  const { buildTelegramBusinessReportMessage } = loadTsModule("lib/reports/telegram-business-day.ts");
  const base = {
    slot: "full-day",
    startIso: "2026-08-03T07:00:00.000Z",
    endIso: "2026-08-04T07:00:00.000Z",
    orderCount: 4,
    grossReceived: 10_000_000,
  };
  const available = buildTelegramBusinessReportMessage({ ...base, test: true, ads: { available: true, spend: 2_000_000 } });
  assert.match(available, /^\[TEST\]/);
  assert.match(available, /14:00 03\/08\/2026 → 14:00 04\/08\/2026/);
  assert.match(available, /Đơn đã thanh toán: 4/);
  assert.match(available, /VAT Facebook \(8% tiền thu\): 800\.000 ₫/);
  assert.match(available, /Phí chuyển đổi \(2% Ads\): 40\.000 ₫/);
  assert.match(available, /Lãi\/lỗ tạm tính: \+7\.160\.000 ₫/);
  assert.doesNotMatch(available, /email|điện thoại|khách:/i);

  const unavailable = buildTelegramBusinessReportMessage({ ...base, ads: { available: false, reason: "Meta timeout" } });
  assert.match(unavailable, /Chi phí Ads: CHƯA CÓ DỮ LIỆU/);
  assert.match(unavailable, /Meta timeout/);
  assert.doesNotMatch(unavailable, /Lãi\/lỗ tạm tính:/);
});
