import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function cardFor(html, planId) {
  const match = html.match(new RegExp(`<article class="plan-card[^"]*" data-plan-card="${planId}">([\\s\\S]*?)</article>`));
  assert.ok(match, `Missing plan card ${planId}`);
  return match[0];
}

test("Facebook Ads landing keeps source and published HTML synced", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const published = read("public/academy/facebook-ads-master-2026.html");

  assert.equal(published, source);
});

test("Facebook Ads landing offers only the 799K AI Agent plan", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /data-plan-card="zoom-kit"/);
  assert.doesNotMatch(html, /data-plan-card="video"/);
  assert.doesNotMatch(html, /data-plan-select="video"/);
  assert.doesNotMatch(html, /data-plan-card="advanced-zoom"/);
  assert.match(html, /<input type="hidden" name="paymentPlan" value="zoom-kit" \/>/);
  assert.match(html, /var selectedPlan = plans\["zoom-kit"\]/);
  assert.match(html, /AI Agent - 799\.000/);
  assert.match(html, /value: 799000/);
  assert.doesNotMatch(html, /399K|399\.000|399000/);

  const agentCard = cardFor(html, "zoom-kit");

  assert.match(agentCard, /is-selected/);
  assert.match(agentCard, /799K/);
  assert.match(agentCard, /AI Agent/);
  assert.doesNotMatch(agentCard, /Zoom/);
  assert.doesNotMatch(agentCard, /Chọn gói 799K/);
  assert.doesNotMatch(agentCard, /<button[^>]+data-plan-select="zoom-kit"/);

  assert.doesNotMatch(html, /gói 799\.000đ có thêm Zoom/i);
  assert.doesNotMatch(html, /Gói hỗ trợ Zoom lên ads/i);
  assert.doesNotMatch(html, /Buổi Zoom tập trung.*799\.000/i);
});

test("Facebook Ads landing no longer offers the 500K Zoom add-on in the registration form", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.doesNotMatch(html, /name="zoomAddon"/);
  assert.doesNotMatch(html, /id="zoom-addon-row"/);
  assert.doesNotMatch(html, /\+500\.000/);
  assert.doesNotMatch(html, /\+500K/);
  assert.doesNotMatch(html, /form đăng ký[\s\S]{0,220}Zoom/i);
  assert.doesNotMatch(html, /return plans\["advanced-zoom"\]/);
  assert.doesNotMatch(html, /amount: 1299000/);
  assert.doesNotMatch(html, /paymentPlan: checkoutPlan\.id[\s\S]{0,120}advanced-zoom/);
  assert.match(html, /function resolveSelectedPlan/);
  assert.doesNotMatch(html, /ebookAddon\.checked\s*\?\s*plans\["advanced-zoom"\]/);
  assert.match(html, /paymentPlan: checkoutPlan\.id/);
});

