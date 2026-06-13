import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("order creation routes do not send customer/admin emails before checkout opens", () => {
  const publicOrderRoute = read("app/api/orders/route.ts");
  const sessionOrderRoute = read("app/api/orders/from-session/route.ts");

  for (const source of [publicOrderRoute, sessionOrderRoute]) {
    assert.doesNotMatch(source, /sendOrderCreatedEmails/);
    assert.doesNotMatch(source, /sendPendingPaymentEmail/);
    assert.doesNotMatch(source, /sendAdminNewLeadNotification/);
    assert.doesNotMatch(source, /Order-created email failed/);
  }
});

test("checkout page sends customer pending email after the payment page response", () => {
  const paymentPage = read("app/thanh-toan/[code]/page.tsx");
  const checkoutNotifications = read("services/checkoutNotificationService.ts");
  const migration = read("docs/SUPABASE_CHECKOUT_NOTIFICATION_MARKERS.sql");

  assert.match(paymentPage, /import \{ after \} from "next\/server"/);
  assert.match(paymentPage, /sendCheckoutEntryNotifications/);
  assert.match(paymentPage, /after\(async \(\) => \{/);

  assert.match(checkoutNotifications, /sendPendingPaymentEmail/);
  assert.match(checkoutNotifications, /sendTelegramOrderNotification\(order, "order_created"/);
  assert.match(checkoutNotifications, /pending_payment_email_sent_at/);
  assert.match(checkoutNotifications, /order_created_telegram_sent_at/);
  assert.match(checkoutNotifications, /\.is\(sentAtField, null\)/);
  assert.match(checkoutNotifications, /already sent or in progress/);
  assert.doesNotMatch(checkoutNotifications, /sendAdminNewLeadNotification/);

  assert.match(migration, /pending_payment_email_sent_at/);
  assert.match(migration, /order_created_telegram_sent_at/);
});

test("public order route tags remarketing lead source by selected landing page", () => {
  const publicOrderRoute = read("app/api/orders/route.ts");

  assert.match(publicOrderRoute, /determineLeadSource/);
  assert.match(publicOrderRoute, /ai-master-x10/);
  assert.match(publicOrderRoute, /LDP AI Master X10/);
  assert.doesNotMatch(publicOrderRoute, /source: "LDP Facebook Ads Master 2026"/);
});

test("public order route does not wait for lead Google Sheet sync before returning checkout", () => {
  const publicOrderRoute = read("app/api/orders/route.ts");
  const leadService = read("services/leadService.ts");

  assert.match(publicOrderRoute, /syncGoogleSheet: false/);
  assert.match(publicOrderRoute, /after\(async \(\) => \{/);
  assert.match(publicOrderRoute, /const syncedLeadId = leadSync\.ok/);
  assert.match(publicOrderRoute, /await syncLeadByIdToGoogleSheet\(syncedLeadId\)/);
  assert.match(leadService, /input\.syncGoogleSheet === false/);
  assert.match(leadService, /scheduled_after_response/);
});

test("payment page lets customers copy account, amount, content, and full transfer info", () => {
  const paymentPage = read("app/thanh-toan/[code]/page.tsx");
  const transferDetails = read("components/payment/transfer-details.tsx");

  assert.match(paymentPage, /amount=\{order\.amount\}/);
  assert.match(paymentPage, /const amountLabel = order\.amountLabel \|\| formatVnd\(order\.amount\)/);
  assert.match(paymentPage, /amountLabel=\{amountLabel\}/);
  assert.match(transferDetails, /Copy STK/);
  assert.match(transferDetails, /Copy số tiền/);
  assert.match(transferDetails, /Copy nội dung/);
  assert.match(transferDetails, /Copy tất cả/);
  assert.match(transferDetails, /Số tài khoản:/);
  assert.match(transferDetails, /Nội dung chuyển khoản:/);
});

test("email-based register form no longer sends a duplicate legacy registration email before order creation", () => {
  const registerForm = read("components/auth/register-form.tsx");

  assert.doesNotMatch(registerForm, /\/api\/notifications\/registration/);
  assert.match(registerForm, /\/api\/orders/);
});
