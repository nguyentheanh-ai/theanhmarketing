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
    'id="van-de"',
    'id="tich-luy"',
    'id="gioi-thieu"',
    'id="doi-tuong"',
    'id="ket-qua"',
    'id="phuong-phap"',
    'id="lo-trinh"',
    'id="san-pham-thuc-te"',
    'id="agent-tu-dong-len-quang-cao"',
    'id="hoc-phi"',
    'id="faq"',
  ];
  let previousIndex = -1;
  for (const anchor of orderedAnchors) {
    const currentIndex = source.indexOf(anchor);
    assert.ok(currentIndex > previousIndex, `${anchor} must follow the previous mapped section`);
    previousIndex = currentIndex;
  }
});

test("Facebook Ads consolidated annotations use Dataset industries formats and the approved profile", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const visibleSource = source.replace(/<section class="curriculum-section legacy-curriculum"[\s\S]*?<\/section>/, "");
  const industries = [
    "Thời trang",
    "Bán lẻ",
    "Bất động sản",
    "B2B",
    "Nội thất",
    "SPA / Thẩm mỹ viện",
    "Khóa học Online",
    "Sản phẩm số",
    "Affiliate",
  ];

  assert.match(source, /Phần lớn anh chị chủ doanh nghiệp mới chỉ chạy Facebook Ads ở mức cơ bản/);
  assert.match(source, /Quảng cáo là một hệ thống tích lũy/);
  assert.match(source, /Mỗi đồng tiền anh chị tiêu trên quảng cáo phải được tích lũy/);
  assert.match(source, /Khóa học Online qua video có sẵn/);
  assert.match(source, /1:1 trực tiếp tại HCM/);
  assert.match(source, /1 kèm 1 qua Zoom online/);
  assert.equal((source.match(/data-industry=/g) ?? []).length, 9);
  assert.equal((source.match(/class="industry-image"/g) ?? []).length, 9);
  for (const asset of [
    "industry-fashion.webp",
    "industry-retail.webp",
    "industry-real-estate.webp",
    "industry-b2b.webp",
    "industry-interior.webp",
    "industry-spa.webp",
    "industry-online-course.webp",
    "industry-digital-product.webp",
    "industry-affiliate.webp",
  ]) {
    assert.match(source, new RegExp(asset.replaceAll(".", "\\.")));
  }
  for (const industry of industries) assert.match(source, new RegExp(industry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(source, /Dataset Meta AI/);
  assert.match(source, /Kết nối Dataset AI/);
  assert.match(source, /Founder Greezhub Agency/);
  assert.match(source, /Triển khai hơn 10\.000 chiến dịch/);
  assert.match(source, /Chi tiêu hơn 40 tỷ tiền quảng cáo/);
  assert.match(source, /Đối tác chính thức của Meta/);
  assert.match(source, /Hỗ trợ Zoom 1:1 trên chính vấn đề của từng học viên gặp phải/);
  assert.match(source, /class="curriculum-portrait-cutout"/);
  assert.match(source, /data-profile-position="waist"/);
  assert.match(source, /--curriculum-portrait-zoom:/);
  assert.match(source, /--curriculum-profile-lift:/);
  assert.match(source, /margin:\s*var\(--curriculum-profile-lift\)/);
  assert.doesNotMatch(visibleSource, /Auto Inbox/i);
  assert.doesNotMatch(source, /id="co-che"|id="chuyen-gia"|id="minh-chung"|id="phu-hop"|id="vi-sao-the-anh"/);
  assert.doesNotMatch(source, /Facebook Ads<\/span> cho chủ doanh nghiệp: học như một/);
});

test("Facebook Ads curriculum groups the exact lesson titles into six unnumbered modules", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const curriculum = source.match(/<section[^>]+id="lo-trinh"[\s\S]*?<\/section>/)?.[0] ?? "";
  const exactTitles = [
    "Nền tảng Facebook Ads 2026 và tư duy phễu",
    "Thuật ngữ chuyên ngành trong Quảng Cáo Facebook",
    "Những sai lầm phổ biến khi chạy Quảng cáo Facebook",
    "Hướng dẫn mua VIA",
    "Tất tần tật về Fanpage Facebook P.1",
    "Tất tần tật về Fanpage Facebook P.2",
    "Hướng dẫn nhanh thiết kế Poster - Cover - Avatar Facebook",
    "Đăng bài trên Facebook",
    "Tại sao content lại quan trọng, các dạng content phổ biến",
    "Hướng dẫn nghiên cứu đối thủ, lập kế hoạch quảng cáo",
    "Tổng quan về quảng cáo Facebook",
    "Hướng dẫn quản trị tài khoản doanh nghiệp BM",
    "Hướng dẫn thêm thẻ thanh toán trên Facebook Ads",
    "Tất tần tật về Target trên Facebook Ads",
    "Thiết lập và đọc các chỉ số trên Facebook Ads",
    "Scale ngân sách quảng cáo",
    "Hướng dẫn lên quảng cáo tin nhắn",
    "Giới thiệu về Dataset",
    "Dataset - Bán hàng trực tiếp trên Business Suite",
    "Dataset - Bán hàng trên Pancake",
    "Dataset - Bán hàng thông qua website/landing page",
    "Cách loại trừ 90% tệp khách rác không mua hàng trên quảng cáo Facebook",
  ];

  assert.equal((curriculum.match(/class="course-module"/g) ?? []).length, 6);
  assert.equal((curriculum.match(/data-module-trigger/g) ?? []).length, 6);
  assert.doesNotMatch(curriculum, />\s*Bài\s+\d+/);
  for (const title of exactTitles) assert.match(curriculum, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Facebook Ads hybrid keeps real brand proof motion and checkout contracts", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");

  assert.match(source, /facebook-ads-kstudy-hero\/the-anh\.png/);
  assert.match(source, /Nguyễn Thế Anh/);
  assert.match(source, /CEO Greezhub Việt Nam/);
  assert.equal((source.match(/data-zalo-proof=/g) ?? []).length, 12);
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
  assert.equal((hero.match(/data-outcome-element=/g) ?? []).length, 4);
  assert.equal(new Set([...hero.matchAll(/data-outcome-element="([^"]+)"/g)].map((match) => match[1])).size, 4);
  assert.equal((hero.match(/data-facebook-float=/g) ?? []).length, 4);
  assert.match(source, /@keyframes\s+facebook-float/);
  assert.match(source, /\.course-portrait\s*\{[\s\S]*?scale\(/);
  assert.match(source, /mask-image:\s*linear-gradient\(to bottom,[\s\S]*?transparent/);
  assert.match(hero, /Trực tiếp hướng dẫn/i);
  assert.match(hero, /Hiểu cách Facebook Ads vận hành/);
  assert.match(hero, /Cách setup Dataset cho từng loại hình kinh doanh/);
  assert.doesNotMatch(hero, />Cài đặt tracking và dữ liệu</);
  assert.match(hero, /Đọc chỉ số và tối ưu quảng cáo/);
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
  assert.match(source, /href="#dau-trang">Đầu trang/);
  assert.match(source, /href="#lo-trinh">Nội dung khóa học/);
  assert.match(source, /href="#hoc-phi">Học phí &amp; đăng ký/);
  assert.match(source, /class="sticky-course-title">Facebook Ads Master 2026/);
  assert.match(source, /class="sticky-course-meta">Khóa học Online qua video <span[^>]*>•<\/span> <strong>799\.000đ<\/strong> <span[^>]*>•<\/span> Tặng AI Agent/);
  assert.match(source, /class="sticky-cta-label sticky-cta-label-desktop">Đăng ký ngay/);
  assert.match(source, /class="sticky-cta-label sticky-cta-label-mobile"><strong>ĐĂNG KÝ NGAY<\/strong><small>Nhận hỗ trợ đúng vấn đề đang gặp phải<\/small>/);
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
  assert.match(hero, /class="course-hero-copy course-hero-copy-mobile"[\s\S]*?Khóa học dành cho chủ doanh nghiệp/);
  assert.match(hero, /class="course-hero-actions-mobile"[\s\S]*?href="#hoc-phi"[^>]*>Đăng ký ngay – 799\.000đ/);
  assert.match(hero, /class="course-bonus-line-mobile"[\s\S]*?Tặng AI Agent hỗ trợ lên kế hoạch quảng cáo/);
  assert.match(source, /@media \(max-width: 1020px\)[\s\S]*?\.course-hero-mobile-details\s*\{[\s\S]*?display:\s*block/);
  assert.match(source, /@media \(max-width: 680px\)[\s\S]*?\.course-hero-mobile-details\s*\{[\s\S]*?padding:\s*28px 6px 52px/);
  assert.doesNotMatch(source, /\.course-hero-copy-mobile\s*\{[\s\S]{0,180}?margin-top:\s*-84px/);
});

test("Facebook Ads pain point four is about Dataset instead of auto messaging", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const painSection = source.match(/<section id="van-de"[\s\S]*?<\/section>/)?.[0] ?? "";
  const painFour = painSection.match(/<span class="number">4<\/span>[\s\S]*?<\/details>/)?.[0] ?? "";

  assert.match(painFour, /Không cài đặt Dataset đúng cho mô hình kinh doanh/);
  assert.match(painFour, /Meta AI/);
  assert.match(painFour, /sự kiện/);
  assert.doesNotMatch(painFour, /auto nhắn|phản hồi tự động|nuôi khách/i);
});

test("Facebook Ads landing images resolve in direct-file review and the academy HTTP route", () => {
  const source = read("public/ladipage/facebook-ads-2026.html");
  const localImageSources = [...source.matchAll(/<img[^>]+src="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((src) => !src.startsWith("https://"));

  assert.ok(localImageSources.length >= 20);
  assert.doesNotMatch(source, /<img[^>]+src="\/ladipage\/assets\//);
  assert.ok(localImageSources.every((src) => src.startsWith("../ladipage/assets/") || src.startsWith("../landing-assets/")));
});
