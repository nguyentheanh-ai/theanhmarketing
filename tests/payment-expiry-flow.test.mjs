import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("expired payment cron is configured and protected by CRON_SECRET", () => {
  const vercelConfig = JSON.parse(read("vercel.json"));
  const expireCron = vercelConfig.crons.find((cron) => cron.path === "/api/orders/expire");
  const expireRoute = read("app/api/orders/expire/route.ts");

  assert.equal(expireCron.schedule, "*/10 * * * *");
  assert.match(expireRoute, /process\.env\.CRON_SECRET/);
  assert.match(expireRoute, /Bearer \$\{process\.env\.CRON_SECRET\}/);
  assert.match(expireRoute, /status: 401/);
});

test("expired payment route marks stale pending orders and sends failed-payment emails", () => {
  const expireRoute = read("app/api/orders/expire/route.ts");
  const orderService = read("services/orderService.ts");

  assert.match(orderService, /export async function expirePendingPaymentOrders/);
  assert.match(orderService, /\.eq\("status", "pending"\)/);
  assert.match(orderService, /\.lt\("expires_at"/);
  assert.match(orderService, /status: "expired"/);
  assert.match(expireRoute, /expirePendingPaymentOrders/);
  assert.match(expireRoute, /sendPaymentFailedEmail/);
  assert.doesNotMatch(expireRoute, /markPaymentEmailSent/);
});
