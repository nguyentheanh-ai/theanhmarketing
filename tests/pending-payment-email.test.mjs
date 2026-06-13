import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

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
  const requireShim = (specifier) => {
    if (specifier === "@/lib/notifications/email-link-bridge") {
      return loadTsModule("lib/notifications/email-link-bridge.ts");
    }

    throw new Error(`Unsupported test import: ${specifier}`);
  };
  runner(cjsModule.exports, cjsModule, requireShim);
  return cjsModule.exports;
}

const {
  buildAdminNewLeadEmailPayload,
  buildPendingPaymentEmailPayload,
  sendPendingPaymentEmail,
  shouldSendPendingPaymentEmail,
} = loadTsModule("lib/notifications/pending-payment-email.ts");

const adsSupportAgentUrl =
  "https://chatgpt.com/g/g-6a1ffa1efa308191b76782e0b93d4e30-ads-performance-planner";

const pendingOrder = {
  id: "order-1",
  orderCode: "TAMDEMO0524",
  studentName: "Tu Nguyen",
  email: "student@example.com",
  phone: "0828736979",
  courseSlug: "facebook-ads-2026",
  courseTitle: "Quảng cáo Facebook Master 2026 - Gói Video 399K",
  amount: 399000,
  amountLabel: "399.000đ",
  currency: "VND",
  status: "pending",
  paymentMethod: "sepay",
  paymentQrUrl: "https://qr.sepay.vn/img?bank=VPB&acc=0367928921&amount=399000&des=TAMDEMO0524",
  paidAt: null,
  expiresAt: "2026-05-24T01:20:00.000Z",
  createdAt: "2026-05-24T01:00:00.000Z",
  sepayReferenceCode: null,
  orderItems: [],
  paymentEmailSentAt: null,
  paymentEmailLastError: null,
};

test("builds an admin new lead email with student, phone, course, and payment status", () => {
  const payload = buildAdminNewLeadEmailPayload(pendingOrder, {
    from: "The Anh Marketing <hoc@theanhmarketing.com>",
    adminTo: "12c1thdtheanh@gmail.com",
  });

  assert.equal(payload.to, "12c1thdtheanh@gmail.com");
  assert.equal(payload.from, "The Anh Marketing <hoc@theanhmarketing.com>");
  assert.match(payload.subject, /Lead mới/);
  assert.match(payload.html, /Tên học viên/);
  assert.match(payload.html, /Tu Nguyen/);
  assert.match(payload.html, /SDT/);
  assert.match(payload.html, /0828736979/);
  assert.match(payload.html, /Khóa đăng ký/);
  assert.match(payload.html, /Quảng cáo Facebook Master 2026/);
  assert.match(payload.html, /Trạng thái thanh toán/);
  assert.match(payload.html, /Chưa thanh toán/);
  assert.match(payload.text, /Tên học viên: Tu Nguyen/);
  assert.match(payload.text, /Trạng thái thanh toán: Chưa thanh toán/);
});

