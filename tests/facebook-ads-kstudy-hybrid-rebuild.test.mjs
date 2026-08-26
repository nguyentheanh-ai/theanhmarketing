import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.resolve(root, relativePath), "utf8");
}

test("Facebook Ads active pair uses the approved hybrid section order", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const published = read("public/academy/facebook-ads-master-2026.html");

  assert.equal(source, published);
  assert.match(source, /<body[^>]+data-kstudy-hybrid="true"/);

  const orderedAnchors = [
    'id="dau-trang"',
    'id="van-de"',
    'id="tich-luy"',
    'id="ket-qua"',
    'id="agent-tu-dong-len-quang-cao"',
    'id="feedback"',
    'id="giang-vien"',
    'id="bo-cong-cu"',
    'id="gia-tri"',
    'id="hoc-phi"',
    'id="faq"',
    'id="bat-dau"',
  ];
  let previousIndex = -1;
  for (const anchor of orderedAnchors) {
    const currentIndex = source.indexOf(anchor);
    assert.ok(currentIndex > previousIndex, `${anchor} must follow the previous mapped section`);
    previousIndex = currentIndex;
  }
});

test("Facebook Ads system copy keeps the approved Data, AI, instructor and support contracts", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");

  assert.match(source, /Quảng cáo là <span>tài sản tích lũy<\/span>/);
  assert.match(source, /Mỗi đồng ngân sách phải để lại dữ liệu cho lần chạy tiếp theo/);
  assert.match(source, /Dataset/);
  assert.match(source, /Meta AI/);
  assert.match(source, /CEO Greezhub Việt Nam/);
  assert.match(source, /<strong>10\.000\+<\/strong>/);
  assert.match(source, /<strong>40 tỷ\+<\/strong>/);
  assert.match(source, /Gói 799\.000đ gồm khóa video, AI Agent và bộ công cụ triển khai/);
  assert.match(source, /Zoom 1:1 là dịch vụ riêng, không nằm trong gói 799\.000đ/);
  assert.doesNotMatch(source, /Hỗ trợ Zoom 1:1 trên chính vấn đề|21 bài|Sáu module|id="lo-trinh"/);
});

test("Facebook Ads replaces curriculum with twelve buyer outcomes", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const outcomes = source.match(/<section class="hybrid-section" id="ket-qua">[\s\S]*?<\/section>/)?.[0] ?? "";
  const exactOutcomes = [
    "Fanpage quảng cáo chuyên nghiệp",
    "Hệ thống tài nguyên quảng cáo an toàn",
    "Hệ thống Content có khả năng bán hàng",
    "Tự setup quảng cáo đúng cấu trúc",
    "Xây Dataset giúp quảng cáo ngày càng hiểu khách hàng",
    "Giảm khách rác – tăng tín hiệu chất lượng",
    "Biết chính xác quảng cáo đang lỗi ở đâu",
    "Cách tối ưu quảng cáo triệt để",
    "Biết khi nào tắt – giữ – sửa – tăng ngân sách",
    "Scale quảng cáo có nguyên tắc",
    "Framework test quảng cáo có hệ thống",
    "Khả năng tự vận hành Facebook Ads",
  ];

  assert.equal((outcomes.match(/data-outcome-card=/g) ?? []).length, 12);
  assert.doesNotMatch(source, /data-module-trigger|class="course-module"|>\s*Bài\s+\d+/);
  for (const title of exactOutcomes) assert.match(outcomes, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Facebook Ads hybrid keeps real brand proof motion and checkout contracts", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");

  assert.match(source, /facebook-ads-kstudy-hero\/the-anh\.png/);
  assert.match(source, /Nguyễn Thế Anh/);
  assert.match(source, /CEO Greezhub Việt Nam/);
  assert.equal((source.match(/class="proof-case-card"/g) ?? []).length, 5);
  assert.match(source, /zalo-proof-12-support-schedule\.webp/);
  assert.match(source, /facebook-ads-agent-demo\.gif/);
  assert.match(source, /1315653423712065/);
  assert.match(source, /value:\s*799000/);
  assert.match(source, /id="payment-form"/);
  assert.match(source, /name="paymentPlan" value="zoom-kit"/);
  assert.match(source, /zoom-kit-ebook-299/);
  assert.match(source, /ebook-facebook-ads-2026/);
  assert.match(source, /data-invoice-checkout/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(source, /META FISHING|LÊ QUỐC HƯNG|1[,.]399[,.]000|2[,.]379[,.]000/i);
});

