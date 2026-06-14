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
  assert.match(html, /Th\u01B0 vi\u1EC7n ki\u1EBFn th\u1EE9c &amp; th\u1EF1c h\u00E0nh Facebook Ads/);
  assert.match(html, /M\u1EA5t nhi\u1EC1u th\u1EDDi gian \u0111\u1EC3 <span class="gold">t\u00ECm h\u01B0\u1EDBng d\u1EABn<\/span> cho nh\u1EEFng <span class="gold">thao t\u00E1c \u0111\u01A1n gi\u1EA3n<\/span>\./);
  assert.match(html, /L\u1EE5c video qu\u00E1 l\u00E2u/);
  assert.match(html, /Kh\u00F4ng bi\u1EBFt m\u1EDF b\u00E0i n\u00E0o/);
  assert.match(html, /Ph\u1EA3i h\u1ECFi l\u1EA1i t\u1EEBng b\u01B0\u1EDBc/);
  assert.match(html, /Chu\u1EA9n b\u1ECB ch\u1EA1y th\u1EADt/);
  assert.match(html, /Kh\u00F4ng bi\u1EBFt sai \u1EDF \u0111\u00E2u/);
  assert.match(html, /C\u1EA7n ki\u1EC3m so\u00E1t team/);
  assert.match(html, /K\u1EB9t m\u1ED9t thao t\u00E1c nh\u1ECF/);
  assert.match(html, /B\u1EAFt \u0111\u1EA7u theo nhu c\u1EA7u/);
  assert.match(html, /\u0110ang v\u01B0\u1EDBng vi\u1EC7c n\u00E0o, m\u1EDF \u0111\u00FAng nh\u00F3m \u0111\u00F3\./);
  assert.match(html, /M\u1EDF \u0111\u00FAng h\u01B0\u1EDBng d\u1EABn/);
  assert.match(html, /Bi\u1EBFt s\u1EEDa ch\u1ED7 n\u00E0o tr\u01B0\u1EDBc/);
  assert.match(html, /Khi \u0111ang ch\u1EA1y qu\u1EA3ng c\u00E1o th\u1EADt, \u0111i\u1EC1u quan tr\u1ECDng l\u00E0 t\u00ECm \u0111\u01B0\u1EE3c \u0111\u00FAng ph\u1EA7n/);
  assert.match(html, /class="section-note-card reveal"><span>G\u1EE3i \u00FD d\u00F9ng<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>\u0110i\u1EC3m kh\u00E1c bi\u1EC7t<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>Ch\u1ECDn t\u00ECnh hu\u1ED1ng<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>Ph\u00F9 h\u1EE3p<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>T\u00E0i nguy\u00EAn th\u1EF1c h\u00E0nh<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>D\u00F9ng l\u00E2u d\u00E0i<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>C\u00E2u h\u1ECFi th\u01B0\u1EDDng g\u1EB7p<\/span>/);
  assert.match(html, /\u0110\u1EB7t tr\u01B0\u1EDBc quy\u1EC1n truy c\u1EADp ngay/);
  assert.doesNotMatch(html, /M\u1EDF kh\u00F3a quy\u1EC1n truy c\u1EADp ngay/);
  assert.doesNotMatch(html, /<p>Ch\u1ECDn \u0111\u00FAng t\u00ECnh hu\u1ED1ng, m\u1EDF ngay ph\u1EA7n c\u1EA7n x\u1EED l\u00FD\.<\/p>/);
  assert.doesNotMatch(html, /<p>\u0110i\u1EC3m kh\u00E1c bi\u1EC7t kh\u00F4ng n\u1EB1m \u1EDF vi\u1EC7c/);
  assert.doesNotMatch(html, /<p>Kh\u00F4ng d\u00E0nh cho ng\u01B0\u1EDDi t\u00ECm m\u1EB9o l\u00E1ch ch\u00EDnh s\u00E1ch/);
  assert.doesNotMatch(html, /<p>Kh\u00F4ng ph\u1EA3i bonus cho \u0111\u1EB9p/);
  assert.doesNotMatch(html, /<p>C\u00E1c c\u00E2u h\u1ECFi th\u01B0\u1EDDng g\u1EB7p v\u1EC1 h\u00ECnh th\u1EE9c s\u1EA3n ph\u1EA9m/);
  assert.doesNotMatch(html, /Hotline: 0367 928 921/);
  assert.doesNotMatch(html, /theanhnguyen\.marketing@gmail\.com/);
  assert.doesNotMatch(html, /<a class="btn btn-gold reveal" href="#offer">\u0110\u1EB7t tr\u01B0\u1EDBc ngay<\/a>/);
  assert.doesNotMatch(html, /C\u1EA7n ch\u1EA1y/);
  assert.doesNotMatch(html, /C\u1EA7n \u0111o/);
  assert.doesNotMatch(html, /C\u1EA7n s\u1EEDa/);
  assert.doesNotMatch(html, /C\u1EA7n scale/);
  assert.doesNotMatch(html, /C\u00F3 thanh t\u00ECm ki\u1EBFm, s\u1ED1 trang v\u00E0 \u1EA3nh trang th\u1EADt l\u1EA5y t\u1EEB b\u1ED9 PNG anh \u0111\u00E3 c\u1EA5p\./);
  assert.doesNotMatch(html, /Trang c\u1EA7n gi\u00FAp/);
  assert.doesNotMatch(html, /Landing page kh\u00F4ng c\u1EA7n k\u1EC3 d\u00E0i/);
  assert.doesNotMatch(html, /Ng\u01B0\u1EDDi d\u00F9ng c\u1EA7n th\u1EA5y/);
  assert.doesNotMatch(html, /Lookup nhanh/);
  assert.doesNotMatch(html, /M\u1EE5c ti\u00EAu sai/);
  assert.doesNotMatch(html, /T\u1EC7p kh\u00F4ng r\u00F5/);
  assert.doesNotMatch(html, /\u0110\u1ECDc s\u1ED1 c\u1EA3m t\u00EDnh/);
  assert.doesNotMatch(html, /Xem b\u00EAn trong c\u00F3 g\u00EC/);
  assert.doesNotMatch(html, /Live th\u01B0 vi\u1EC7n th\u1EF1c h\u00E0nh/);
  assert.doesNotMatch(html, /Kh\u00F4ng thi\u1EBFu video\. Thi\u1EBFu b\u1EA3n \u0111\u1ED3 \u0111\u1EC3 bi\u1EBFt s\u1EEDa g\u00EC tr\u01B0\u1EDBc\./);
  assert.doesNotMatch(html, /ph\u1EA7n ki\u1EBFn th\u1EE9c theo t\u00ECnh hu\u1ED1ng ch\u1EA1y ads/);
});

