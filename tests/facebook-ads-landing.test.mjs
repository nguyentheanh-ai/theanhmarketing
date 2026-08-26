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

function assertOrdered(html, markers) {
  let previousIndex = -1;
  for (const marker of markers) {
    const currentIndex = html.indexOf(marker);
    assert.ok(currentIndex >= 0, `Missing ordered marker: ${marker}`);
    assert.ok(currentIndex > previousIndex, `Marker is out of order: ${marker}`);
    previousIndex = currentIndex;
  }
}

test("Facebook Ads landing keeps source and published HTML synced", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const published = read("public/academy/facebook-ads-master-2026.html");

  assert.equal(published, source);
});

test("Facebook Ads rewrite preserves SEO, tracking and order contracts", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /<title>Khóa học Facebook Ads 2026 - Thế Anh Marketing<\/title>/);
  assert.match(html, /<meta\s+name="description"\s+content="Khóa học Quảng cáo Facebook Master 2026 giúp chủ doanh nghiệp chạy Facebook Ads có hệ thống để tạo inbox, lọc lead và tối ưu đơn hàng\."/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.theanhmarketing\.com\/academy\/facebook-ads-master-2026"/);
  assert.equal((html.match(/fbq\("init", "1315653423712065"\)/g) || []).length, 1);
  assert.match(html, /fbq\("track", "PageView"\)/);
  assert.match(html, /fbq\("track", "ViewContent", \{[\s\S]*?content_ids: \["facebook-ads-2026"\][\s\S]*?value: 799000/);
  assert.match(html, /fetch\("\/api\/orders", \{/);
  assert.match(html, /courseSlug: course\.slug/);
  assert.match(html, /paymentPlan: checkoutPlan\.id/);
  assert.match(html, /"zoom-kit-ebook-299"/);
});

test("Facebook Ads P0 rewrite sells the Data and AI system instead of a curriculum", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /Tự xây dựng và vận hành hệ thống <span class="accent">Facebook Ads 2026<\/span> bằng Data &amp; AI/);
  assert.match(html, /Từ Fanpage, tài nguyên, Content, quảng cáo, Dataset đến đọc số – tối ưu – scale/);
  assert.match(html, /Bao gồm AI Agent hỗ trợ nghiên cứu, lập kế hoạch và triển khai quảng cáo/);
  assert.match(html, /Quảng cáo là <span>tài sản tích lũy<\/span>/);
  assert.match(html, /Mỗi đồng ngân sách phải để lại dữ liệu cho lần chạy tiếp theo/);
  assert.doesNotMatch(html, /21 bài|Sáu module|Bài 1\b|Bài 2\b|id="lo-trinh"|legacy-curriculum|data-module-trigger/);
  assert.equal((html.match(/data-outcome-card=/g) || []).length, 12);
  assert.doesNotMatch(html, /90% tệp khách rác/);
  assert.doesNotMatch(html, /không dùng gallery|được trình bày theo năng lực.*thay vì tên video/i);
});

test("Facebook Ads P0 rewrite makes the AI Agent and support boundaries explicit", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /AI Agent hỗ trợ lập kế hoạch và trực tiếp dựng Campaign – Ad Set – Ads ở trạng thái PAUSED để bạn duyệt trước/);
  assert.match(html, /Gói 799\.000đ gồm khóa video, AI Agent và bộ công cụ triển khai/);
  assert.match(html, /Zoom 1:1 là dịch vụ riêng, không nằm trong gói 799\.000đ/);
  assert.doesNotMatch(html, /Hỗ trợ Zoom 1:1 trên chính vấn đề/);
  assert.doesNotMatch(html, /Tặng AI Agent hỗ trợ lên kế hoạch/);
});

