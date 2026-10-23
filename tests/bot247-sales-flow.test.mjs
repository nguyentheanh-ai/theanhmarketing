import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Bot 24/7 is one fixed server-known 990.000đ lifetime package in the existing order flow", () => {
  const constants = read("lib/bot247/constants.ts"), orders = read("services/orderService.ts");
  assert.match(constants, /BOT247_PRODUCT_SLUG = "bot-24-7"/);
  assert.match(constants, /BOT247_PAYMENT_PLAN = "lifetime-990"/);
  assert.match(constants, /BOT247_PRICE_VND = 990_000/);
  assert.match(orders, /input\.courseSlug === BOT247_PRODUCT_SLUG && input\.paymentPlan === BOT247_PAYMENT_PLAN/);
});

test("Bot 24/7 buy API is rate limited and creates a real payment order", () => {
  const route = read("app/api/bot247/route.ts"), service = read("services/bot247Service.ts");
  assert.match(route, /checkRateLimit/);
  assert.match(service, /createPaymentOrder\(/);
  assert.match(service, /isValidEmail\(email\)/);
  assert.match(service, /paymentUrl: `\/thanh-toan\/\$\{order\.orderCode\}`/);
});

test("paid Bot 24/7 orders get an activation code by email and no student account", () => {
  const webhook = read("app/api/sepay/webhook/route.ts");
  assert.match(webhook, /const bot247Order = isBot247Order\(confirmation\.order\)/);
  assert.match(webhook, /!confirmation\.wasAlreadyPaid && bot247Order/);
  assert.match(webhook, /bot247LicenseAction\(\{ action: "new"/);
  assert.match(webhook, /sendBot247LicenseEmail\(confirmation\.order, issued\.data\.code\)/);
  assert.match(webhook, /markPaymentEmailError\(confirmation\.order\.orderCode, `Chưa cấp được mã Bot 24\/7/);
  assert.match(webhook, /!consultationOrder &&\s*!bot247Order/);
  assert.match(read("lib/notifications/bot247-license-email.ts"), /"Idempotency-Key": `bot247-paid-\$\{order\.orderCode\}`/);
});

test("admin products pages are owner-only and read products server-to-server", () => {
  for (const page of ["app/admin/crm-v2/adsmind/page.tsx", "app/admin/crm-v2/bot247/page.tsx"]) assert.match(read(page), /requireAdminAuth\("\/admin\/crm-v2\/(adsmind|bot247)", \["owner"\]\)/);
  for (const route of ["app/api/admin/crm-v2/products/adsmind/route.ts", "app/api/admin/crm-v2/products/bot247/route.ts"]) assert.match(read(route), /requireCrmV2OwnerRequest/);
  assert.match(read("lib/products/adsmind-admin.ts"), /token\.length < 32/);
  assert.match(read("lib/products/bot247-admin.ts"), /token\.length < 32/);
});