test("Ebook Facebook Ads landing has a pinned bottom preorder CTA", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /body \{[\s\S]*?padding-bottom:\s*92px;/);
  assert.match(html, /\.sticky-cta\s*\{/);
  assert.match(html, /position:\s*fixed;[\s\S]*?bottom:\s*0;/);
  assert.match(html, /<div class="sticky-cta" aria-label="\u0110\u1EB7t tr\u01B0\u1EDBc th\u01B0 vi\u1EC7n Facebook Ads 2026">/);
  assert.match(html, /<strong>Th\u01B0 vi\u1EC7n ki\u1EBFn th\u1EE9c &amp; th\u1EF1c h\u00E0nh Facebook Ads<\/strong>/);
  assert.match(html, /<span class="sticky-cta-icon"><img src="\/brand\/ta-logo\.svg" alt="The Anh Marketing"><\/span>/);
  assert.doesNotMatch(html, /<span class="sticky-cta-icon">TA<\/span>/);
  assert.match(html, /<b class="sticky-cta-original">799\.000\u0111<\/b>/);
  assert.match(html, /<b class="sticky-cta-price">299\.000\u0111<\/b>/);
  assert.match(html, /<a class="btn btn-gold" href="#offer">\u0110\u1EB7t tr\u01B0\u1EDBc ngay \u2192<\/a>/);
});

