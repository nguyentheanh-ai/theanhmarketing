import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("Ebook Facebook Ads landing keeps source and published HTML synced", () => {
  const source = read("public/ladipage/ebook-facebook-ads-2026.html");
  const published = read("public/academy/ebook-facebook-ads-2026.html");

  assert.equal(published, source);
});

test("Ebook Facebook Ads landing uses preorder CTA copy", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /\u0110\u1EB7t tr\u01B0\u1EDBc th\u01B0 vi\u1EC7n Facebook Ads 2026/);
  assert.match(html, /Xem tr\u01B0\u1EDBc Ebook/);
  assert.match(html, /Outline Ebook/);
  assert.match(html, /M\u1EA5t nhi\u1EC1u th\u1EDDi gian \u0111\u1EC3 <span class="gold">t\u00ECm h\u01B0\u1EDBng d\u1EABn<\/span> cho nh\u1EEFng <span class="gold">thao t\u00E1c \u0111\u01A1n gi\u1EA3n<\/span>\./);
  assert.match(html, /L\u1EE5c video qu\u00E1 l\u00E2u/);
  assert.match(html, /Kh\u00F4ng bi\u1EBFt m\u1EDF b\u00E0i n\u00E0o/);
  assert.match(html, /Ph\u1EA3i h\u1ECFi l\u1EA1i t\u1EEBng b\u01B0\u1EDBc/);
  assert.match(html, /\u0110\u1EB7t tr\u01B0\u1EDBc quy\u1EC1n truy c\u1EADp ngay/);
  assert.doesNotMatch(html, /M\u1EDF kh\u00F3a quy\u1EC1n truy c\u1EADp ngay/);
  assert.doesNotMatch(html, /M\u1EE5c ti\u00EAu sai/);
  assert.doesNotMatch(html, /T\u1EC7p kh\u00F4ng r\u00F5/);
  assert.doesNotMatch(html, /\u0110\u1ECDc s\u1ED1 c\u1EA3m t\u00EDnh/);
  assert.doesNotMatch(html, /Xem b\u00EAn trong c\u00F3 g\u00EC/);
  assert.doesNotMatch(html, /Live th\u01B0 vi\u1EC7n th\u1EF1c h\u00E0nh/);
  assert.doesNotMatch(html, /Kh\u00F4ng thi\u1EBFu video\. Thi\u1EBFu b\u1EA3n \u0111\u1ED3 \u0111\u1EC3 bi\u1EBFt s\u1EEDa g\u00EC tr\u01B0\u1EDBc\./);
  assert.doesNotMatch(html, /ph\u1EA7n ki\u1EBFn th\u1EE9c theo t\u00ECnh hu\u1ED1ng ch\u1EA1y ads/);
});

test("Ebook Facebook Ads landing adds a light color-wash hover effect", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /\.problem-card::before/);
  assert.match(html, /\.quick-card:hover::before/);
  assert.match(html, /radial-gradient\(circle at 24% 18%, rgba\(255, 213, 95, \.26\), transparent 30%\)/);
  assert.match(html, /transition: opacity \.28s ease, transform \.42s ease/);
});

test("Ebook Facebook Ads landing uses the real The Anh Marketing logo", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /<img src="\/brand\/ta-logo\.svg" alt="The Anh Marketing">/);
  assert.doesNotMatch(html, /<span class="brand-mark">TA<\/span>/);
});

test("Ebook Facebook Ads landing uses deployed PNG preview assets", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /\/ebook-facebook-ads-2026\/phan-1\/1\.png/);
  assert.match(html, /\/ebook-facebook-ads-2026\/phan-1\/2\.png/);
  assert.match(html, /\/ebook-facebook-ads-2026\/phan-1\/\$\{currentPage\.page\}\.png/);
  assert.doesNotMatch(html, /Ebook PNG/);

  for (let page = 1; page <= 29; page += 1) {
    assert.ok(
      fs.existsSync(path.resolve(`public/ebook-facebook-ads-2026/phan-1/${page}.png`)),
      `Missing preview PNG page ${page}`,
    );
  }
});

test("Ebook Facebook Ads landing submits to the existing payment order flow", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /slug:\s*"ebook-facebook-ads-2026"/);
  assert.match(html, /plan:\s*"full-access-299"/);
  assert.match(html, /amount:\s*299000/);
  assert.match(html, /fetch\("\/api\/orders"/);
  assert.match(html, /courseSlug:\s*course\.slug/);
  assert.match(html, /paymentPlan:\s*course\.plan/);
  assert.match(html, /landingPage:\s*"academy\/ebook-facebook-ads-2026"/);
  assert.match(html, /window\.location\.href = "\/thanh-toan\/" \+ encodeURIComponent\(payload\.order\.orderCode\);/);
  assert.doesNotMatch(html, /mailto:/);
});

test("Ebook Facebook Ads landing does not fire InitiateCheckout before checkout page", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");
  const submitHandler = html.match(/form\.addEventListener\("submit", async \(event\) => \{([\s\S]*?)window\.location\.href = "\/thanh-toan\/" \+ encodeURIComponent\(payload\.order\.orderCode\);/);

  assert.ok(submitHandler, "Missing ebook payment form submit handler");
  assert.doesNotMatch(submitHandler[1], /InitiateCheckout/);
});

test("Ebook Facebook Ads payment plan is configured as a separate 299K product", () => {
  const courses = read("data/courses.ts");
  const orders = read("services/orderService.ts");
  const paymentPage = read("app/thanh-toan/[code]/page.tsx");
  const ordersRoute = read("app/api/orders/route.ts");
  const nextConfig = read("next.config.ts");
  const proxy = read("proxy.ts");

  assert.match(courses, /slug:\s*"ebook-facebook-ads-2026"/);
  assert.match(courses, /title:\s*"Thư viện kiến thức Facebook Ads 2026"/);
  assert.match(orders, /"ebook-facebook-ads-2026":\s*\{/);
  assert.match(orders, /"full-access-299":\s*\{[\s\S]*?amount:\s*299000/);
  assert.match(paymentPage, /function isFacebookAdsEbook2026/);
  assert.match(paymentPage, /productHref:\s*"\/academy\/ebook-facebook-ads-2026"/);
  assert.match(paymentPage, /currentPriceLabel:\s*"299\.000đ"/);
  assert.match(ordersRoute, /LDP Ebook Facebook Ads 2026/);
  assert.match(nextConfig, /source:\s*"\/academy\/ebook-facebook-ads-2026\.html"[\s\S]*?destination:\s*"\/academy\/ebook-facebook-ads-2026"/);
  assert.match(nextConfig, /source:\s*"\/academy\/ebook-facebook-ads-2026"[\s\S]*?destination:\s*"\/academy\/ebook-facebook-ads-2026\.html"/);
  assert.ok(
    !fs.existsSync(path.resolve("app/academy/ebook-facebook-ads-2026/route.ts")),
    "Clean ebook URL must be served by rewrite, not redirected to .html",
  );
  assert.match(proxy, /pathname === "\/academy\/ebook-facebook-ads-2026"/);
  assert.match(proxy, /pathname === "\/academy\/ebook-facebook-ads-2026\.html"/);
});
