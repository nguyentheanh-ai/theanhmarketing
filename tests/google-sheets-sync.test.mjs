import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

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
  const runner = new Function("exports", "module", compiled);
  runner(cjsModule.exports, cjsModule);
  return cjsModule.exports;
}

const order = {
  id: "order-1",
  orderCode: "TAM123",
  studentName: "Nguyen Van A",
  email: "student@example.com",
  phone: "0900000000",
  courseSlug: "facebook-ads-2026",
  courseTitle: "Facebook Ads Master 2026",
  amount: 399000,
  amountLabel: "399.000d",
  currency: "VND",
  status: "pending",
  paymentMethod: "sepay",
  paymentQrUrl: "",
  paidAt: null,
  expiresAt: null,
  createdAt: "2026-06-03T10:00:00.000Z",
  sepayReferenceCode: null,
  orderItems: [{ slug: "facebook-ads-2026", title: "Facebook Ads Master 2026", price: 399000 }],
  paymentEmailSentAt: null,
  paymentEmailLastError: null,
};

test("google sheets order payload only includes compact canonical fields for fixed sheet schema", () => {
  const { buildGoogleSheetOrderPayload } = loadTsModule("lib/notifications/google-sheets.ts");
  const payload = buildGoogleSheetOrderPayload(order, {
    source: "LDP Test",
    landingPageUrl: "https://www.theanhmarketing.com/academy/facebook-ads-master-2026",
  });

  assert.deepEqual(Object.keys(payload).sort(), [
    "amount",
    "courseSlug",
    "courseTitle",
    "date",
    "dedupeKey",
    "email",
    "entityType",
    "expiresAt",
    "name",
    "orderCode",
    "paidAt",
    "paymentMethod",
    "paymentUrl",
    "phone",
    "sepayReferenceCode",
    "status",
  ].sort());
  assert.equal(payload.entityType, "order");
  assert.equal(payload.dedupeKey, "TAM123");
  assert.equal(payload.date, "03/06/2026 17:00");
  assert.equal(payload.name, "Nguyen Van A");
  assert.equal(payload.phone, '="0900000000"');
  assert.equal(payload.email, "student@example.com");
  assert.equal(payload.orderCode, "TAM123");
  assert.equal(payload.amount, 399000);
  assert.equal(payload.status, "pending");
  assert.equal(payload.paymentMethod, "sepay");
  assert.equal(payload.paymentUrl, "https://theanhmarketing.com/thanh-toan/TAM123");
  assert.equal(payload.paidAt, "");
  assert.equal(payload.expiresAt, "");
  assert.equal(payload.sepayReferenceCode, "");
  assert.equal(payload.createdAt, undefined);
  assert.equal(payload.id, undefined);
  assert.equal(payload.amountLabel, undefined);
  assert.equal(payload.currency, undefined);
  assert.equal(payload.source, undefined);
  assert.equal(payload.syncedAt, undefined);
  assert.equal(payload.ldpUrl, undefined);
  assert.equal(payload.landingPageUrl, undefined);
  assert.equal(payload.linkLdp, undefined);
  assert.equal(payload.orderItems, undefined);
  assert.equal(payload["Created At"], undefined);
  assert.equal(payload["Order Code"], undefined);
});