test("builds a customer pending payment email with Sepay QR and payment page link", () => {
  const previousBankCode = process.env.SEPAY_BANK_CODE;
  const previousBankAccount = process.env.SEPAY_BANK_ACCOUNT_NUMBER;
  const previousBankName = process.env.SEPAY_BANK_ACCOUNT_NAME;
  process.env.SEPAY_BANK_CODE = "VPB";
  process.env.SEPAY_BANK_ACCOUNT_NUMBER = "0367928921";
  process.env.SEPAY_BANK_ACCOUNT_NAME = "THE ANH MARKETING";

  const payload = buildPendingPaymentEmailPayload(pendingOrder, {
    siteUrl: "https://www.theanhmarketing.com",
    from: "The Anh Marketing <hoc@theanhmarketing.com>",
  });

  try {
    assert.equal(payload.to, "student@example.com");
    assert.match(payload.subject, /Chưa thanh toán/);
    assert.match(payload.html, /Chưa thanh toán/);
    assert.match(payload.html, /399\.000đ/);
    assert.match(payload.html, /https:\/\/qr\.sepay\.vn\/img\?bank=VPB&amp;acc=0367928921&amp;amount=399000&amp;des=TAMDEMO0524/);
    assert.match(payload.html, /https:\/\/www\.theanhmarketing\.com\/go\?to=https%3A%2F%2Fwww\.theanhmarketing\.com%2Fthanh-toan%2FTAMDEMO0524/);
    assert.match(payload.html, /Thông tin chuyển khoản để copy/);
    assert.match(payload.html, /Số tiền/);
    assert.match(payload.html, /399\.000đ/);
    assert.match(payload.html, /Số tài khoản/);
    assert.match(payload.html, /0367928921/);
    assert.match(payload.html, /Nội dung chuyển khoản/);
    assert.match(payload.html, /TAMDEMO0524/);
    assert.match(payload.text, /QR Sepay: https:\/\/qr\.sepay\.vn\/img/);
    assert.doesNotMatch(payload.html, new RegExp(adsSupportAgentUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(payload.text, new RegExp(adsSupportAgentUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(payload.text, /Thông tin chuyển khoản:/);
    assert.match(payload.text, /Số tiền: 399\.000đ/);
    assert.match(payload.text, /Số tài khoản: 0367928921/);
    assert.match(payload.text, /Nội dung chuyển khoản: TAMDEMO0524/);
    assert.match(payload.text, /Trang thanh toán: https:\/\/www\.theanhmarketing\.com\/thanh-toan\/TAMDEMO0524/);
  } finally {
    if (previousBankCode === undefined) delete process.env.SEPAY_BANK_CODE;
    else process.env.SEPAY_BANK_CODE = previousBankCode;

    if (previousBankAccount === undefined) delete process.env.SEPAY_BANK_ACCOUNT_NUMBER;
    else process.env.SEPAY_BANK_ACCOUNT_NUMBER = previousBankAccount;

    if (previousBankName === undefined) delete process.env.SEPAY_BANK_ACCOUNT_NAME;
    else process.env.SEPAY_BANK_ACCOUNT_NAME = previousBankName;
  }
});

test("includes Ads support agent link only for the Facebook Ads 799K support package", () => {
  const payload = buildPendingPaymentEmailPayload(
    {
      ...pendingOrder,
      courseTitle: "Qu?ng c?o Facebook Master 2026 - G?i H? Tr? 799K",
      amount: 799000,
      amountLabel: "799.000đ",
      orderItems: [
        {
          slug: "facebook-ads-2026",
          title: "Qu?ng c?o Facebook Master 2026 - G?i H? Tr? 799K",
          price: 799000,
        },
      ],
    },
    {
      siteUrl: "https://www.theanhmarketing.com",
      from: "The Anh Marketing <hoc@theanhmarketing.com>",
    },
  );

  assert.match(payload.subject, /Quảng cáo Facebook Master 2026 - Gói Hỗ Trợ 799K/);
  assert.match(payload.html, /Quảng cáo Facebook Master 2026 - Gói Hỗ Trợ 799K/);
  assert.doesNotMatch(payload.subject, /Qu\?ng c\?o/);
  assert.doesNotMatch(payload.html, /Qu\?ng c\?o/);
  assert.match(payload.html, /Agent H/);
  assert.match(payload.text, /Agent H/);
  assert.match(payload.html, /https:\/\/www\.theanhmarketing\.com\/go\?to=https%3A%2F%2Fchatgpt\.com%2Fg%2Fg-6a1ffa1efa308191b76782e0b93d4e30-ads-performance-planner/);
  assert.match(payload.text, new RegExp(adsSupportAgentUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("sends pending payment email only for pending orders with email", () => {
  assert.equal(shouldSendPendingPaymentEmail(pendingOrder), true);
  assert.equal(shouldSendPendingPaymentEmail({ ...pendingOrder, status: "paid" }), false);
  assert.equal(shouldSendPendingPaymentEmail({ ...pendingOrder, email: "" }), false);
});

test("skips pending payment email without a Resend API key without throwing", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const result = await sendPendingPaymentEmail(pendingOrder);
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "Missing RESEND_API_KEY");
  } finally {
    if (previousKey) {
      process.env.RESEND_API_KEY = previousKey;
    }
  }
});

test("pending payment email sends Resend JSON as explicit UTF-8 bytes", () => {
  const source = fs.readFileSync(path.resolve("lib/notifications/pending-payment-email.ts"), "utf8");

  assert.match(source, /"Content-Type": "application\/json; charset=utf-8"/);
  assert.match(source, /Buffer\.from\(JSON\.stringify\(payload\), "utf8"\)/);
});