test("Facebook Ads pricing keeps the single 799K plan beside the registration form on desktop", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /\.pricing-grid\s*\{\s*display: grid;\s*grid-template-columns: minmax\(0, 1\.18fr\) minmax\(430px, 0\.92fr\)/);
  assert.match(html, /\.plan-grid\s*\{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(html, /@media \(max-width: 1020px\)[\s\S]*?\.hero-grid,[\s\S]*?\.pricing-grid\s*\{[\s\S]*?grid-template-columns: 1fr/);
  assert.match(html, /@media \(max-width: 1020px\)[\s\S]*?\.form-card\s*\{[\s\S]*?width: min\(720px, 100%\)/);
});

test("Facebook Ads pricing keeps 799K featured and the registration button directly after phone", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /<article class="plan-card is-featured is-selected" data-plan-card="zoom-kit">/);
  assert.match(html, /\.plan-card\.is-featured\s*\{[\s\S]*?padding: 34px/);

  assert.match(
    html,
    /<input id="phone"[\s\S]*?<\/div>\s*<label class="ebook-addon"[\s\S]*?name="ebookAddon"[\s\S]*?<\/label>\s*<button class="btn btn-primary" type="submit" id="payment-submit">/
  );
  assert.match(html, /submitText: "Đăng ký gói AI Agent - 799\.000đ"/);
  assert.doesNotMatch(html, /Thanh toán gói AI Agent - 799\.000đ/);
  assert.doesNotMatch(html, /\.zoom-addon/);
});

test("Facebook Ads form offers an optional 299K Ebook add-on with a server-known bundle plan", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const orderService = read("services/orderService.ts");

  assert.match(html, /<input id="ebook-addon" name="ebookAddon" type="checkbox" \/>/);
  assert.match(html, /Mua kèm Ebook Facebook Ads/);
  assert.match(html, /299\.000đ/);
  assert.match(html, /<del>799\.000đ<\/del>/);
  assert.match(html, /"zoom-kit-ebook-299":\s*\{[\s\S]*?amount:\s*1098000/);
  assert.match(html, /ebookAddon\.checked\s*\?\s*plans\["zoom-kit-ebook-299"\]\s*:\s*selectedPlan/);
  assert.match(html, /ebookAddon\.addEventListener\("change", syncCheckoutState\)/);

  assert.match(orderService, /"zoom-kit-ebook-299":\s*\{[\s\S]*?amount:\s*1098000/);
  assert.match(orderService, /slug:\s*"facebook-ads-2026"[\s\S]*?price:\s*799000/);
  assert.match(orderService, /slug:\s*"ebook-facebook-ads-2026"[\s\S]*?price:\s*299000/);
  assert.match(orderService, /plan\.orderItems\.map\(\(item\) => item\.slug\)\.join\(","\)/);
});

test("Facebook Ads mobile plan selection jumps straight to the payment form", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /function jumpToPaymentFormOnMobile\(\)/);
  assert.match(html, /window\.matchMedia\("\(max-width: 820px\)"\)\.matches/);
  assert.match(html, /form\.closest\("\.form-card"\) \|\| form/);
  assert.match(html, /target\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(
    html,
    /setSelectedPlan\(button\.getAttribute\("data-plan-select"\)\);\s*jumpToPaymentFormOnMobile\(\);/
  );
});

test("Facebook Ads plan cards are clickable selection targets", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /\.plan-card\[data-plan-card\]\s*\{[\s\S]*?cursor: pointer;/);
  assert.match(html, /document\.querySelectorAll\("\[data-plan-card\]"\)\.forEach\(function \(card\)/);
  assert.match(html, /card\.addEventListener\("click", function \(event\)/);
  assert.match(html, /if \(event\.target\.closest\("\[data-plan-select\]"\)\) return;/);
  assert.match(html, /setSelectedPlan\(card\.getAttribute\("data-plan-card"\)\);/);
  assert.match(html, /setSelectedPlan\(card\.getAttribute\("data-plan-card"\)\);\s*jumpToPaymentFormOnMobile\(\);/);
});

test("Facebook Ads registration form uses a Gmail example for the email field", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /<input id="email"[^>]+placeholder="email@gmail\.com"/);
  assert.doesNotMatch(html, /placeholder="email@domain\.com"/);
});

test("Facebook Ads landing does not fire InitiateCheckout before a real order code exists", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const submitHandler = html.match(/form\.addEventListener\("submit", async function \(event\) \{([\s\S]*?)window\.location\.href = "\/thanh-toan\/" \+ encodeURIComponent\(payload\.order\.orderCode\);/);

  assert.ok(submitHandler, "Missing Facebook Ads payment form submit handler");
  assert.doesNotMatch(submitHandler[1], /track\("InitiateCheckout"/);
  assert.match(html, /window\.location\.href = "\/thanh-toan\/" \+ encodeURIComponent\(payload\.order\.orderCode\);/);
});

test("Facebook Ads landing shows the curriculum before outputs, Agent demo and exactly 12 Zalo support proofs", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const outcomeIndex = html.indexOf('id="san-pham-thuc-te"');
  const demoIndex = html.indexOf('id="agent-tu-dong-len-quang-cao"');
  const curriculumIndex = html.indexOf('id="lo-trinh"');
  const expectedAssets = [
    "facebook-ads-agent-demo.gif",
    "facebook-ads-agent-demo-poster.webp",
    "zalo-support/zalo-proof-01-agent-plan.webp",
    "zalo-support/zalo-proof-02-marketing-advice.webp",
    "zalo-support/zalo-proof-03-course-feedback.webp",
    "zalo-support/zalo-proof-04-call-34m09.webp",
    "zalo-support/zalo-proof-05-call-55m50.webp",
    "zalo-support/zalo-proof-06-calls-21m59-46m04.webp",
    "zalo-support/zalo-proof-07-call-30m59.webp",
    "zalo-support/zalo-proof-08-call-36m10.webp",
    "zalo-support/zalo-proof-09-call-22m51.webp",
    "zalo-support/zalo-proof-10-agent-consultation.webp",
    "zalo-support/zalo-proof-11-call-23m59.webp",
    "zalo-support/zalo-proof-12-support-schedule.webp",
  ];

  assert.ok(outcomeIndex >= 0, "Missing existing outcome section");
  assert.ok(outcomeIndex > curriculumIndex, "Outcome section must follow curriculum");
  assert.ok(demoIndex > outcomeIndex, "Agent demo must follow the outcome section");
  assert.match(html, /Một câu lệnh\.\s*<span>Agent tự động lên toàn bộ quảng cáo\.<\/span>/);
  assert.match(html, /Không chỉ xem video\. Vướng ở đâu, được hỗ trợ triển khai ở đó\./);
  assert.match(html, /<source media="\(prefers-reduced-motion: reduce\)" srcset="\.\.\/ladipage\/assets\/facebook-ads-agent-demo-poster\.webp"/);
  assert.match(html, /<img[^>]+src="\.\.\/ladipage\/assets\/facebook-ads-agent-demo\.gif"[^>]+loading="lazy"[^>]+decoding="async"/);
  assert.doesNotMatch(html, /facebook-ads-agent-demo\.mp4/);
  assert.equal((html.match(/data-zalo-proof=/g) || []).length, 12);
  assert.doesNotMatch(html, /a1814dc3cf3103050c99a5f65d909d65/);
  assert.match(html, /\.zalo-proof-sequence\s*\{[\s\S]*?gap:\s*12px/);
  assert.match(html, /\.zalo-proof-card\s*\{[\s\S]*?width:\s*300px;[\s\S]*?aspect-ratio:\s*15\s*\/\s*32;[\s\S]*?overflow:\s*hidden/);
  assert.match(html, /\.zalo-proof-card img\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*cover/);
  assert.match(html, /@media \(max-width:\s*680px\)[\s\S]*?\.zalo-proof-card\s*\{[\s\S]*?width:\s*244px/);

  for (const asset of expectedAssets) {
    assert.ok(fs.existsSync(path.resolve("public/ladipage/assets", asset)), `Missing asset: ${asset}`);
    assert.match(html, new RegExp(asset.replaceAll(".", "\\.")));
  }

  const gifSize = fs.statSync(path.resolve("public/ladipage/assets/facebook-ads-agent-demo.gif")).size;
  assert.ok(gifSize <= 12 * 1024 * 1024, `GIF is too large: ${gifSize} bytes`);
});

test("Facebook Ads landing uses the approved WeSuccess-inspired typography and mobile rhythm", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /--type-display-weight:\s*800/);
  assert.match(html, /--type-heading-tracking:\s*-0\.02em/);
  assert.match(
    html,
    /\.course-hero-title\s*\{[\s\S]*?font-size:\s*clamp\(44px,\s*4\.2vw,\s*60px\)[\s\S]*?line-height:\s*1\.16/
  );
  assert.match(
    html,
    /\.hybrid-section-head h2\s*\{[\s\S]*?font-size:\s*clamp\(36px,\s*3\.5vw,\s*48px\)/
  );
  assert.match(
    html,
    /@media \(max-width:\s*680px\)[\s\S]*?\.course-hero-title\s*\{[\s\S]*?font-size:\s*clamp\(30px,\s*8\.6vw,\s*34px\)[\s\S]*?line-height:\s*1\.2/
  );
  assert.match(html, /padding-bottom:\s*calc\(8px \+ env\(safe-area-inset-bottom\)\)/);
});

test("Facebook Ads decorative curriculum portrait cannot block mobile interactions", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(
    html,
    /\.curriculum-portrait-cutout,[\s\S]*?\.curriculum-portrait-cutout img,[\s\S]*?\.curriculum-orbit\s*\{[\s\S]*?pointer-events:\s*none/
  );
});