test("google sheets lead payload does not put generated checkout tracking blobs into note", () => {
  const { buildGoogleSheetLeadPayload } = loadTsModule("lib/notifications/google-sheets.ts");
  const payload = buildGoogleSheetLeadPayload({
    id: "lead-1",
    name: "Nguyen Van A",
    email: "student@example.com",
    phone: "0900000000",
    need: [
      "Ma don: TAM123",
      "Khoa: Facebook Ads Master 2026",
      "Goi: zoom-kit",
      "So tien: 799.000d",
      "Trang thai: pending",
      "Landing: academy/facebook-ads-master-2026",
      "URL: https://www.theanhmarketing.com/academy/facebook-ads-master-2026",
      "Referrer: https://l.facebook.com/",
      "UTM source: fb",
      "UTM medium: paid",
      "campaign_id: 120248392122080568",
      "fbclid: test-fbclid",
      "IP: 127.0.0.1",
      "fbp: fb.1.test",
      "fbc: fb.1.test",
      "Lead ID: web.test",
    ].join("\n"),
    source: "LDP Facebook Ads Master 2026",
    status: "new",
    saleStatus: "Chua lien he",
    createdAt: "2026-06-03T10:00:00.000Z",
    orderCode: "TAM123",
    courseTitle: "Facebook Ads Master 2026",
    paymentStatus: "unpaid",
    paymentMethod: "sepay",
    attribution: {
      utmSource: "fb",
      utmMedium: "paid",
      campaignId: "120248392122080568",
      fbclid: "test-fbclid",
      fbc: "fb.1.test",
      fbp: "fb.1.test",
      landingPage: "https://www.theanhmarketing.com/academy/facebook-ads-master-2026",
    },
  });

  assert.equal(payload.orderCode, "TAM123");
  assert.equal(payload.utmSource, "fb");
  assert.equal(payload.utmMedium, "paid");
  assert.equal(payload.campaignId, "120248392122080568");
  assert.equal(payload.fbclid, "test-fbclid");
  assert.equal(payload.fbc, "fb.1.test");
  assert.equal(payload.fbp, "fb.1.test");
  assert.equal(payload.landingPage, "https://www.theanhmarketing.com/academy/facebook-ads-master-2026");
  assert.equal(payload.paymentPlan, "zoom-kit");
  assert.equal(payload.referrer, "https://l.facebook.com/");
  assert.equal(payload.ipAddress, "127.0.0.1");
  assert.equal(payload.webLeadId, "web.test");
  assert.equal(payload.note, "");
});

test("google sheets lead payload preserves real manual notes", () => {
  const { buildGoogleSheetLeadPayload } = loadTsModule("lib/notifications/google-sheets.ts");
  const payload = buildGoogleSheetLeadPayload({
    id: "lead-2",
    name: "Nguyen Van B",
    email: "student-b@example.com",
    phone: "0911111111",
    need: "Khach can goi lai luc 15h",
    source: "Manual",
    status: "new",
    saleStatus: "Chua lien he",
  });

  assert.equal(payload.note, "Khach can goi lai luc 15h");
});

test("google sheets sync skips without webhook and posts compact JSON when configured", async () => {
  const { syncOrderToGoogleSheet } = loadTsModule("lib/notifications/google-sheets.ts");
  const previousWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  try {
    delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    const skipped = await syncOrderToGoogleSheet(order);
    assert.equal(skipped.ok, true);
    assert.equal(skipped.skipped, true);
    assert.equal(skipped.reason, "Missing GOOGLE_SHEETS_WEBHOOK_URL");

    process.env.GOOGLE_SHEETS_WEBHOOK_URL =
      "https://docs.google.com/spreadsheets/d/16OR43vZDLEtjYTgyOdt3DM46PF0cjE-kyLH1YkqBFX0/edit";
    const invalidUrl = await syncOrderToGoogleSheet(order, {
      fetchImpl: async () => {
        throw new Error("invalid URL should not be posted");
      },
    });
    assert.equal(invalidUrl.ok, false);
    assert.match(invalidUrl.reason, /Apps Script Web App \/exec URL/);
    assert.equal(invalidUrl.webhookHost, "docs.google.com");

    process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/test/exec";
    const calls = [];
    const sent = await syncOrderToGoogleSheet(order, {
      source: "LDP Test",
      landingPageUrl: "https://www.theanhmarketing.com/academy/facebook-ads-master-2026",
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return { ok: true, status: 200, text: async () => '{"success":true}' };
      },
    });

    assert.equal(sent.ok, true);
    assert.equal(sent.skipped, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://script.google.com/macros/s/test/exec");
    assert.match(calls[0].init.body, /TAM123/);
    assert.match(calls[0].init.body, /Nguyen Van A/);
    assert.doesNotMatch(calls[0].init.body, /ldpUrl|landingPageUrl|Order Code|Created At/);
    assert.match(calls[0].init.headers["Content-Type"], /charset=utf-8/);

    const rejected = await syncOrderToGoogleSheet(order, {
      webhookUrl: "https://script.google.com/macros/s/test/exec",
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        text: async () => "<html><body>You do not have access to this app</body></html>",
      }),
    });
    assert.equal(rejected.ok, false);
    assert.equal(rejected.status, 403);
    assert.match(rejected.reason, /Execute as: Me/);
    assert.match(rejected.reason, /Who has access: Anyone/);
    assert.equal(rejected.responseSnippet, "You do not have access to this app");

    const missingDoPost = await syncOrderToGoogleSheet(order, {
      webhookUrl: "https://script.google.com/macros/s/test/exec",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        text: async () => "<html><body>Google Apps Script Khong tim thay ham tap lenh: doPost</body></html>",
      }),
    });
    assert.equal(missingDoPost.ok, false);
    assert.equal(missingDoPost.status, 200);
    assert.match(missingDoPost.reason, /doPost\(e\)/);
    assert.equal(missingDoPost.responseSnippet, "Google Apps Script Khong tim thay ham tap lenh: doPost");
  } finally {
    if (previousWebhook === undefined) delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    else process.env.GOOGLE_SHEETS_WEBHOOK_URL = previousWebhook;
  }
});