test("Ebook Facebook Ads order form buttons keep readable Vietnamese typography", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /\.form-actions \.btn\s*\{[\s\S]*?font-family:\s*"Be Vietnam Pro"/);
  assert.match(html, /\.form-actions \.btn\s*\{[\s\S]*?font-size:\s*15px;/);
  assert.match(html, /\.form-actions \.btn\s*\{[\s\S]*?line-height:\s*1\.25;/);
  assert.match(html, /\.form-actions \.btn\s*\{[\s\S]*?letter-spacing:\s*0;/);
  assert.match(html, /\.form-actions \.btn\s*\{[\s\S]*?white-space:\s*normal;/);
  assert.match(html, /<button class="btn btn-primary" type="submit">\u0110\u1EB7t tr\u01B0\u1EDBc quy\u1EC1n truy c\u1EADp ngay<\/button>/);
});

test("Ebook Facebook Ads preview opens full screen and searches only part 1 topics", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /\.ebook-preview\.is-focused\s*\{[\s\S]*?inset:\s*0;/);
  assert.match(html, /\.ebook-preview\.is-focused\s*\{[\s\S]*?width:\s*100vw;/);
  assert.match(html, /\.ebook-preview\.is-focused\s*\{[\s\S]*?height:\s*100dvh;/);
  assert.match(html, /\.ebook-preview\.is-focused \.ebook-stage\s*\{[\s\S]*?place-items:\s*center;/);
  assert.match(html, /\.ebook-preview\.is-focused \.page-frame img\s*\{[\s\S]*?object-fit:\s*contain;/);
  assert.doesNotMatch(html, /\.ebook-preview\.is-focused\s*\{[\s\S]*?transform:\s*translate\(-50%, -50%\) scale\(1\.02\)/);
  assert.match(html, /placeholder="T\u00ECm: Facebook Ads l\u00E0 g\u00EC, t\u00EDnh ti\u1EC1n, CPM, \u0111\u1EA5u gi\u00E1\.\.\."/);
  assert.doesNotMatch(html, /placeholder="T\u00ECm: pixel, target/);
  assert.doesNotMatch(html, /terms:\s*\[[^\]]*"pixel"/);
  assert.doesNotMatch(html, /terms:\s*\[[^\]]*"target"/);
  assert.match(html, /terms:\s*\["facebook ads l\u00E0 g\u00EC", "doanh nghi\u1EC7p"\]/);
  assert.match(html, /terms:\s*\["\u0111\u1EA5u gi\u00E1", "gi\u00E1 th\u1EA7u", "ph\u00E2n ph\u1ED1i"\]/);
  assert.match(html, /terms:\s*\["campaign", "ad set", "ad", "c\u1EA5u tr\u00FAc"\]/);
});

test("Ebook Facebook Ads landing adds a light color-wash hover effect", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /\.problem-card::before/);
  assert.match(html, /\.quick-card:hover::before/);
  assert.match(html, /radial-gradient\(circle at 24% 18%, rgba\(255, 213, 95, \.26\), transparent 30%\)/);
  assert.match(html, /transition: opacity \.28s ease, transform \.42s ease/);
  assert.match(html, /transform: translateY\(-3px\) scale\(1\.018\)/);
  assert.match(html, /transform: translateY\(-3px\) scale\(1\.025\)/);
  assert.match(html, /\.browser-card:hover/);
  assert.match(html, /\.order-box:hover/);
  assert.match(html, /\.reveal\.is-visible\.card:hover/);
  assert.match(html, /\.reveal\.is-visible\.ebook-preview:not\(\.is-focused\):hover/);
  assert.match(html, /prefers-reduced-motion: reduce/);
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

test("Ebook Facebook Ads landing includes the primary Meta Pixel without early checkout", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.match(html, /fbq\("init", "1315653423712065"\)/);
  assert.match(html, /fbq\("track", "PageView"\)/);
  assert.match(html, /fbq\("track", "ViewContent", \{/);
  assert.match(html, /content_ids:\s*\["ebook-facebook-ads-2026"\]/);
  assert.match(html, /content_type:\s*"product"/);
  assert.match(html, /currency:\s*"VND"/);
  assert.match(html, /value:\s*299000/);
  assert.match(html, /https:\/\/www\.facebook\.com\/tr\?id=1315653423712065&ev=PageView&noscript=1/);
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
