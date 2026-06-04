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
  const runner = new Function("exports", "module", compiled);
  runner(cjsModule.exports, cjsModule);
  return cjsModule.exports;
}

const {
  buildPaymentFailedEmailPayload,
  buildPaymentSuccessEmailPayload,
  sendPaymentFailedEmail,
  sendPaymentSuccessEmail,
  shouldSendPaymentFailedEmail,
  shouldSendPaymentSuccessEmail,
} = loadTsModule("lib/notifications/payment-success-email.ts");

const adsSupportAgentUrl =
  "https://chatgpt.com/g/g-6a1ffa1efa308191b76782e0b93d4e30-ads-performance-planner";

const paidOrder = {
  id: "order-1",
  orderCode: "TAM123",
  studentName: "Nguyen Van A",
  email: "student@example.com",
  phone: "0900000000",
  courseSlug: "facebook-ads-2026",
  courseTitle: "Quảng cáo Facebook Master 2026 - Gói Video 399K",
  amount: 399000,
  amountLabel: "399.000đ",
  currency: "VND",
  status: "paid",
  paymentMethod: "sepay",
  paymentQrUrl: "",
  paidAt: "2026-05-23T10:00:00.000Z",
  expiresAt: null,
  createdAt: "2026-05-23T09:55:00.000Z",
  sepayReferenceCode: null,
  orderItems: [],
  paymentEmailSentAt: null,
  paymentEmailLastError: null,
};