test("order backfill script also uses compact order sheet payload", () => {
  const script = read("scripts/backfill-google-sheets-orders.mjs");

  assert.match(script, /entityType: "order"/);
  assert.match(script, /function formatSheetPhone/);
  assert.match(script, /phone: formatSheetPhone\(row\.phone\)/);
  assert.match(script, /sepayReferenceCode: row\.sepay_reference_code/);
  assert.match(script, /const force = process\.argv\.includes\("--force"\);/);
  assert.match(script, /const resetMonthly = process\.argv\.includes\("--reset-monthly"\);/);
  assert.match(script, /const startIndexArg = process\.argv\.indexOf\("--start-index"\);/);
  assert.match(script, /const limitArg = process\.argv\.indexOf\("--limit"\);/);
  assert.match(script, /action: "reset"/);
  assert.match(script, /clearLegacyOrders: true/);
  assert.match(script, /records: ordersToReset\.map\(buildPayload\)/);
  assert.match(script, /const candidateOrders = force \? orders : orders\.filter/);
  assert.match(script, /const remainingOrders = candidateOrders\.slice\(startIndex\);/);
  assert.match(script, /const missingOrders = limit > 0 \? remainingOrders\.slice\(0, limit\) : remainingOrders;/);
  assert.doesNotMatch(script, /utmSource|orderItems|amountLabel|syncedAt|source: "Production order backup"|"Order Code"|"Created At"|"Ma don"/);
});

test("apps script v2 uses fixed schemas without dynamic extra headers", () => {
  const script = read("docs/GOOGLE_SHEETS_APPS_SCRIPT_V2.gs");

  assert.match(script, /sheetName: 'Orders'/);
  assert.match(script, /sheetName: 'Leads'/);
  assert.match(script, /function ensureFixedHeaders/);
  assert.match(script, /function resetSheet/);
  assert.doesNotMatch(script, /extraHeaders|Object\.keys\(record\)\.filter|headers\.concat/);
});