test("Facebook Ads annotated hero keeps concise copy, unique card elements and face-safe decoration", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const hero = source.match(/<section class="course-hero"[\s\S]*?<\/section>/)?.[0] ?? "";
  const portraitIndex = hero.indexOf('class="course-portrait"');
  const mobileCopyIndex = hero.indexOf('class="course-hero-copy course-hero-copy-mobile"');
  const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

  assert.ok(portraitIndex >= 0);
  assert.ok(mobileCopyIndex > portraitIndex);
  assert.match(source, /\.course-hero-copy-mobile\s*\{[\s\S]*?display:\s*block\s*!important/);
  assert.doesNotMatch(hero, /class="course-hero-promise"/);
  assert.doesNotMatch(hero, /Anh sẽ hướng dẫn bạn từ cách chuẩn bị nội dung/);
  const pillarNumbers = [...hero.matchAll(/class="course-outcome-element"[^>]*>(\d{2})<\/span>/g)].map((match) => match[1]);
  assert.deepEqual(pillarNumbers, ["01", "02", "03", "04"]);
  assert.equal((hero.match(/data-facebook-float=/g) ?? []).length, 4);
  assert.match(source, /@keyframes\s+facebook-float/);
  assert.match(source, /\.course-portrait\s*\{[\s\S]*?scale\(/);
  assert.match(source, /mask-image:\s*linear-gradient\(to bottom,[\s\S]*?transparent/);
  assert.match(hero, /Trực tiếp hướng dẫn/i);
  assert.match(hero, /Tự xây dựng và vận hành hệ thống/);
  assert.match(hero, /Dataset đến đọc số – tối ưu – scale/);
  assert.doesNotMatch(hero, />Cài đặt tracking và dữ liệu</);
  assert.match(hero, /Tự đọc số &amp; tối ưu/);
  assert.deepEqual(duplicateIds, []);
});

test("Facebook Ads hero uses a layered Kstudy-inspired depth scene instead of flat icon squares", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const hero = source.match(/<section class="course-hero"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(hero, /data-hero-scene="layered"/);
  assert.match(hero, /class="hero-scene-grid"/);
  assert.equal((hero.match(/class="hero-orbit-ring/g) ?? []).length, 3);
  assert.ok((hero.match(/class="hero-orbit-node/g) ?? []).length >= 6);
  assert.equal((hero.match(/class="facebook-float facebook-float-3d/g) ?? []).length, 4);
  assert.equal((hero.match(/class="facebook-float-depth/g) ?? []).length, 2);
  assert.match(source, /\.facebook-float-3d::before\s*\{[\s\S]*?translate3d/);
  assert.match(source, /\.facebook-float-3d::after\s*\{[\s\S]*?linear-gradient/);
  assert.match(source, /\.hero-scene-grid\s*\{[\s\S]*?perspective/);
  assert.match(source, /@keyframes\s+hero-orbit-drift/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hero-scene/);
});

test("Facebook Ads landing uses a course-specific desktop sticky and one concise mobile CTA", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");

  assert.doesNotMatch(source, /<header class="topbar"/);
  assert.match(source, /class="sticky-cta"[^>]+data-sticky-layout="responsive-course"/);
  assert.match(source, /data-sticky-menu-toggle[^>]+aria-expanded="false"[^>]+aria-controls="sticky-section-menu"[^>]+aria-label="Mở mục lục"/);
  assert.doesNotMatch(source, /data-sticky-close|aria-label="Đóng thanh đăng ký"/);
  assert.match(source, /id="sticky-section-menu"[^>]+class="sticky-section-menu"[^>]+hidden/);
  assert.match(source, /class="sticky-menu-open-icon"[\s\S]*?<svg/);
  assert.match(source, /class="sticky-menu-close-icon"[^>]*>×/);
  assert.match(source, /href="#van-de">Vấn đề/);
  assert.match(source, /href="#ket-qua">Bạn sẽ làm được gì/);
  assert.match(source, /href="#hoc-phi">Học phí/);
  assert.match(source, /class="sticky-course-title">Facebook Ads Master 2026/);
  assert.match(source, /class="sticky-course-meta">Khóa video \+ AI Agent \+ bộ công cụ <span[^>]*>•<\/span> <strong>799\.000đ<\/strong>/);
  assert.match(source, /class="sticky-cta-label sticky-cta-label-desktop">Nhận toàn bộ hệ thống – 799\.000đ/);
  assert.match(source, /class="sticky-cta-label sticky-cta-label-mobile"><strong>NHẬN TOÀN BỘ HỆ THỐNG<\/strong><small>Facebook Ads \+ AI Agent · 799\.000đ<\/small>/);
  assert.match(source, /\.sticky-cta-inner\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) minmax\(250px, 320px\) 48px/);
  assert.match(source, /@media \(max-width: 680px\)[\s\S]*?\.sticky-cta-inner\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) 46px/);
  assert.match(source, /@media \(max-width: 680px\)[\s\S]*?\.sticky-course-summary\s*\{[\s\S]*?display:\s*none/);
  assert.match(source, /@media \(max-width: 680px\)[\s\S]*?\.sticky-cta-label-desktop\s*\{[\s\S]*?display:\s*none/);
  assert.match(source, /@media \(max-width: 680px\)[\s\S]*?\.sticky-cta-label-mobile\s*\{[\s\S]*?display:\s*flex[\s\S]*?flex-direction:\s*column/);
  assert.match(source, /@media \(max-width: 680px\)[\s\S]*?\.sticky-cta-label-mobile strong\s*\{[\s\S]*?font-size:\s*16px/);
  assert.match(source, /@media \(max-width: 680px\)[\s\S]*?\.sticky-cta-label-mobile small\s*\{[\s\S]*?font-size:\s*10px/);
  assert.match(source, /\.sticky-cta\.is-menu-open[\s\S]*?\.sticky-menu-open-icon\s*\{[\s\S]*?display:\s*none/);
  assert.match(source, /\.sticky-cta\.is-menu-open[\s\S]*?\.sticky-menu-close-icon\s*\{[\s\S]*?display:\s*block/);
  assert.match(source, /function setStickyMenuOpen\(open\)/);
  assert.match(source, /stickyMenuToggle\.setAttribute\("aria-expanded", String\(open\)\)/);
  assert.match(source, /stickyMenu\.hidden = !open/);
});

test("Facebook Ads phone hero expands below the portrait for the short description and registration", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const hero = source.match(/<section class="course-hero"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(hero, /class="course-hero-mobile-details"/);
  assert.match(hero, /class="course-hero-copy course-hero-copy-mobile"[\s\S]*?Dataset đến đọc số – tối ưu – scale/);
  assert.match(hero, /class="course-hero-actions-mobile"[\s\S]*?href="#hoc-phi"[^>]*>Nhận toàn bộ hệ thống Facebook Ads – 799\.000đ/);
  assert.match(hero, /class="course-bonus-line-mobile"[\s\S]*?Bao gồm AI Agent hỗ trợ nghiên cứu, lập kế hoạch và triển khai quảng cáo/);
  assert.match(source, /@media \(max-width: 1020px\)[\s\S]*?\.course-hero-mobile-details\s*\{[\s\S]*?display:\s*block/);
  assert.match(source, /@media \(max-width: 680px\)[\s\S]*?\.course-hero-mobile-details\s*\{[\s\S]*?padding:\s*28px 6px 52px/);
  assert.doesNotMatch(source, /\.course-hero-copy-mobile\s*\{[\s\S]{0,180}?margin-top:\s*-84px/);
});

test("Facebook Ads pain section keeps exactly three system-level problems", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const painSection = source.match(/<section id="van-de"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.equal((painSection.match(/class="panel"/g) ?? []).length, 3);
  assert.match(painSection, /Không tạo đơn ổn định/);
  assert.match(painSection, /Có lead nhưng sai khách/);
  assert.match(painSection, /Có số nhưng không biết tối ưu/);
  assert.match(painSection, /Dữ liệu chưa sạch/);
  assert.doesNotMatch(painSection, /auto nhắn|phản hồi tự động|nuôi khách/i);
});

test("Facebook Ads landing images resolve in direct-file review and the academy HTTP route", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const localImageSources = [...source.matchAll(/<img[^>]+src="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((src) => !src.startsWith("https://"));

  assert.ok(localImageSources.length >= 10);
  assert.doesNotMatch(source, /<img[^>]+src="\/ladipage\/assets\//);
  assert.ok(localImageSources.every((src) => src.startsWith("../ladipage/assets/") || src.startsWith("../landing-assets/")));
});