test("Facebook Ads P0 rewrite places the value stack immediately before checkout", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const valueStack = html.match(/<section class="section value-stack-section"[\s\S]*?<\/section>/)?.[0] || "";
  const pricing = html.match(/<section id="hoc-phi"[\s\S]*?<\/section>/)?.[0] || "";
  const groupedClusters = valueStack.match(/class="[^"]*\bvalue-stack-cluster\b[^"]*"/g) || [];

  assertOrdered(html, ['id="gia-tri"', 'id="hoc-phi"']);
  assert.equal(groupedClusters.length, 2);
  assertOrdered(valueStack, [
    'class="value-stack-grid value-stack-cluster"',
    'class="value-stack-total value-stack-cluster"',
  ]);
  assert.match(html, /\.value-stack-clusters\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*20px/);
  assert.match(html, /\.value-stack-cluster\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?border:\s*1px solid/);
  assert.match(html, /\.value-stack-card\s*\{[\s\S]*?border:\s*0;[\s\S]*?border-radius:\s*0;[\s\S]*?background:\s*transparent/);
  assert.match(html, /\.value-stack-total p\s*\{[\s\S]*?border:\s*0;[\s\S]*?border-radius:\s*0;[\s\S]*?background:\s*transparent/);
  assert.match(html, /Facebook Ads Master 2026 — Giá trị 2\.999\.000đ/);
  assert.match(html, /AI Agent Facebook Ads — Giá trị 1\.999\.000đ/);
  assert.match(html, /Bộ Prompt \+ Checklist \+ Framework tối ưu — Giá trị 999\.000đ/);
  assert.match(html, /<del>Tổng giá trị:\s*<strong>5\.997\.000đ<\/strong><\/del>/);
  assert.match(html, /\.value-stack-total del\s*\{[\s\S]*?text-decoration-thickness:\s*2px/);
  assert.match(html, /Hôm nay bạn sở hữu toàn bộ với\s*<strong>799\.000đ<\/strong>/);
  assert.doesNotMatch(pricing, /Học phí &amp; đăng ký/);
  assert.doesNotMatch(pricing, /<h2>Hôm nay bạn sở hữu toàn bộ với 799\.000đ<\/h2>/);
  assert.match(pricing, /<form id="payment-form" class="form" data-invoice-checkout>/);
  assert.doesNotMatch(html, /giá gốc/i);
});

test("Facebook Ads direct-file checkout loads and submits the shared invoice fields", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /<script src="\.\.\/checkout-invoice\.js" defer><\/script>/);
  assert.match(html, /<form id="payment-form" class="form" data-invoice-checkout>/);
  assert.match(html, /invoice:\s*window\.getInvoiceRequest\(form\)/);
});

test("Facebook Ads landing keeps the three approved owner photos", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const approvedAssets = [
    "public/ladipage/assets/facebook-ads-kstudy-hybrid/hero-operator.webp",
    "public/ladipage/assets/facebook-ads-kstudy-hybrid/fragmented-handoffs.webp",
    "public/ladipage/assets/facebook-ads-kstudy-hybrid/role-marketing.webp",
  ];

  assert.match(html, /<section id="van-de"[\s\S]*?src="\.\.\/ladipage\/assets\/facebook-ads-kstudy-hybrid\/hero-operator\.webp"/);
  assert.match(html, /<section class="hybrid-section" id="ket-qua">[\s\S]*?src="\.\.\/ladipage\/assets\/facebook-ads-kstudy-hybrid\/fragmented-handoffs\.webp"/);
  assert.match(html, /<section class="hybrid-section is-cream" id="bo-cong-cu">[\s\S]*?src="\.\.\/ladipage\/assets\/facebook-ads-kstudy-hybrid\/role-marketing\.webp"/);
  assert.doesNotMatch(html, /pain-owner-ads-workspace\.webp|outcomes-dashboard-operator\.webp|method-ads-workflow\.webp/);

  for (const asset of approvedAssets) {
    assert.ok(fs.existsSync(path.resolve(asset)), `Missing approved owner photo: ${asset}`);
  }
});

