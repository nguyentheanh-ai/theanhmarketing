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
  AGENT_KIT_PREORDER_DEPOSIT_VND: 1, AGENT_KIT_OFFICIAL_PAYMENT_PLAN: "official",
  AGENT_KIT_OFFICIAL_PRICE_VND: 1, formatVnd: String,
});
vm.runInContext(ts.transpile(packageSource), context);
const course = [{ slug: "facebook-ads-2026", title: "Facebook Ads Master 2026" }];

test("evergreen combo remains available after the legacy promotion expires, with both entitlements", () => {
  const result = context.buildOrderPackage(course, "zoom-kit-ebook-20");
  assert.equal(result.amount, 1098000 * 0.8);
  assert.equal(result.courseSlug, "facebook-ads-2026,ebook-facebook-ads-2026");
  assert.equal(result.orderItems.reduce((sum, item) => sum + item.price, 0), result.amount);
  assert.equal(result.orderItems[0].price, 639200);
  assert.equal(result.orderItems[1].price, 239200);
  assert.throws(() => context.buildOrderPackage(course, "zoom-kit-ebook-vietnam-thang-thai-lan-20"), /đã kết thúc/);
});

test("course-only price and invalid product-plan validation are preserved", () => {
  assert.equal(context.buildOrderPackage(course, "zoom-kit").amount, 799000);
  assert.throws(() => context.buildOrderPackage([{ slug: "ebook-facebook-ads-2026" }], "zoom-kit-ebook-20"), /không hợp lệ/);
});


test("landing checkbox selects the approved 1098000 combo and agrees with the server", () => {
  const html = readFileSync(new URL("../public/ladipage/facebook-ads-2026.html", import.meta.url), "utf8");
  const plansSource = html.slice(html.indexOf("        var plans ="), html.indexOf("        var cartKey ="));
  const resolverSource = html.slice(html.indexOf("        function resolveSelectedPlan()"), html.indexOf("        function addCourseToCart()"));
  const browser = vm.createContext({ ebookAddon: { checked: false } });
  vm.runInContext(plansSource + resolverSource, browser);
  assert.equal(browser.resolveSelectedPlan().amount, 799000);
  browser.ebookAddon.checked = true;
  assert.equal(browser.resolveSelectedPlan().id, "zoom-kit-ebook-299");
  assert.equal(browser.resolveSelectedPlan().amount, 1098000);
  const server = context.buildOrderPackage(course, browser.resolveSelectedPlan().id);
  assert.equal(server.amount, browser.resolveSelectedPlan().amount);
  assert.equal(server.orderItems.reduce((sum, item) => sum + item.price, 0), 1098000);
  assert.equal(server.courseSlug, "facebook-ads-2026,ebook-facebook-ads-2026");
  browser.ebookAddon.checked = false;
  assert.equal(browser.resolveSelectedPlan().amount, 799000);
});
