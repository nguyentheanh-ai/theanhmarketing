import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function loadLifecycleModule() {
  const source = readFileSync("lib/agent-kit-preorder.ts", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, Date, Error }, { filename: "lib/agent-kit-preorder.ts" });
  return module.exports;
}

test("preorder deposit closes exactly at 00:00 Vietnam time on 16/09/2026", () => {
  const lifecycle = loadLifecycleModule();
  assert.equal(lifecycle.getAgentKitSalePhase(new Date("2026-09-15T16:59:59.999Z")), "preorder");
  assert.equal(lifecycle.getAgentKitSalePhase(new Date("2026-09-15T17:00:00.000Z")), "official");
  assert.equal(lifecycle.getAgentKitPaymentPlan(new Date("2026-09-15T16:59:59.999Z")), "agent-kit-preorder-deposit-399");
  assert.equal(lifecycle.getAgentKitPaymentPlan(new Date("2026-09-15T17:00:00.000Z")), "agent-kit-standard-999");
});

test("server rejects a late deposit while keeping the official 999K plan available", () => {
  const lifecycle = loadLifecycleModule();
  assert.throws(
    () => lifecycle.assertAgentKitPaymentPlanAvailable("agent-kit-preorder-deposit-399", new Date("2026-09-15T17:00:00.000Z")),
    /preorder đã kết thúc/i,
  );
  assert.doesNotThrow(() => lifecycle.assertAgentKitPaymentPlanAvailable("agent-kit-standard-999", new Date("2026-09-15T17:00:00.000Z")));
});

test("main-site persists explicit deposit, remaining and official payment plans", () => {
  const orderService = readFileSync("services/orderService.ts", "utf8");
  const lifecycle = readFileSync("lib/agent-kit-preorder.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260823110711_agent_kit_preorder_lifecycle.sql", "utf8");
  const worker = readFileSync("app/api/agent-kit/preorder-launch/route.ts", "utf8");
  const vercel = readFileSync("vercel.json", "utf8");

  assert.match(lifecycle, /agent-kit-preorder-deposit-399/);
  assert.match(lifecycle, /agent-kit-preorder-remaining-400/);
  assert.match(lifecycle, /agent-kit-standard-999/);
  assert.match(orderService, /AGENT_KIT_PREORDER_PAYMENT_PLAN/);
  assert.match(orderService, /AGENT_KIT_PREORDER_REMAINING_PAYMENT_PLAN/);
  assert.match(orderService, /AGENT_KIT_OFFICIAL_PAYMENT_PLAN/);
  assert.match(orderService, /payment_plan/);
  assert.match(orderService, /parent_order_code/);
  assert.match(migration, /add column if not exists payment_plan text/);
  assert.match(migration, /add column if not exists parent_order_code text/);
  assert.match(worker, /createAgentKitRemainingPaymentOrders/);
  assert.match(vercel, /api\/agent-kit\/preorder-launch/);
});

test("remaining-payment checkout is explicit and only the deposit skips access provisioning", () => {
  const paymentPage = readFileSync("app/thanh-toan/[code]/page.tsx", "utf8");
  const webhook = readFileSync("app/api/sepay/webhook/route.ts", "utf8");
  const pendingEmail = readFileSync("lib/notifications/pending-payment-email.ts", "utf8");
  assert.match(paymentPage, /isAgentKitPreorderRemainingOrder/);
  assert.match(paymentPage, /Thanh toán 400\.000đ còn lại/);
  assert.match(pendingEmail, /Thanh toán 400\.000đ còn lại cho Đội ngũ nhân sự AI/);
  assert.match(webhook, /if \(!preorderDepositOrder\)/);
  assert.doesNotMatch(webhook, /preorderRemainingOrder/);
});

test("catalog uses the approved official price and buyer-facing identity", () => {
  const courses = readFileSync("data/courses.ts", "utf8");
  const courseBlock = courses.match(/slug: "bo-agent-kit-x10-hieu-suat-cong-viec"[\s\S]*?\n  },/)?.[0] ?? "";
  assert.match(courseBlock, /title: "Đội ngũ nhân sự AI"/);
  assert.match(courseBlock, /price: "799\.000đ"/);
  assert.match(courseBlock, /originalPrice: "999\.000đ"/);
  assert.doesNotMatch(courseBlock, /2\.499\.000đ/);
});

test("Lead browser and CAPI use the same order code as event_id", () => {
  const orderRoute = readFileSync("app/api/orders/route.ts", "utf8");
  const landingBundleSource = readFileSync("/Users/theanh/CodexProjects/Hệ thống quảng cáo/05_Ke_hoach_Marketing/landing-pages/doi-ngu-nhan-su-ai/src/components/RegistrationForm.jsx", "utf8");
  assert.match(orderRoute, /sendMetaLeadEvent\([\s\S]*?eventId:\s*order\.orderCode/);
  assert.match(landingBundleSource, /trackMarketingEvent\("Lead",\s*\{[\s\S]*?event_id:\s*result\.order\.orderCode/);
  assert.doesNotMatch(orderRoute, /eventId:\s*`lead:\$\{order\.orderCode\}`/);
});