test("monthly apps script creates MM-yyyy order tabs and inserts new orders at row 2", () => {
  const script = read("docs/GOOGLE_SHEETS_APPS_SCRIPT_MONTHLY.gs");

  assert.match(script, /version: 'google-sheets-monthly-orders-v1'/);
  assert.ok(script.includes("const MONTH_SHEET_NAME_RE = /^\\d{2}-\\d{4}$/;"));
  assert.match(script, /sheetNamePattern: 'MM-yyyy'/);
  assert.match(script, /insertMode: 'new orders at row 2/);
  assert.match(script, /sheet\.insertRowBefore\(2\)/);
  assert.match(script, /getMonthSheetName\(order\.date\)/);
  assert.match(script, /return month \+ '-' \+ year/);
  assert.match(script, /NON_ORDER_PAYLOAD_IGNORED/);
  assert.match(script, /markLegacyOrdersSheet\(ss\)/);
  assert.match(script, /'Mã đơn'/);
  assert.match(script, /'Ngày tạo'/);
  assert.match(script, /'Khách hàng'/);
  assert.doesNotMatch(script, /extraHeaders|Object\.keys\(record\)\.filter|headers\.concat/);
});

test("lead google sheet backfill skips order-only fallback leads already represented as orders", () => {
  const service = read("services/leadService.ts");

  assert.match(service, /const sheetEligibleLeads = leads\.filter\(\(lead\) => !isOrderOnlyLead\(lead\)\);/);
  assert.match(service, /orderOnlySkipped: leads\.length - sheetEligibleLeads\.length/);
  assert.match(service, /Order-only fallback leads are synced through the Orders sheet/);
});

test("order routes sync new registration data to google sheets without blocking checkout", () => {
  const publicOrderRoute = read("app/api/orders/route.ts");
  const sessionOrderRoute = read("app/api/orders/from-session/route.ts");

  for (const source of [publicOrderRoute, sessionOrderRoute]) {
    assert.match(source, /syncOrderToGoogleSheetWithActivity/);
    assert.match(source, /Google Sheets order sync failed/);
  }

  assert.doesNotMatch(publicOrderRoute, /syncLeadByIdToGoogleSheet/);
  assert.doesNotMatch(publicOrderRoute, /Google Sheets lead update sync failed/);
});

test("order google sheet sync records activity logs for success and failure", () => {
  const helper = read("lib/notifications/google-sheets-order-sync.ts");
  const publicOrderRoute = read("app/api/orders/route.ts");
  const sessionOrderRoute = read("app/api/orders/from-session/route.ts");
  const sepayRoute = read("app/api/sepay/webhook/route.ts");
  const manualConfirmRoute = read("app/api/payment/confirm/route.ts");

  assert.match(helper, /syncOrderToGoogleSheetWithActivity/);
  assert.match(helper, /syncOrderToGoogleSheet/);
  assert.match(helper, /logStudentActivity/);
  assert.match(helper, /sheet_sync_success/);
  assert.match(helper, /sheet_sync_failed/);
  assert.match(helper, /Google Sheets order sync failed/);
  assert.match(helper, /webhookHost/);

  for (const source of [publicOrderRoute, sessionOrderRoute, sepayRoute, manualConfirmRoute]) {
    assert.match(source, /syncOrderToGoogleSheetWithActivity/);
    assert.doesNotMatch(source, /syncOrderToGoogleSheet\(/);
  }
});

test("google sheets order backup cron retries orders without success logs", () => {
  const vercelConfig = JSON.parse(read("vercel.json"));
  const route = read("app/api/orders/sync-google-sheet/route.ts");
  const service = read("services/orderSheetSyncService.ts");
  const cron = vercelConfig.crons.find((item) => item.path === "/api/orders/sync-google-sheet");

  assert.ok(cron, "Google Sheet order sync cron must be configured");
  assert.match(cron.schedule, /^45 16 \* \* \*$/);
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /Bearer \$\{process\.env\.CRON_SECRET\}/);
  assert.match(route, /resyncOrdersMissingGoogleSheetSuccess/);
  assert.match(service, /sheet_sync_success/);
  assert.match(service, /syncOrderToGoogleSheetWithActivity/);
  assert.match(service, /orderCode/);
  assert.match(service, /limit/);
});

test("google sheets webhook env is documented without real script URL", () => {
  const envExample = read(".env.example");

  assert.match(envExample, /GOOGLE_SHEETS_WEBHOOK_URL=/);
  assert.doesNotMatch(envExample, /AKfycbyaxjZVNmXwfIwLxjk2bhqGZua_cmyQNa6KjbHbTGL8-Wff6iyGegqPmhlrPUHFi6qxjA/);
});
