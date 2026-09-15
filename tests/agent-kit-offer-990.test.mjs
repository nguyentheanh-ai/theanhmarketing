import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../services/orderService.ts", import.meta.url), "utf8");
const packageSource = source.slice(source.indexOf("const coursePaymentPlans:"), source.indexOf("export async function createPaymentOrder"));
const context = vm.createContext({
  VIETNAM_THANG_THAI_LAN_PROMOTION_PLAN: "zoom-kit-ebook-vietnam-thang-thai-lan-20",
  isVietnamThangThaiLanPromotionActive: () => false,
  AGENT_KIT_SLUG: "agent-kit", AGENT_KIT_PREORDER_PAYMENT_PLAN: "preorder",
  AGENT_KIT_PREORDER_PRICE_VND: 1, AGENT_KIT_PREORDER_REMAINING_VND: 1,
  AGENT_KIT_PREORDER_DEPOSIT_VND: 399000, AGENT_KIT_OFFICIAL_PAYMENT_PLAN: "official",
  AGENT_KIT_OFFICIAL_PRICE_VND: 999000, formatVnd: String,
});
vm.runInContext(ts.transpile(packageSource), context);

const course = [{slug: "agent-kit", title: "Đội ngũ nhân sự AI"}];
test("landing offer charges 990000 and preserves the full product entitlement", () => {
 const result = context.buildOrderPackage(course, "agent-kit-offer-990");
 assert.equal(result.amount, 990000);
 assert.equal(result.courseSlug, "agent-kit");
 assert.equal(result.orderItems.length, 1);
 assert.equal(result.orderItems[0].price, 990000);
 assert.doesNotMatch(result.courseTitle, /cọc|preorder/i);
});
test("other Agent Kit plans keep their amounts and the offer cannot buy another product", () => {
 assert.equal(context.buildOrderPackage(course, "official").amount, 999000);
 assert.equal(context.buildOrderPackage(course, "preorder").amount, 399000);
 assert.throws(() => context.buildOrderPackage([{slug: "facebook-ads-2026"}], "agent-kit-offer-990"), /không hợp lệ/);
});
