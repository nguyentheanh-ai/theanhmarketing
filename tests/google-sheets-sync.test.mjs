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

test("google sheets payload includes top-level fields expected by Apps Script and full order context", () => {
  const { buildGoogleSheetOrderPayload } = loadTsModule("lib/notifications/google-sheets.ts");
  const payload = buildGoogleSheetOrderPayload(order, {
    source: "LDP Test",
    landingPageUrl: "https://www.theanhmarketing.com/academy/facebook-ads-master-2026",
  });

  assert.equal(payload.date, "03/06/2026 17:00");
  assert.equal(payload.name, "Nguyen Van A");
  assert.equal(payload.phone, "0900000000");
  assert.equal(payload.email, "student@example.com");
  assert.equal(payload.ldpUrl, "https://www.theanhmarketing.com/academy/facebook-ads-master-2026");
  assert.equal(payload.landingPageUrl, "https://www.theanhmarketing.com/academy/facebook-ads-master-2026");
  assert.equal(payload.linkLdp, "https://www.theanhmarketing.com/academy/facebook-ads-master-2026");
  assert.equal(payload.orderCode, "TAM123");
  assert.equal(payload.source, "LDP Test");
  assert.equal(payload.amount, 399000);
  assert.equal(payload.paymentUrl, "https://theanhmarketing.com/thanh-toan/TAM123");
  assert.match(payload.orderItems, /Facebook Ads Master 2026/);
  assert.equal(payload["Created At"], "03/06/2026 17:00");
  assert.equal(payload["Order Code"], "TAM123");
  assert.equal(payload["Customer Name"], "Nguyen Van A");
  assert.equal(payload["Course Slug"], "facebook-ads-2026");
  assert.equal(payload["Course Title"], "Facebook Ads Master 2026");
  assert.equal(payload["Payment URL"], "https://theanhmarketing.com/thanh-toan/TAM123");
  assert.equal(payload.Source, "LDP Test");
  assert.match(payload["Order Items"], /Facebook Ads Master 2026/);
  assert.ok(payload["Synced At"]);
  assert.equal(payload["Mã đơn"], "TAM123");
  assert.equal(payload["Ngày tạo"], "03/06/2026 17:00");
  assert.equal(payload["Khách hàng"], "Nguyen Van A");
  assert.equal(payload["SĐT"], "0900000000");
  assert.equal(payload["Khóa/Gói"], "Facebook Ads Master 2026");
  assert.equal(payload["Số tiền"], 399000);
  assert.equal(payload["Trạng thái"], "pending");
  assert.equal(payload["Phương thức"], "sepay");
  assert.equal(payload["Ngày thanh toán"], "");
  assert.equal(payload["Hạn thanh toán"], "");
  assert.equal(payload["Mã GD SePay"], "");
  assert.equal(payload["Course slug"], "facebook-ads-2026");
  assert.equal(payload["Link thanh toán"], "https://theanhmarketing.com/thanh-toan/TAM123");
});

test("google sheets sync skips without webhook and posts JSON when configured", async () => {
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
    assert.match(calls[0].init.body, /ldpUrl/);
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

test("order routes sync new registration data to google sheets without blocking checkout", () => {
  const publicOrderRoute = read("app/api/orders/route.ts");
  const sessionOrderRoute = read("app/api/orders/from-session/route.ts");

  for (const source of [publicOrderRoute, sessionOrderRoute]) {
    assert.match(source, /syncOrderToGoogleSheet/);
    assert.match(source, /Google Sheets order sync failed/);
  }
});

test("google sheets webhook env is documented without real script URL", () => {
  const envExample = read(".env.example");

  assert.match(envExample, /GOOGLE_SHEETS_WEBHOOK_URL=/);
  assert.doesNotMatch(envExample, /AKfycbyaxjZVNmXwfIwLxjk2bhqGZua_cmyQNa6KjbHbTGL8-Wff6iyGegqPmhlrPUHFi6qxjA/);
});