test("Facebook Ads cream tools section and Zalo proof cards remain readable", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(
    html,
    /\.hybrid-section\.is-cream \.hybrid-copy h2\s*\{[\s\S]*?color:\s*#2d170f;[\s\S]*?text-shadow:\s*none;/
  );
  assert.match(html, /\.hybrid-section\.is-cream \.hybrid-copy > p\s*\{[\s\S]*?color:\s*#6b4938;/);
  assert.match(html, /\.hybrid-section\.is-cream \.section-kicker\s*\{[\s\S]*?color:\s*#b34116;/);
  assert.match(
    html,
    /\.hybrid-section\.is-cream \.learning-format-card\s*\{[\s\S]*?background:[\s\S]*?rgba\(255,\s*255,\s*255,\s*0\.62\)[\s\S]*?border-color:\s*rgba\(91,\s*48,\s*29,\s*0\.2\)/
  );
  assert.match(html, /\.hybrid-section\.is-cream \.learning-format-card h3\s*\{[\s\S]*?color:\s*#361c12;/);
  assert.match(html, /\.hybrid-section\.is-cream \.learning-format-card p\s*\{[\s\S]*?color:\s*#6b4938;/);
  assert.match(
    html,
    /\.proof-case-card img\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*auto;[\s\S]*?aspect-ratio:\s*auto;[\s\S]*?object-fit:\s*contain;/
  );
  assert.match(
    html,
    /@media \(max-width:\s*680px\)[\s\S]*?\.proof-case-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*min\(84vw,\s*320px\)\);[\s\S]*?scroll-snap-type:\s*x mandatory;/
  );
});

test("Facebook Ads mobile instructor portrait has no divider across the neck", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /\.curriculum-profile\s*\{[\s\S]*?border-top:\s*0;/);
});

test("Facebook Ads landing offers only the 799K AI Agent plan", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /data-plan-card="zoom-kit"/);
  assert.doesNotMatch(html, /data-plan-card="video"/);
  assert.doesNotMatch(html, /data-plan-select="video"/);
  assert.doesNotMatch(html, /data-plan-card="advanced-zoom"/);
  assert.match(html, /<input type="hidden" name="paymentPlan" value="zoom-kit" \/>/);
  assert.match(html, /var selectedPlan = plans\["zoom-kit"\]/);
  assert.match(html, /toàn bộ hệ thống Facebook Ads 799\.000đ/i);
  assert.match(html, /value: 799000/);
  assert.doesNotMatch(html, /399K|399\.000|399000/);

  const agentCard = cardFor(html, "zoom-kit");

  assert.match(agentCard, /is-selected/);
  assert.match(agentCard, /799K/);
  assert.match(agentCard, /AI Agent/);
  assert.match(agentCard, /Zoom 1:1 là dịch vụ riêng, không nằm trong gói 799\.000đ/);
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
  assert.match(html, /submitText: "Nhận toàn bộ hệ thống Facebook Ads – 799\.000đ"/);
  assert.doesNotMatch(html, /Thanh toán gói AI Agent - 799\.000đ/);
  assert.doesNotMatch(html, /\.zoom-addon/);
});

test("Facebook Ads form applies the Vietnam-Thailand 20% offer to the combo only", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const orderService = read("services/orderService.ts");

  assert.match(html, /<input id="ebook-addon" name="ebookAddon" type="checkbox" \/>/);
  assert.match(html, /Combo Ebook \+ Khóa học Facebook Ads/);
  assert.match(html, /878\.400đ/);
  assert.match(html, /<del>1\.098\.000đ<\/del>/);
  assert.match(html, /"zoom-kit-ebook-299":\s*\{[\s\S]*?amount:\s*1098000/);
  assert.match(html, /promotionPlanId/);
  assert.match(html, /amount:\s*878400/);
  assert.match(html, /Ưu đãi Việt Nam Thắng Thái Lan/);
  assert.match(html, /ebookAddon\.checked[\s\S]*plans\[promotionPlanId\][\s\S]*plans\["zoom-kit-ebook-299"\]/);
  assert.match(html, /ebookAddon\.addEventListener\("change", syncCheckoutState\)/);

  assert.match(orderService, /"zoom-kit-ebook-299":\s*\{[\s\S]*?amount:\s*1098000/);
  assert.match(orderService, /slug:\s*"facebook-ads-2026"[\s\S]*?price:\s*799000/);
  assert.match(orderService, /slug:\s*"ebook-facebook-ads-2026"[\s\S]*?price:\s*299000/);
  assert.match(orderService, /plan\.orderItems\.map\(\(item\) => item\.slug\)\.join\(","\)/);
  assert.match(orderService, /zoom-kit-ebook-vietnam-thang-thai-lan-20/);
  assert.match(orderService, /amount:\s*878400/);
  assert.match(orderService, /price:\s*639200/);
  assert.match(orderService, /price:\s*239200/);
  assert.match(orderService, /2026-08-26/);
  assert.match(orderService, /2026-08-31/);
  assert.match(orderService, /paymentPlan === VIETNAM_THANG_THAI_LAN_PROMOTION_PLAN/);
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

test("Facebook Ads sticky registration footer communicates the Vietnam-Thailand combo offer", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const stickyFooter = html.match(/<div class="sticky-cta"[\s\S]*?<\/div>\s*<div id="toast"/)?.[0] || "";

  assert.match(stickyFooter, /Ưu đãi Việt Nam thắng Thái Lan/i);
  assert.match(stickyFooter, /Combo Facebook Ads \+ Ebook giảm 20%/);
  assert.match(stickyFooter, /878\.400đ/);
  assert.match(stickyFooter, /31\/08/);
});

test("Facebook Ads mobile CTAs jump to registration and hide the sticky footer only across the pricing section", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /var pricingSection = document\.getElementById\("hoc-phi"\);/);
  assert.match(
    html,
    /cta\.addEventListener\("click", function \(event\) \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?jumpToPaymentFormOnMobile\(\);/
  );
  assert.match(html, /new IntersectionObserver\(function \(entries\)/);
  assert.match(html, /pricingObserver\.observe\(pricingSection\);/);
  assert.match(html, /stickyCta\.classList\.toggle\("is-form-section-visible", isVisible\);/);
  assert.match(
    html,
    /@media \(max-width:\s*820px\)[\s\S]*?\.sticky-cta\.is-form-section-visible\s*\{[\s\S]*?transform:\s*translateY\(calc\(100% \+ env\(safe-area-inset-bottom\)\)\);[\s\S]*?opacity:\s*0;[\s\S]*?pointer-events:\s*none;/
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

test("Facebook Ads P1 rewrite follows the final 12-section order and keeps five content-rich proofs", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const main = html.match(/<main>([\s\S]*?)<\/main>/)?.[1] || "";
  const sectionIds = [...main.matchAll(/<section[^>]+id="([^"]+)"/g)].map((match) => match[1]);
  const expectedAssets = [
    "facebook-ads-agent-demo.gif",
    "facebook-ads-agent-demo-poster.webp",
    "zalo-support/zalo-proof-01-agent-plan.webp",
    "zalo-support/zalo-proof-02-marketing-advice.webp",
    "zalo-support/zalo-proof-03-course-feedback.webp",
    "zalo-support/zalo-proof-10-agent-consultation.webp",
    "zalo-support/zalo-proof-12-support-schedule.webp",
  ];

  assert.deepEqual(sectionIds, [
    "dau-trang",
    "van-de",
    "tich-luy",
    "ket-qua",
    "agent-tu-dong-len-quang-cao",
    "feedback",
    "giang-vien",
    "bo-cong-cu",
    "gia-tri",
    "hoc-phi",
    "faq",
    "bat-dau",
  ]);
  assert.match(html, /Một câu lệnh\.\s*<span>Agent tự động lên toàn bộ quảng cáo\.<\/span>/);
  assert.match(html, /<source media="\(prefers-reduced-motion: reduce\)" srcset="\.\.\/ladipage\/assets\/facebook-ads-agent-demo-poster\.webp"/);
  assert.match(html, /<img[^>]+src="\.\.\/ladipage\/assets\/facebook-ads-agent-demo\.gif"[^>]+loading="lazy"[^>]+decoding="async"/);
  assert.doesNotMatch(html, /facebook-ads-agent-demo\.mp4/);
  assert.equal((html.match(/class="proof-case-card"/g) || []).length, 5);
  assert.doesNotMatch(main, /zalo-proof-(?:04|05|06|07|08|09|11)-/);

  for (const asset of expectedAssets) {
    assert.ok(fs.existsSync(path.resolve("public/ladipage/assets", asset)), `Missing asset: ${asset}`);
    assert.match(html, new RegExp(asset.replaceAll(".", "\\.")));
  }

  const gifSize = fs.statSync(path.resolve("public/ladipage/assets/facebook-ads-agent-demo.gif")).size;
  assert.ok(gifSize <= 12 * 1024 * 1024, `GIF is too large: ${gifSize} bytes`);
});

test("Facebook Ads P1 rewrite updates navigation, FAQs and the primary CTA", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const main = html.match(/<main>([\s\S]*?)<\/main>/)?.[1] || "";
  const menu = html.match(/<nav id="sticky-section-menu"[\s\S]*?<\/nav>/)?.[0] || "";
  const menuTargets = [...menu.matchAll(/<a href="([^"]+)">/g)].map((match) => match[1]);
  const primaryCtas = [...main.matchAll(/<a class="btn btn-primary"[^>]*data-cta>([^<]+)<\/a>/g)].map((match) => match[1]);

  assert.deepEqual(menuTargets, ["#van-de", "#tich-luy", "#ket-qua", "#agent-tu-dong-len-quang-cao", "#feedback", "#hoc-phi", "#faq"]);
  assert.ok(primaryCtas.length >= 5, "Expected primary CTA at key decision points");
  assert.ok(primaryCtas.every((label) => label === "Nhận toàn bộ hệ thống Facebook Ads – 799.000đ"));
  assert.match(main, /Tôi đã chạy Facebook Ads rồi thì khóa này còn phù hợp không\?/);
  assert.match(main, /Tôi có cần biết code để học không\?/);
  assert.match(main, /AI Agent có tự bật quảng cáo và tiêu tiền không\?/);
  assert.doesNotMatch(main, /Sau khóa này học tiếp gì\?/);
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

test("Facebook Ads legacy decorative portrait styles cannot block mobile interactions", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(
    html,
    /\.curriculum-portrait-cutout,[\s\S]*?\.curriculum-portrait-cutout img,[\s\S]*?\.curriculum-orbit\s*\{[\s\S]*?pointer-events:\s*none/
  );
});
