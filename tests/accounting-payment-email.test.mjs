import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const read = (relativePath) => readFileSync(relativePath, "utf8");

function loadTsModule(relativePath, modules = {}) {
  const source = read(path.resolve(relativePath));
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", "require", compiled);
  runner(cjsModule.exports, cjsModule, (specifier) => {
    if (Object.hasOwn(modules, specifier)) return modules[specifier];
    throw new Error(`Unsupported test import: ${specifier}`);
  });
  return cjsModule.exports;
}

const paidOrder = {
  id: "order-1",
  leadId: null,
  orderCode: "TAM123",
  studentName: "Nguyễn Văn A",
  email: "buyer@example.com",
  phone: "0900000000",
  courseSlug: "facebook-ads-2026",
  courseTitle: "Khóa học mẫu",
  amount: 799000,
  amountLabel: "799.000đ",
  currency: "VND",
  status: "paid",
  paymentMethod: "sepay",
  paymentQrUrl: "",
  paidAt: "2026-08-03T02:15:00.000Z",
  expiresAt: null,
  createdAt: "2026-08-03T02:00:00.000Z",
  sepayReferenceCode: null,
  orderItems: [],
  paymentEmailSentAt: null,
  paymentEmailLastError: null,
  accountingEmailSentAt: null,
  accountingEmailLastError: null,
  purchaseEventSent: false,
  attribution: {},
  invoice: {
    requested: false,
    taxCode: "",
    companyName: "",
    companyAddress: "",
    email: "",
  },
};

test("orders persist dedicated accounting email delivery state", () => {
  const migration = read("supabase/migrations/20260803090000_add_accounting_email_markers.sql");
  const orderService = read("services/orderService.ts");

  for (const field of ["accounting_email_sent_at", "accounting_email_last_error"]) {
    assert.match(migration, new RegExp(field));
    assert.match(orderService, new RegExp(field));
  }

  assert.match(orderService, /accountingEmailSentAt/);
  assert.match(orderService, /accountingEmailLastError/);
  assert.match(orderService, /markAccountingEmailSent/);
  assert.match(orderService, /markAccountingEmailError/);
});

test("accounting email contains the required payment and customer fields", () => {
  const { buildAccountingPaymentEmailPayload } = loadTsModule(
    "lib/notifications/accounting-payment-email.ts",
  );
  const payload = buildAccountingPaymentEmailPayload(paidOrder, {
    recipient: "thuthaoch@gmail.com",
    from: "The Anh Marketing <noreply@theanhmarketing.com>",
  });

  assert.equal(payload.to, "thuthaoch@gmail.com");
  assert.equal(payload.from, "The Anh Marketing <noreply@theanhmarketing.com>");
  assert.match(payload.subject, /TAM123/);

  for (const value of [
    "Nguyễn Văn A",
    "0900000000",
    "buyer@example.com",
    "Khóa học mẫu",
    "799.000đ",
    "TAM123",
    "09:15",
    "sepay",
  ]) {
    assert.match(payload.html, new RegExp(value));
    assert.match(payload.text, new RegExp(value));
  }

  assert.doesNotMatch(payload.text, /Mã số thuế/);
});

test("accounting email includes invoice details only when requested", () => {
  const { buildAccountingPaymentEmailPayload } = loadTsModule(
    "lib/notifications/accounting-payment-email.ts",
  );
  const payload = buildAccountingPaymentEmailPayload({
    ...paidOrder,
    invoice: {
      requested: true,
      taxCode: "0312345678",
      companyName: "Công ty Greez Hub",
      companyAddress: "123 Nguyễn Huệ, TP.HCM",
      email: "invoice@example.com",
    },
  }, { recipient: "thuthaoch@gmail.com" });

  for (const value of [
    "Mã số thuế",
    "0312345678",
    "Công ty Greez Hub",
    "123 Nguyễn Huệ, TP.HCM",
    "invoice@example.com",
  ]) {
    assert.match(payload.html, new RegExp(value));
    assert.match(payload.text, new RegExp(value));
  }
});

test("accounting email fails closed when the recipient is not configured", async () => {
  const { sendAccountingPaymentEmail } = loadTsModule(
    "lib/notifications/accounting-payment-email.ts",
  );
  const previousRecipient = process.env.ACCOUNTING_NOTIFICATION_EMAIL;
  delete process.env.ACCOUNTING_NOTIFICATION_EMAIL;

  try {
    const result = await sendAccountingPaymentEmail(paidOrder);
    assert.equal(result.ok, false);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "Missing or invalid ACCOUNTING_NOTIFICATION_EMAIL");
  } finally {
    if (previousRecipient === undefined) delete process.env.ACCOUNTING_NOTIFICATION_EMAIL;
    else process.env.ACCOUNTING_NOTIFICATION_EMAIL = previousRecipient;
  }
});

function loadAccountingNotificationService() {
  return loadTsModule("services/accountingNotificationService.ts", {
    "@/lib/notifications/accounting-payment-email": {
      sendAccountingPaymentEmail: async () => ({ ok: true, skipped: false, reason: null }),
    },
    "@/services/orderService": {
      markAccountingEmailSent: async () => ({ ok: true, error: null }),
      markAccountingEmailError: async () => ({ ok: true, error: null }),
    },
  });
}

test("accounting notification skips orders that are not paid or were already sent", async () => {
  const { notifyAccountingForPaidOrder } = loadAccountingNotificationService();
  let sends = 0;
  const dependencies = {
    send: async () => {
      sends += 1;
      return { ok: true, skipped: false, reason: null };
    },
    markSent: async () => ({ ok: true, error: null }),
    markError: async () => ({ ok: true, error: null }),
  };

  const pending = await notifyAccountingForPaidOrder({ ...paidOrder, status: "pending" }, dependencies);
  const sent = await notifyAccountingForPaidOrder({
    ...paidOrder,
    accountingEmailSentAt: "2026-08-03T02:20:00.000Z",
  }, dependencies);

  assert.equal(pending.skipped, true);
  assert.equal(sent.skipped, true);
  assert.equal(sends, 0);
});

test("accounting notification records provider success and failure independently", async () => {
  const { notifyAccountingForPaidOrder } = loadAccountingNotificationService();
  const successCalls = [];
  const success = await notifyAccountingForPaidOrder(paidOrder, {
    send: async () => ({ ok: true, skipped: false, reason: null }),
    markSent: async (orderCode) => {
      successCalls.push(["sent", orderCode]);
      return { ok: true, error: null };
    },
    markError: async (...args) => {
      successCalls.push(["error", ...args]);
      return { ok: true, error: null };
    },
  });
  assert.equal(success.ok, true);
  assert.deepEqual(successCalls, [["sent", "TAM123"]]);

  const failureCalls = [];
  const failure = await notifyAccountingForPaidOrder(paidOrder, {
    send: async () => ({ ok: false, skipped: false, reason: "provider unavailable" }),
    markSent: async (...args) => {
      failureCalls.push(["sent", ...args]);
      return { ok: true, error: null };
    },
    markError: async (...args) => {
      failureCalls.push(["error", ...args]);
      return { ok: true, error: null };
    },
  });
  assert.equal(failure.ok, false);
  assert.deepEqual(failureCalls, [["error", "TAM123", "provider unavailable"]]);
});

test("both authoritative paid routes call the shared accounting notification only for new payments", () => {
  for (const file of [
    "app/api/sepay/webhook/route.ts",
    "app/api/payment/confirm/route.ts",
  ]) {
    const source = read(file);
    assert.match(source, /notifyAccountingForPaidOrder/);
    assert.match(source, /!confirmation\.wasAlreadyPaid/);
  }
});
