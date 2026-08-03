import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("pending-payment ZNS route is protected, bounded, and aggregate-only", () => {
  const source = fs.readFileSync(
    "app/api/zalo/pending-payment/send-due/route.ts",
    "utf8",
  );

  assert.match(source, /export const runtime = "nodejs"/);
  assert.match(source, /process\.env\.CRON_SECRET/);
  assert.match(source, /Authorization/);
  assert.match(source, /Bearer \$\{secret\}/);
  assert.match(source, /dispatchPendingPaymentZnsOrders\(\{ limit: 10 \}\)/);
  assert.match(source, /export const GET = handle/);
  assert.match(source, /export const POST = handle/);
  assert.doesNotMatch(source, /studentName|student_name|phone|email|accessToken|refreshToken|payload:/);
});
