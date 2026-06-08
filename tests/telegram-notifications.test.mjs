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
  orderItems: [],
  paymentEmailSentAt: null,
  paymentEmailLastError: null,
};

test("telegram notification payloads are compact and customer-safe", () => {
  const { buildTelegramOrderMessage } = loadTsModule("lib/notifications/telegram.ts");

  const pendingText = buildTelegramOrderMessage(order, "order_created", {
    siteUrl: "https://www.theanhmarketing.com",
  });
  const paidText = buildTelegramOrderMessage({ ...order, status: "paid", paidAt: order.createdAt }, "payment_paid", {
    siteUrl: "https://www.theanhmarketing.com",
  });

  assert.match(pendingText, /\[NEW ORDER\]/);
  assert.match(pendingText, /TAM123/);
  assert.match(pendingText, /Nguyen Van A/);
  assert.match(pendingText, /0900000000/);
  assert.match(pendingText, /399\.000d/);
  assert.match(pendingText, /https:\/\/theanhmarketing\.com\/thanh-toan\/TAM123/);
  assert.match(paidText, /\[PAID\]/);
  assert.match(paidText, /paid/);
});

test("telegram notification skips safely without bot config and posts through Bot API when configured", async () => {
  const { sendTelegramOrderNotification } = loadTsModule("lib/notifications/telegram.ts");
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChatId = process.env.TELEGRAM_CHAT_ID;

  try {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    const skipped = await sendTelegramOrderNotification(order, "order_created");
    assert.equal(skipped.ok, true);
    assert.equal(skipped.skipped, true);
    assert.equal(skipped.reason, "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");

    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "123456";
    const calls = [];
    const sent = await sendTelegramOrderNotification(order, "order_created", {
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      },
    });

    assert.equal(sent.ok, true);
    assert.equal(sent.skipped, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.telegram.org/bottest-token/sendMessage");
    assert.doesNotMatch(calls[0].init.body, /TELEGRAM_BOT_TOKEN/);
    assert.match(calls[0].init.body, /TAM123/);
  } finally {
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;

    if (previousChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = previousChatId;
  }
});

test("order and payment routes send telegram notifications without blocking core flows", () => {
  const publicOrderRoute = read("app/api/orders/route.ts");
  const sessionOrderRoute = read("app/api/orders/from-session/route.ts");
  const sepayWebhookRoute = read("app/api/sepay/webhook/route.ts");

  for (const source of [publicOrderRoute, sessionOrderRoute]) {
    assert.match(source, /sendTelegramOrderNotification/);
    assert.match(source, /"order_created"/);
    assert.match(source, /Telegram order notification failed/);
  }

  assert.match(sepayWebhookRoute, /sendTelegramOrderNotification/);
  assert.match(sepayWebhookRoute, /!confirmation\.wasAlreadyPaid/);
  assert.match(sepayWebhookRoute, /"payment_paid"/);
  assert.match(sepayWebhookRoute, /Telegram paid notification failed/);
});

test("telegram env vars are documented without secret values", () => {
  const envExample = read(".env.example");

  assert.match(envExample, /TELEGRAM_BOT_TOKEN=/);
  assert.match(envExample, /TELEGRAM_CHAT_ID=/);
  assert.doesNotMatch(envExample, /8891489957/);
});
