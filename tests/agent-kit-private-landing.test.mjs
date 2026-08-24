import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const landingPage = readFileSync("app/khoa-hoc/bo-kit-agent-doanh-nghiep/page.tsx", "utf8");
const bundleLoader = readFileSync("app/khoa-hoc/bo-kit-agent-doanh-nghiep/agent-kit-bundle.tsx", "utf8");
const bundleSource = bundleLoader.match(/bundleSource = "([^"]+)"/)?.[1];
assert.ok(bundleSource, "academy loader must declare its landing bundle");
const bundle = readFileSync(`public${bundleSource}`, "utf8");
const staticEntry = readFileSync("public/doi-ngu-nhan-su-ai/index.html", "utf8");
const styles = readFileSync("public/doi-ngu-nhan-su-ai/assets/index-ekBwkhKb.css", "utf8");
const orderService = readFileSync("services/orderService.ts", "utf8");
const paymentPage = readFileSync("app/thanh-toan/[code]/page.tsx", "utf8");
const sepayWebhook = readFileSync("app/api/sepay/webhook/route.ts", "utf8");
const paymentSuccessEmail = readFileSync("lib/notifications/payment-success-email.ts", "utf8");
const pendingPaymentEmail = readFileSync("lib/notifications/pending-payment-email.ts", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");

test("academy route mounts only the approved Đội ngũ nhân sự AI build", () => {
  assert.match(landingPage, /title: "Đội ngũ nhân sự AI dành cho doanh nghiệp"/);
  assert.match(landingPage, /landingAssetRoot = "\/doi-ngu-nhan-su-ai"/);
  assert.match(bundleLoader, /\/doi-ngu-nhan-su-ai\/assets\/index-[A-Za-z0-9_-]+\.js/);
  assert.match(landingPage, /assets\/index-ekBwkhKb\.css/);
  assert.match(bundleLoader, /<div id="root"/);
  assert.doesNotMatch(landingPage, /AgentKitCalculator|AgentKitCheckoutForm|noti-agent-page/);
});

test("academy and static entry load the same current bundle from an absolute asset URL", () => {
  assert.match(staticEntry, new RegExp(`src="${bundleSource.replaceAll("/", "\\/")}"`));
  assert.doesNotMatch(staticEntry, /src="\.\/assets\//);
  assert.match(staticEntry, /href="\/doi-ngu-nhan-su-ai\/assets\/index-ekBwkhKb\.css"/);
  assert.doesNotMatch(staticEntry, /href="\.\/assets\//);
});

test("published bundle contains the reviewed offer phase and semantic demo tracking", () => {
  for (const text of [
    "agent-kit-standard-999",
    "Mua ngay 999.000đ",
    "agent_demo_view",
    "agent_role_select",
    "agent_demo_complete",
  ]) {
    assert.ok(bundle.includes(text), `missing current landing behavior: ${text}`);
  }
  assert.doesNotMatch(bundle, /["']demo_start["']|["']demo_complete["']/);
});

test("landing bundle includes the approved product, form and commerce contract", () => {
  for (const text of [
    "Đội ngũ nhân sự AI",
    "Giao bớt việc marketing lặp lại cho đội ngũ Nhân viên AI",
    "Bộ 8 Nhân viên AI dành cho doanh nghiệp",
    "Đặt cọc 399.000đ",
    "bo-agent-kit-x10-hieu-suat-cong-viec",
    "agent-kit-preorder-deposit-399",
    "cọc preorder",
    "399.000đ",
    "799.000đ",
    "400.000đ",
    "academy/bo-kit-agent-doanh-nghiep",
  ]) {
    assert.ok(bundle.includes(text), `missing bundled contract: ${text}`);
  }
  assert.match(orderService, /AGENT_KIT_PREORDER_PAYMENT_PLAN[\s\S]*amount:\s*AGENT_KIT_PREORDER_DEPOSIT_VND/);
});

test("preorder deposit is labeled, priced and access-gated across checkout", () => {
  assert.match(paymentPage, /isAgentKitPreorderDepositOrder/);
  assert.match(paymentPage, /Cọc trước ngày mở bán/);
  assert.match(paymentPage, /400\.000đ còn lại/);
  assert.match(sepayWebhook, /const preorderDepositOrder = isAgentKitPreorderDepositOrder/);
  assert.match(sepayWebhook, /if \(!preorderDepositOrder\) \{[\s\S]*ensureStudentAccountForPaidOrder/);
  assert.match(paymentSuccessEmail, /ĐÃ NHẬN TIỀN CỌC PREORDER/);
  assert.match(pendingPaymentEmail, /Đặt cọc preorder Đội ngũ nhân sự AI/);
});

test("landing ships its real logo, favicon, media and responsive styles", () => {
  assert.match(landingPage, /icons:[\s\S]*brand\/ta-mark\.svg/);
  for (const file of [
    "public/doi-ngu-nhan-su-ai/brand/ta-mark.svg",
    "public/doi-ngu-nhan-su-ai/images/generated/hero-operator.webp",
    "public/doi-ngu-nhan-su-ai/images/proof/student-6-month-dashboard.png",
    "public/doi-ngu-nhan-su-ai/media/landing-showcase/landing-agent-kit.mp4",
  ]) {
    assert.equal(existsSync(file), true, `missing landing asset: ${file}`);
  }
  assert.match(styles, /@media\s*\(max-width:\s*600px\)/);
  assert.match(styles, /\.data-dashboard/);
  assert.match(styles, /overflow-x:\s*auto/);
});

test("agent kit private landing remains exposed only through its academy route", () => {
  assert.match(nextConfig, /source:\s*"\/khoa-hoc\/bo-kit-agent-doanh-nghiep"/);
  assert.match(nextConfig, /destination:\s*"\/academy\/bo-kit-agent-doanh-nghiep"/);
  assert.match(nextConfig, /source:\s*"\/academy\/bo-kit-agent-doanh-nghiep"/);
  assert.match(nextConfig, /destination:\s*"\/khoa-hoc\/bo-kit-agent-doanh-nghiep"/);
});