test("builds a customer payment success email with course, Zalo, and dashboard links", () => {
  const payload = buildPaymentSuccessEmailPayload(paidOrder, {
    siteUrl: "https://www.theanhmarketing.com",
    from: "The Anh Marketing <hoc@theanhmarketing.com>",
  });

  assert.equal(payload.to, "student@example.com");
  assert.equal(payload.from, "The Anh Marketing <hoc@theanhmarketing.com>");
  assert.match(payload.subject, /Thanh toán thành công/);
  assert.match(payload.subject, /TAM123/);
  assert.match(payload.html, /Quảng cáo Facebook Master 2026/);
  assert.match(payload.html, /399\.000đ/);
  assert.match(payload.html, /https:\/\/zalo\.me\/g\/ye0dcyowbepyhnrtyacr/);
  assert.match(payload.html, /https:\/\/www\.theanhmarketing\.com\/dang-nhap\?next=%2Fdashboard/);
  assert.match(payload.html, /target="_blank"/);
  assert.match(payload.html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(payload.html, new RegExp(adsSupportAgentUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(payload.text, new RegExp(adsSupportAgentUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(payload.html, /copy link/);
  assert.match(payload.text, /dùng đúng email student@example.com/);
  assert.match(payload.text, /https:\/\/zalo\.me\/g\/ye0dcyowbepyhnrtyacr/);
});

test("includes temporary login credentials when an account is auto-created", () => {
  const payload = buildPaymentSuccessEmailPayload(paidOrder, {
    siteUrl: "https://www.theanhmarketing.com",
    account: {
      email: "student@example.com",
      temporaryPassword: "Anh0900000000",
      created: true,
      mustChangePassword: true,
    },
  });

  assert.match(payload.html, /Tài khoản học/);
  assert.match(payload.html, /Anh0900000000/);
  assert.match(payload.html, /đổi mật khẩu/);
  assert.match(payload.text, /Mật khẩu tạm: Anh0900000000/);
});

test("builds AI Master payment success benefits for the AI Master order", () => {
  const payload = buildPaymentSuccessEmailPayload({
    ...paidOrder,
    courseSlug: "ai-master-x10-hieu-suat",
    courseTitle: "AI Master X10 hiệu suất - Biến tri thức thành tiền",
    amount: 1299000,
    amountLabel: "1.299.000đ",
    orderItems: [
      {
        slug: "ai-master-x10-hieu-suat",
        title: "AI Master X10 hiệu suất - Biến tri thức thành tiền",
        price: 1299000,
      },
    ],
  });

  assert.match(payload.subject, /AI Master X10/);
  assert.match(payload.html, /Quyền truy cập khóa AI Master X10 hiệu suất/);
  assert.match(payload.html, /Bộ agent, template và workflow triển khai landing, content, video, CRM/);
  assert.doesNotMatch(payload.html, /Facebook Ads Master 2026/);
  assert.match(payload.text, /biến tri thức thành sản phẩm bán được/);
});

test("includes Ads support agent link for the Facebook Ads 799K payment success email", () => {
  const payload = buildPaymentSuccessEmailPayload({
    ...paidOrder,
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
  });

  assert.match(payload.subject, /Quảng cáo Facebook Master 2026 - Gói Hỗ Trợ 799K/);
  assert.match(payload.html, /Quảng cáo Facebook Master 2026 - Gói Hỗ Trợ 799K/);
  assert.doesNotMatch(payload.subject, /Qu\?ng c\?o/);
  assert.doesNotMatch(payload.html, /Qu\?ng c\?o/);
  assert.match(payload.html, /Agent H/);
  assert.match(payload.text, /Agent H/);
  assert.match(payload.html, new RegExp(adsSupportAgentUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(payload.text, new RegExp(adsSupportAgentUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("builds Agent Kit payment success benefits for this landing page order", () => {
  const payload = buildPaymentSuccessEmailPayload({
    ...paidOrder,
    courseSlug: "bo-agent-kit-x10-hieu-suat-cong-viec",
    courseTitle: "Bộ Agent Kit X10 hiệu suất công việc - Gói private ads 359K",
    amount: 359000,
    amountLabel: "359.000đ",
    orderItems: [
      {
        slug: "bo-agent-kit-x10-hieu-suat-cong-viec",
        title: "Bộ Agent Kit X10 hiệu suất công việc - Gói private ads 359K",
        price: 359000,
      },
    ],
  });

  assert.match(payload.subject, /Bộ Agent Kit X10/);
  assert.match(payload.html, /Bộ agent, skill, command và workflow tiếng Việt/);
  assert.match(payload.html, /Khung triển khai AI Agent cho marketing, bán hàng, vận hành và CRM/);
  assert.doesNotMatch(payload.html, /Buổi Zoom hỗ trợ trực tiếp 1-1/);
});

test("sends payment success email only for paid orders without a prior sent timestamp", () => {
  assert.equal(shouldSendPaymentSuccessEmail(paidOrder), true);
  assert.equal(
    shouldSendPaymentSuccessEmail({ ...paidOrder, paymentEmailSentAt: "2026-05-23T10:01:00.000Z" }),
    false,
  );
  assert.equal(shouldSendPaymentSuccessEmail({ ...paidOrder, status: "pending" }), false);
  assert.equal(shouldSendPaymentSuccessEmail({ ...paidOrder, email: "" }), false);
});

test("builds a customer payment failed email with a retry payment link", () => {
  const failedOrder = {
    ...paidOrder,
    orderCode: "TAMFAILED",
    status: "failed",
    paidAt: null,
  };
  const payload = buildPaymentFailedEmailPayload(failedOrder, {
    siteUrl: "https://www.theanhmarketing.com",
    from: "The Anh Marketing <hoc@theanhmarketing.com>",
  });

  assert.equal(payload.to, "student@example.com");
  assert.equal(payload.from, "The Anh Marketing <hoc@theanhmarketing.com>");
  assert.match(payload.subject, /Thanh toán không thành công/);
  assert.match(payload.subject, /TAMFAILED/);
  assert.match(payload.html, /Thanh toán không thành công/);
  assert.match(payload.html, /Quảng cáo Facebook Master 2026/);
  assert.match(payload.html, /399\.000đ/);
  assert.match(payload.html, /https:\/\/www\.theanhmarketing\.com\/thanh-toan\/TAMFAILED/);
  assert.match(payload.text, /Thanh toán không thành công/);
  assert.match(payload.text, /Trang thanh toán: https:\/\/www\.theanhmarketing\.com\/thanh-toan\/TAMFAILED/);
});

test("sends payment failed email only for failed or expired orders", async () => {
  const failedOrder = {
    ...paidOrder,
    status: "failed",
    paidAt: null,
  };

  assert.equal(shouldSendPaymentFailedEmail(failedOrder), true);
  assert.equal(shouldSendPaymentFailedEmail({ ...failedOrder, status: "expired" }), true);
  assert.equal(shouldSendPaymentFailedEmail({ ...failedOrder, status: "paid" }), false);
  assert.equal(shouldSendPaymentFailedEmail({ ...failedOrder, email: "" }), false);
  assert.equal(
    shouldSendPaymentFailedEmail({ ...failedOrder, paymentEmailSentAt: "2026-05-23T10:01:00.000Z" }),
    false,
  );
});

test("skips sending without a Resend API key without throwing", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const result = await sendPaymentSuccessEmail(paidOrder);
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "Missing RESEND_API_KEY");
  } finally {
    if (previousKey) {
      process.env.RESEND_API_KEY = previousKey;
    }
  }
});

test("skips failed payment email without a Resend API key without throwing", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const result = await sendPaymentFailedEmail({ ...paidOrder, status: "failed", paidAt: null });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "Missing RESEND_API_KEY");
  } finally {
    if (previousKey) {
      process.env.RESEND_API_KEY = previousKey;
    }
  }
});
