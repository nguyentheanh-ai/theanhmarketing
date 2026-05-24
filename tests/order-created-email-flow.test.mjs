import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("order creation routes trigger lead and pending-payment emails without blocking checkout", () => {
  const publicOrderRoute = read("app/api/orders/route.ts");
  const sessionOrderRoute = read("app/api/orders/from-session/route.ts");

  for (const source of [publicOrderRoute, sessionOrderRoute]) {
    assert.match(source, /sendOrderCreatedEmails/);
    assert.match(source, /await sendOrderCreatedEmails\(order/);
    assert.match(source, /Order-created email failed/);
  }
});

test("public order route tags remarketing lead source by selected landing page", () => {
  const publicOrderRoute = read("app/api/orders/route.ts");

  assert.match(publicOrderRoute, /determineLeadSource/);
  assert.match(publicOrderRoute, /ai-master-x10/);
  assert.match(publicOrderRoute, /LDP AI Master X10/);
  assert.doesNotMatch(publicOrderRoute, /source: "LDP Facebook Ads Master 2026"/);
});

test("email-based register form no longer sends a duplicate legacy registration email before order creation", () => {
  const registerForm = read("components/auth/register-form.tsx");

  assert.doesNotMatch(registerForm, /\/api\/notifications\/registration/);
  assert.match(registerForm, /\/api\/orders/);
});
