import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("consultation uses one fixed server-known 500.000đ product", () => {
  assert.equal(existsSync("lib/consultation/constants.ts"), true);
  const constants = read("lib/consultation/constants.ts");
  const orders = read("services/orderService.ts");

  assert.match(constants, /CONSULTATION_PRODUCT_SLUG = "marketing-ai-consultation"/);
  assert.match(constants, /CONSULTATION_PAYMENT_PLAN = "consultation-deposit-500"/);
  assert.match(constants, /CONSULTATION_PRICE_VND = 500_000/);
  assert.match(orders, /getFixedPaymentPackage/);
  assert.match(orders, /CONSULTATION_PRICE_VND/);
});

test("consultation API validates the service and creates a real payment order", () => {
  const route = read("app/api/consultations/route.ts");
  const service = read("services/consultationService.ts");

  assert.match(route, /checkRateLimit/);
  assert.match(route, /createConsultationRequest/);
  assert.match(service, /isConsultationService/);
  assert.match(service, /createLeadAdmin/);
  assert.match(service, /createPaymentOrder/);
  assert.match(service, /paymentUrl: `\/thanh-toan\/\$\{order\.orderCode\}`/);
});

test("consultation form has no calendar and discloses the non-refundable policy", () => {
  const form = read("components/consultation/consultation-request-form.tsx");
  const page = read("app/dang-ky-tu-van/page.tsx");
  const constants = read("lib/consultation/constants.ts");

  assert.doesNotMatch(form, /appointmentDate|appointmentTime|type="date"|type="time"/);
  assert.match(constants, /không hoàn lại/);
  assert.match(form, /CONSULTATION_POLICY/);
  assert.match(form, /Thanh toán 500\.000đ để gửi yêu cầu/);
  assert.match(form, /fetch\("\/api\/consultations"/);
  assert.match(page, /ConsultationRequestForm/);
});

test("paid consultation is confirmed without student provisioning", () => {
  const webhook = read("app/api/sepay/webhook/route.ts");
  const email = read("lib/notifications/consultation-payment-email.ts");
  const checkout = read("app/thanh-toan/[code]/page.tsx");
  const poller = read("components/payment/payment-status-poller.tsx");

  assert.match(webhook, /isConsultationOrder/);
  assert.match(webhook, /sendConsultationPaymentEmail/);
  assert.match(webhook, /!consultationOrder[\s\S]*?ensureStudentAccountForPaidOrder/);
  assert.match(email, /The Anh sẽ chủ động liên hệ/);
  assert.doesNotMatch(email, /temporaryPassword|mật khẩu tạm|Vào khóa học/);
  assert.match(checkout, /isConsultationOrder/);
  assert.match(checkout, /The Anh sẽ chủ động liên hệ/);
  assert.match(poller, /marketing-ai-consultation/);
});
