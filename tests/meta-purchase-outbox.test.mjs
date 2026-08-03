import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("Meta Purchase uses a lease-fenced seven-day outbox", () => {
  const sql = read("supabase/migrations/20260727150000_meta_purchase_outbox.sql");

  assert.match(sql, /claim_meta_purchase_orders/);
  assert.match(sql, /finish_meta_purchase_order/);
  assert.match(sql, /FOR UPDATE\s+SKIP LOCKED/i);
  assert.match(sql, /paid_at\s*>?=\s*clock_timestamp\(\)\s*-\s*interval\s*'7 days'/i);
  assert.match(sql, /lease_token\s+is distinct from\s+p_lease_token/i);
  assert.match(sql, /purchase_event_sent\s*=\s*p_succeeded/i);
  assert.match(sql, /grant execute on function public\.claim_meta_purchase_orders[\s\S]*service_role/i);
  assert.match(sql, /grant execute on function public\.finish_meta_purchase_order[\s\S]*service_role/i);
});

test("shared dispatcher preserves paid time and stable order-code event id", () => {
  const source = read("lib/meta/purchase-outbox.ts");

  assert.match(source, /claim_meta_purchase_orders/);
  assert.match(source, /sendMetaPurchaseEvent/);
  assert.match(source, /finish_meta_purchase_order/);
  assert.match(source, /orderCode:\s*order\.order_code/);
  assert.match(source, /paidAt:\s*order\.paid_at/);
  assert.match(source, /computeMetaPurchaseRetryDelayMinutes/);
  assert.doesNotMatch(source, /console\.(?:log|warn|error)\([^\n]*(?:email|phone)/i);
});

test("SePay and manual confirmation retry any paid unmarked order", () => {
  for (const routePath of [
    "app/api/sepay/webhook/route.ts",
    "app/api/payment/confirm/route.ts",
  ]) {
    const source = read(routePath);
    assert.match(source, /dispatchMetaPurchaseOrders/);
    assert.match(source, /confirmation\.order\.status\s*===\s*"paid"\s*&&\s*!confirmation\.order\.purchaseEventSent/);
    assert.doesNotMatch(source, /sendMetaPurchaseEvent/);
  }
});

test("manual paid-order creation hands Purchase to the durable dispatcher", () => {
  const source = read("services/orderService.ts");
  const helperStart = source.indexOf("async function dispatchManualPaidOrderPurchase");
  const start = source.indexOf("export async function createManualPaidOrder");
  const end = source.indexOf("export async function getPaymentOrder", start);
  const helper = source.slice(helperStart, start);
  const createManualPaidOrder = source.slice(start, end);

  assert.match(helper, /dispatchMetaPurchaseOrders/);
  assert.match(helper, /orderCode:\s*order\.orderCode/);
  assert.match(createManualPaidOrder, /dispatchManualPaidOrderPurchase/);
});

test("protected bounded retry endpoint is scheduled daily", () => {
  const route = read("app/api/meta/purchase-retry/route.ts");
  const vercel = JSON.parse(read("vercel.json"));
  const cron = vercel.crons.find((item) => item.path === "/api/meta/purchase-retry");

  assert.ok(cron);
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /Authorization/);
  assert.match(route, /dispatchMetaPurchaseOrders\(\{\s*limit:\s*10/);
  assert.doesNotMatch(route, /email|phone|studentName/);
});
