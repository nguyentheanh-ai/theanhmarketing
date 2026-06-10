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

test("Facebook Ads landing keeps Vietnamese UTF-8 text readable", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const published = read("public/academy/facebook-ads-master-2026.html");
  const mojibakePattern = /KhÃ|Ä|áº|á»|â€|Ã|Â/;

  assert.doesNotMatch(source, mojibakePattern);
  assert.doesNotMatch(published, mojibakePattern);
  assert.match(source, /Khóa học <span class="hero-title-accent">Quảng cáo Facebook<\/span> Master 2026\./);
  assert.match(source, /Đăng ký ngay - 399\.000đ/);
  assert.match(source, /Quà tặng/);
});

test("Facebook Ads landing shows only 399K and 799K plan cards, with 799K as the selected primary offer", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /data-plan-card="video"/);
  assert.match(html, /data-plan-card="zoom-kit"/);
  assert.doesNotMatch(html, /data-plan-card="advanced-zoom"/);
  assert.match(html, /<input type="hidden" name="paymentPlan" value="zoom-kit" \/>/);
  assert.match(html, /var selectedPlan = plans\["zoom-kit"\]/);
  assert.match(html, /AI Agent - 799\.000/);

  const videoCard = cardFor(html, "video");
  const agentCard = cardFor(html, "zoom-kit");

  assert.match(videoCard, /399K/);
  assert.match(videoCard, /AI Agent/);
  assert.match(videoCard, /Zoom/);

  assert.match(agentCard, /is-selected/);
  assert.match(agentCard, /799K/);
  assert.match(agentCard, /AI Agent/);
  assert.doesNotMatch(agentCard, /Zoom/);

  assert.doesNotMatch(html, /gói 799\.000đ có thêm Zoom/i);
  assert.doesNotMatch(html, /Gói hỗ trợ Zoom lên ads/i);
  assert.doesNotMatch(html, /Buổi Zoom tập trung.*799\.000/i);
});

test("Facebook Ads landing offers the 500K Zoom add-on inside the form for the 799K plan", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const orderService = read("services/orderService.ts");

  assert.match(html, /name="zoomAddon"/);
  assert.match(html, /1 buổi Zoom chuyên sâu/);
  assert.match(html, /\+500\.000/);
  assert.match(html, /id="zoom-addon-row"/);
  assert.match(html, /function resolveSelectedPlan/);
  assert.match(html, /zoomAddon\.checked && selectedPlan\.id === "zoom-kit"/);
  assert.match(html, /return plans\["advanced-zoom"\]/);
  assert.match(html, /"advanced-zoom": \{/);
  assert.match(html, /amount: 1299000/);
  assert.match(html, /paymentPlan: checkoutPlan\.id/);

  assert.match(orderService, /"advanced-zoom": \{/);
  assert.match(orderService, /amount: 1299000/);
  assert.match(orderService, /AI Agent 799K/);
  assert.match(orderService, /AI Agent 799K \+ 1 buổi Zoom chuyên sâu/);
});

test("Facebook Ads pricing keeps the registration form on the same desktop row as the two plans", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /\.pricing-grid\s*\{\s*display: grid;\s*grid-template-columns: minmax\(0, 1\.18fr\) minmax\(430px, 0\.92fr\)/);
  assert.match(html, /\.plan-grid\s*\{\s*display: grid;\s*grid-template-columns: minmax\(150px, 0\.48fr\) minmax\(330px, 1\.52fr\)/);
  assert.match(html, /@media \(max-width: 1020px\)[\s\S]*?\.hero-grid,[\s\S]*?\.pricing-grid\s*\{[\s\S]*?grid-template-columns: 1fr/);
  assert.match(html, /@media \(max-width: 1020px\)[\s\S]*?\.form-card\s*\{[\s\S]*?width: min\(720px, 100%\)/);
});

test("Facebook Ads pricing makes 399K compact, 799K/form larger, and places Zoom add-on above the registration button", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /<article class="plan-card is-compact" data-plan-card="video">/);
  assert.match(html, /<article class="plan-card is-featured is-selected" data-plan-card="zoom-kit">/);
  assert.match(html, /\.plan-card\.is-compact\s*\{[\s\S]*?padding: 18px/);
  assert.match(html, /\.plan-card\.is-featured\s*\{[\s\S]*?padding: 34px/);

  assert.match(
    html,
    /<input id="phone"[\s\S]*?<\/div>\s*<label class="zoom-addon" id="zoom-addon-row">[\s\S]*?<button class="btn btn-primary" type="submit" id="payment-submit">Dang ky goi|<input id="phone"[\s\S]*?<\/div>\s*<label class="zoom-addon" id="zoom-addon-row">[\s\S]*?<button class="btn btn-primary" type="submit" id="payment-submit">Đăng ký gói/
  );
  assert.match(html, /submitText: "Đăng ký gói AI Agent - 799\.000đ"/);
  assert.doesNotMatch(html, /Thanh toán gói AI Agent - 799\.000đ/);
  assert.match(html, /\.zoom-addon input\s*\{[\s\S]*?appearance: none;[\s\S]*?border: 2px solid #1d7cff;[\s\S]*?background: #fff;/);
  assert.match(html, /\.zoom-addon input:checked::before\s*\{[\s\S]*?background: #1d7cff/);
  assert.match(html, /\.zoom-addon:hover,\s*\.zoom-addon:focus-within\s*\{[\s\S]*?transform: translateY\(-3px\);[\s\S]*?box-shadow: 0 16px 36px rgba\(246, 102, 40, 0\.18\)/);
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
