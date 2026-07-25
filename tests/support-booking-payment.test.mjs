import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

test("support checkout suppresses order-created Telegram and redirects paid bookings", () => {
  const checkout = read("services/checkoutNotificationService.ts");
  const poller = read("components/payment/payment-status-poller.tsx");

  assert.match(checkout, /isSupportBookingOrder/);
  assert.match(checkout, /SUPPORT_PRODUCT_SLUG/);
  assert.match(checkout, /Support booking Telegram is sent only after payment/);
  assert.match(poller, /support-session-30m/);
  assert.match(poller, /\/dat-lich-ho-tro\/thanh-cong/);
});

test("SePay confirms support booking before a booking-specific paid Telegram alert", () => {
  const webhook = read("app/api/sepay/webhook/route.ts");
  const telegram = read("lib/notifications/telegram.ts");
  const service = read("services/supportBookingService.ts");

  assert.match(webhook, /isSupportBookingOrder/);
  assert.match(webhook, /confirmSupportBookingForPaidOrder/);
  assert.match(webhook, /sendTelegramSupportBookingNotification/);
  assert.match(webhook, /if \(!confirmation\.wasAlreadyPaid && supportBookingOrder\)/);
  assert.match(webhook, /shouldSendPaymentSuccessEmail\(confirmation\.order\) &&\s*!supportBookingOrder/s);
  assert.match(webhook, /studentAccount = await ensureStudentAccountForPaidOrder/);
  assert.match(service, /\.rpc\("confirm_support_booking"/);
  assert.match(telegram, /export function buildTelegramSupportBookingMessage/);
  assert.match(telegram, /\[PAID SUPPORT BOOKING\]/);
  assert.match(telegram, /Lich:/);
  assert.match(telegram, /Noi dung:/);
});
