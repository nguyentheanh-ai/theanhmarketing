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
  const cleanRoute = read("app/academy/ebook-facebook-ads-2026/route.ts");
  const proxy = read("proxy.ts");

  assert.match(courses, /slug:\s*"ebook-facebook-ads-2026"/);
  assert.match(courses, /title:\s*"Thư viện kiến thức Facebook Ads 2026"/);
  assert.match(orders, /"ebook-facebook-ads-2026":\s*\{/);
  assert.match(orders, /"full-access-299":\s*\{[\s\S]*?amount:\s*299000/);
  assert.match(paymentPage, /function isFacebookAdsEbook2026/);
  assert.match(paymentPage, /productHref:\s*"\/academy\/ebook-facebook-ads-2026"/);
  assert.match(paymentPage, /currentPriceLabel:\s*"299\.000đ"/);
  assert.match(ordersRoute, /LDP Ebook Facebook Ads 2026/);
  assert.match(nextConfig, /source:\s*"\/academy\/ebook-facebook-ads-2026"[\s\S]*?destination:\s*"\/academy\/ebook-facebook-ads-2026\.html"/);
  assert.match(cleanRoute, /NextResponse\.redirect/);
  assert.match(cleanRoute, /\/academy\/ebook-facebook-ads-2026\.html/);
  assert.match(proxy, /pathname === "\/academy\/ebook-facebook-ads-2026"/);
  assert.match(proxy, /pathname === "\/academy\/ebook-facebook-ads-2026\.html"/);
});
