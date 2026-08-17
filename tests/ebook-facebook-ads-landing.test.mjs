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

test("Premium Ebook Facebook Ads landing is published on a clean academy URL", () => {
  const source = read("public/ladipage/ebook-facebook-ads-2026-premium.html");
  const published = read("public/academy/ebook-facebook-ads-2026-premium.html");
  const nextConfig = read("next.config.ts");
  const proxy = read("proxy.ts");

  assert.equal(published, source);
  assert.match(source, /<link rel="canonical" href="https:\/\/www\.theanhmarketing\.com\/academy\/ebook-facebook-ads-2026-premium">/);
  assert.match(source, /<meta property="og:url" content="https:\/\/www\.theanhmarketing\.com\/academy\/ebook-facebook-ads-2026-premium">/);
  assert.match(source, /https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.match(source, /fbq\("init", "1315653423712065"\)/);
  assert.match(source, /fbq\("track", "PageView"\)/);
  assert.match(source, /fbq\("track", "ViewContent", \{/);
  assert.match(source, /content_name:\s*"Ebook Facebook Ads 2026 Premium"/);
  assert.match(source, /content_ids:\s*\["ebook-facebook-ads-2026"\]/);
  assert.match(source, /content_type:\s*"product"/);
  assert.match(source, /currency:\s*"VND"/);
  assert.match(source, /value:\s*399000/);
  assert.match(source, /https:\/\/www\.facebook\.com\/tr\?id=1315653423712065&ev=PageView&noscript=1/);
  assert.match(source, /function getCookieValue\(name\)/);
  assert.match(source, /fbp:\s*getCookieValue\("_fbp"\)/);
  assert.match(source, /fbc:\s*getCookieValue\("_fbc"\) \|\| \(fbclid \? `fb\.1\.\$\{Math\.floor\(Date\.now\(\) \/ 1000\)\}\.\$\{fbclid\}` : ""\)/);
  assert.match(source, /landingPage:\s*"academy\/ebook-facebook-ads-2026-premium"/);
  assert.match(source, /function trackLead\(order, leadId, checkoutPlan\)/);
  assert.match(source, /window\.fbq\("track", "Lead", \{/);
  assert.match(source, /eventID:\s*leadId \|\| order\?\.orderCode/);
  assert.match(source, /const leadId = `web\.\$\{Date\.now\(\)\}\.\$\{Math\.random\(\)\.toString\(10\)\.slice\(2\)\}`/);
  assert.match(source, /leadId,/);
  assert.match(source, /trackLead\(result\.order, leadId, checkoutPlan\)/);
  assert.match(source, /href="\/doc-thu\/ebook-facebook-ads-2026"[^>]*data-event="sample_trial_reader_click"[^>]*>\u0110\u1ECDc th\u1EED Ebook<\/a>/);
  assert.doesNotMatch(source, /d\u00F9ng \u1EA3nh th\u1EADt t\u1EEB t\u00E0i li\u1EC7u|Cho kh\u00E1ch th\u1EA5y|Kh\u00E1ch c\u00F3 th\u1EC3 k\u00E9o ngang|kh\u00E1ch hay nghi ng\u1EDD|PNG ebook|kh\u00F4ng d\u00F9ng \u1EA3nh minh h\u1ECDa gi\u1EA3/i);
  assert.match(nextConfig, /source:\s*"\/academy\/ebook-facebook-ads-2026-premium\.html"[\s\S]*?destination:\s*"\/academy\/ebook-facebook-ads-2026-premium"/);
  assert.match(nextConfig, /source:\s*"\/academy\/ebook-facebook-ads-2026-premium"[\s\S]*?destination:\s*"\/academy\/ebook-facebook-ads-2026-premium\.html"/);
  assert.match(proxy, /pathname === "\/academy\/ebook-facebook-ads-2026-premium"/);
  assert.match(proxy, /pathname === "\/academy\/ebook-facebook-ads-2026-premium\.html"/);
  assert.match(source, /<script>document\.documentElement\.classList\.add\("js"\);<\/script>/);
  assert.match(source, /\.reveal\s*\{\s*opacity:\s*1;\s*transform:\s*none;/);
  assert.match(source, /\.js \.reveal\s*\{\s*opacity:\s*0;\s*transform:\s*translateY\(20px\);/);
  assert.match(source, /\.js \.reveal\.is-visible\s*\{\s*opacity:\s*1;\s*transform:\s*translateY\(0\);/);
  assert.doesNotMatch(source, /Ebook PNG|ladipage_ebook_assets/);

  for (const asset of [
    "book-mockup-facebook-ads-2026.png",
    "muc-luc-1.png",
    "muc-luc-2.png",
    "phan-1-1.png",
    "phan-3-1.png",
    "phan-6-1.png",
    "phan-6-20.png",
    "phan-7-1.png",
    "phan-9-1.png",
  ]) {
    assert.ok(
      fs.existsSync(path.resolve(`public/ebook-facebook-ads-2026-premium/${asset}`)),
      `Missing premium landing asset ${asset}`,
    );
  }
});

test("Premium Ebook landing uses the approved mobile-first hero and section navigation", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026-premium.html");
  const hero = html.match(/<header class="hero" id="top">[\s\S]*?<\/header>/)?.[0] ?? "";
  const menu = html.match(/<nav id="ebook-section-menu"[\s\S]*?<\/nav>/)?.[0] ?? "";
  const rail = html.match(/<nav class="section-progress-rail"[\s\S]*?<\/nav>/)?.[0] ?? "";

  assert.match(hero, /<nav class="nav" aria-label="Điều hướng chính">/);
  assert.match(html, /\.nav\s*\{[\s\S]*?position:\s*relative;/);
  assert.doesNotMatch(html, /\.nav\s*\{[\s\S]*?position:\s*sticky;/);
  assert.match(html, /<span class="brand-mark"><img src="\/brand\/ta-logo\.svg" alt="The Anh Marketing"><\/span>/);
  assert.doesNotMatch(html, /<span class="brand-mark">TA<\/span>/);
  const brandMarkCss = html.match(/\.brand-mark\s*\{[\s\S]*?\}/)?.[0] ?? "";
  assert.match(brandMarkCss, /border:\s*0;/);
  assert.match(brandMarkCss, /background:\s*transparent;/);
  assert.match(brandMarkCss, /box-shadow:\s*none;/);
  assert.match(html, /@media \(max-width:\s*980px\)[\s\S]*?\.hero-visual\s*\{[\s\S]*?order:\s*-1;/);
  assert.match(html, /@media \(max-width:\s*980px\)[\s\S]*?\.hero-copy\s*\{[\s\S]*?order:\s*1;/);
  assert.match(html, /@media \(max-width:\s*640px\)[\s\S]*?\.wrap\s*\{[\s\S]*?width:\s*min\(calc\(100% - 28px\), 520px\);/);

  assert.match(html, /data-section-menu-toggle/);
  assert.match(html, /aria-controls="ebook-section-menu"/);
  assert.equal((menu.match(/data-section-menu-link/g) || []).length, 6);
  assert.equal((rail.match(/data-section-progress-dot/g) || []).length, 6);
  const sectionMenu = [
    ["top", "Trang đầu"],
    ["problem", "Bạn có gặp vấn đề này?"],
    ["sample", "Đọc thử Ebook trước khi mua"],
    ["content", "Nội dung toàn bộ cuốn Ebook"],
    ["price", "Đăng ký và Ưu đãi"],
    ["faq", "Câu hỏi thường gặp"],
  ];
  for (const [anchor, label] of sectionMenu) {
    assert.match(menu, new RegExp(`href="#${anchor}"`));
    assert.ok(menu.includes(`>${label}</a>`));
    assert.match(rail, new RegExp(`href="#${anchor}"`));
    assert.ok(rail.includes(`aria-label="${label}"`));
  }
  assert.doesNotMatch(html, /id="inside"|href="#inside"|"inside"/);
  assert.match(html, /const ebookSectionTargets = \["top", "problem", "sample", "content", "price", "faq"\]/);
  assert.match(html, /new IntersectionObserver\(updateEbookSectionProgress/);
  assert.match(html, /aria-current/);
  assert.match(html, /@media \(max-width:\s*339px\)[\s\S]*?\.section-progress-rail\s*\{[\s\S]*?display:\s*none;/);

  assert.equal((html.match(/>Đọc thử Ebook<\/a>/g) || []).length, 3);
  assert.doesNotMatch(html, />Xem bên trong ebook<\/a>|>Mở bản đọc thử online<\/a>|>Đọc thử<\/a>/);
});

test("Premium Ebook checkout offers the Facebook Ads course for 699K in one server-known bundle", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026-premium.html");
  const orderService = read("services/orderService.ts");

  assert.match(html, /<input id="course-addon" name="courseAddon" type="checkbox" \/>/);
  assert.match(html, /Mua kèm khóa Facebook Ads Master 2026/);
  assert.match(html, /<del>799\.000đ<\/del>/);
  assert.match(html, /699\.000đ/);
  assert.match(html, /Tổng thanh toán 1\.098\.000đ/);
  assert.match(html, /const ebookOnlyPlan = \{[\s\S]*?paymentPlan:\s*"full-access-399"[\s\S]*?amount:\s*399000/);
  assert.match(html, /const ebookCourseBundlePlan = \{[\s\S]*?paymentPlan:\s*"full-access-399-course-699"[\s\S]*?amount:\s*1098000/);
  assert.match(html, /stickyText:\s*"Mua Ebook \+ khóa học - 1\.098\.000đ"/);
  assert.match(html, /courseAddon\.checked\s*\?\s*ebookCourseBundlePlan\s*:\s*ebookOnlyPlan/);
  assert.match(html, /courseAddon\.addEventListener\("change", syncCheckoutPlan\)/);
  assert.match(html, /if \(stickyBuy\) stickyBuy\.textContent = checkoutPlan\.stickyText/);
  assert.match(html, /courseSlug:\s*"ebook-facebook-ads-2026"[\s\S]*?paymentPlan:\s*checkoutPlan\.paymentPlan/);
  assert.match(html, /content_ids:\s*checkoutPlan\.contentIds/);
  assert.match(html, /value:\s*checkoutPlan\.amount/);

  assert.match(orderService, /"full-access-399-course-699":\s*\{[\s\S]*?amount:\s*1098000/);
  assert.match(orderService, /slug:\s*"ebook-facebook-ads-2026"[\s\S]*?price:\s*399000/);
  assert.match(orderService, /slug:\s*"facebook-ads-2026"[\s\S]*?price:\s*699000/);
});

test("Ebook Facebook Ads landing uses production purchase CTA copy", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /<span>Th\u01B0 vi\u1EC7n Facebook Ads 2026<\/span>/);
  assert.match(html, /<a href="#problem">V\u00EC sao c\u1EA7n<\/a>/);
  assert.match(html, /<a href="#ebook-showcase">M\u1EE5c l\u1EE5c 10 ph\u1EA7n<\/a>/);
  assert.match(html, /<a href="#preview">Xem Ch\u01B0\u01A1ng 1<\/a>/);
  assert.match(html, /<a href="#offer">M\u1EDF kh\u00F3a 399K<\/a>/);
  assert.match(html, /class="product-hero"/);
  assert.match(html, /class="product-book-hero" src="\/ebook-facebook-ads-2026\/ebook-product-hero\.png"/);
  assert.ok(fs.existsSync(path.resolve("public/ebook-facebook-ads-2026/ebook-product-hero.png")));
  assert.match(html, /class="hero-conversion"/);
  assert.match(html, /\u0110\u0103ng k\u00FD ngay - 399\.000\u0111/);
  assert.match(html, /Xem m\u1EE5c l\u1EE5c 10 ph\u1EA7n/);
  assert.match(html, /class="hero-metrics"/);
  assert.match(html, /<strong>10 ph\u1EA7n<\/strong>/);
  assert.match(html, /<strong>399K<\/strong>/);
  assert.match(html, /<strong>2026<\/strong>/);
  assert.doesNotMatch(html, /Outline Ebook/);
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
  assert.match(html, /class="section-note-card reveal"><span>C\u00E1ch b\u1EAFt \u0111\u1EA7u<\/span><p>Ch\u1ECDn t\u00ECnh hu\u1ED1ng g\u1EA7n nh\u1EA5t v\u1EDBi v\u1EA5n \u0111\u1EC1 \u0111ang g\u1EB7p/);
  assert.match(html, /M\u1EDF \u0111\u00FAng h\u01B0\u1EDBng d\u1EABn/);
  assert.match(html, /Bi\u1EBFt s\u1EEDa ch\u1ED7 n\u00E0o tr\u01B0\u1EDBc/);
  assert.match(html, /Khi \u0111ang ch\u1EA1y qu\u1EA3ng c\u00E1o th\u1EADt, \u0111i\u1EC1u quan tr\u1ECDng l\u00E0 t\u00ECm \u0111\u01B0\u1EE3c \u0111\u00FAng ph\u1EA7n/);
  assert.match(html, /class="section-note-card reveal"><span>G\u1EE3i \u00FD d\u00F9ng<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>\u0110i\u1EC3m kh\u00E1c bi\u1EC7t<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>Ch\u1ECDn t\u00ECnh hu\u1ED1ng<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>Ph\u00F9 h\u1EE3p<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>D\u00F9ng l\u00E2u d\u00E0i<\/span>/);
  assert.match(html, /class="section-note-card reveal"><span>C\u00E2u h\u1ECFi th\u01B0\u1EDDng g\u1EB7p<\/span>/);
  assert.match(html, /Xem Ch\u01B0\u01A1ng 1: Hi\u1EC3u v\u1EC1 Facebook Ads\./);
  assert.match(html, /Xem n\u1ED9i dung n\u1EC1n t\u1EA3ng tr\u01B0\u1EDBc khi m\u1EDF kh\u00F3a to\u00E0n b\u1ED9 th\u01B0 vi\u1EC7n/);
  assert.match(html, /\u0110\u0103ng k\u00FD mua quy\u1EC1n truy c\u1EADp ngay/);
  assert.doesNotMatch(html, /M\u1EDF Ch\u01B0\u01A1ng 1 nh\u01B0 \u0111ang \u0111\u1ECDc m\u1ED9t ebook th\u1EADt/);
  assert.doesNotMatch(html, /M\u1EDF Ch\u01B0\u01A1ng 1 ngay tr\u00EAn trang n\u00E0y/);
  assert.doesNotMatch(html, /<span class="eyebrow">Bonus<\/span>|T\u00E0i nguy\u00EAn d\u00F9ng khi ch\u1EA1y th\u1EADt|T\u00E0i nguy\u00EAn th\u1EF1c h\u00E0nh|Checklist tr\u01B0\u1EDBc khi ch\u1EA1y ads|Template testing 7 ng\u00E0y|M\u1EABu b\u00E1o c\u00E1o ng\u00E0y\/tu\u1EA7n\/th\u00E1ng/);
  assert.doesNotMatch(html, /\u0110\u1EB7t tr\u01B0\u01A1c|\u0111\u1EB7t tr\u01B0\u01A1c|\u0110\u1EB7t tr\u01B0\u1EDBc|\u0111\u1EB7t tr\u01B0\u1EDBc/);
  assert.doesNotMatch(html, /\u0111\u1ECDc th\u1EED|\u0110\u1ECDc th\u1EED|5 ph\u00FAt|trial=ebook/);
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
  assert.doesNotMatch(html, /<p>Anh\/ch\u1ECB kh\u00F4ng c\u1EA7n h\u1ECDc l\u1EA1i t\u1EEB \u0111\u1EA7u\. Ch\u1EC9 c\u1EA7n x\u00E1c \u0111\u1ECBnh v\u1EA5n \u0111\u1EC1 \u0111ang g\u1EB7p/);
  assert.doesNotMatch(html, /Lookup nhanh/);
  assert.doesNotMatch(html, /M\u1EE5c ti\u00EAu sai/);
  assert.doesNotMatch(html, /T\u1EC7p kh\u00F4ng r\u00F5/);
  assert.doesNotMatch(html, /\u0110\u1ECDc s\u1ED1 c\u1EA3m t\u00EDnh/);
  assert.doesNotMatch(html, /Xem b\u00EAn trong c\u00F3 g\u00EC/);
  assert.doesNotMatch(html, /Live th\u01B0 vi\u1EC7n th\u1EF1c h\u00E0nh/);
  assert.doesNotMatch(html, /Kh\u00F4ng thi\u1EBFu video\. Thi\u1EBFu b\u1EA3n \u0111\u1ED3 \u0111\u1EC3 bi\u1EBFt s\u1EEDa g\u00EC tr\u01B0\u1EDBc\./);
  assert.doesNotMatch(html, /ph\u1EA7n ki\u1EBFn th\u1EE9c theo t\u00ECnh hu\u1ED1ng ch\u1EA1y ads/);
});

test("Ebook Facebook Ads positioning cards have a clear section context", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /<span class="eyebrow">\u0110\u1ECBnh v\u1ECB r\u00F5<\/span>/);
  assert.match(html, /<h2>Kh\u00F4ng ph\u1EA3i m\u1EB9o\. Kh\u00F4ng ph\u1EA3i file t\u0129nh\.<\/h2>/);
  assert.match(html, /class="section-note-card reveal"><span>D\u00F9ng khi l\u00E0m th\u1EADt<\/span><p>Ph\u1EA7n n\u00E0y gi\u00FAp anh\/ch\u1ECB ph\u00E2n bi\u1EC7t th\u01B0 vi\u1EC7n/);
  assert.match(html, /<h3>Kh\u00F4ng b\u00E1n m\u1EB9o v\u1EB7t<\/h3>/);
  assert.match(html, /<h3>Kh\u00E1c video\/PDF<\/h3>/);
  assert.match(html, /<h3>D\u00F9ng \u0111\u1EC3 v\u1EADn h\u00E0nh<\/h3>/);
});

test("Ebook Facebook Ads landing has a pinned bottom purchase CTA", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /body \{[\s\S]*?padding-bottom:\s*92px;/);
  assert.match(html, /\.sticky-cta\s*\{/);
  assert.match(html, /position:\s*fixed;[\s\S]*?bottom:\s*0;/);
  assert.match(html, /<div class="sticky-cta" aria-label="\u0110\u0103ng k\u00FD mua th\u01B0 vi\u1EC7n Facebook Ads 2026">/);
  assert.match(html, /<strong>Th\u01B0 vi\u1EC7n ki\u1EBFn th\u1EE9c &amp; th\u1EF1c h\u00E0nh Facebook Ads<\/strong>/);
  assert.match(html, /<span class="sticky-cta-icon"><img src="\/brand\/ta-logo\.svg" alt="The Anh Marketing"><\/span>/);
  assert.doesNotMatch(html, /<span class="sticky-cta-icon">TA<\/span>/);
  assert.match(html, /\.sticky-cta-icon\s*\{[\s\S]*?display:\s*inline-grid;[\s\S]*?place-items:\s*center;[\s\S]*?line-height:\s*0;/);
  assert.match(html, /\.sticky-cta-icon img\s*\{[\s\S]*?width:\s*31px;[\s\S]*?height:\s*18px;[\s\S]*?transform:\s*translateY\(1px\);/);
  assert.match(html, /\.sticky-cta-icon img\s*\{\s*width:\s*28px;\s*height:\s*16px;\s*\}/);
  assert.doesNotMatch(html, /\.sticky-cta-icon img\s*\{[\s\S]*?height:\s*28px;/);
  assert.match(html, /\.sticky-cta-info > div > span\s*\{[\s\S]*?font-size:\s*13px;/);
  assert.doesNotMatch(html, /\.sticky-cta span\s*\{/);
  assert.match(html, /<b class="sticky-cta-original">799\.000\u0111<\/b>/);
  assert.match(html, /<b class="sticky-cta-price">399\.000\u0111<\/b>/);
  assert.match(html, /<a class="btn btn-gold" href="#offer">\u0110\u0103ng k\u00FD mua ngay \u2192<\/a>/);
});

test("Ebook Facebook Ads landing keeps chapter one preview on-page without five-minute trial signup", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");
  const published = read("public/academy/ebook-facebook-ads-2026.html");
  const registerForm = read("components/auth/register-form.tsx");
  const previewAssetCount = fs.readdirSync(path.resolve("public/ebook-facebook-ads-2026/phan-1")).filter((file) => file.endsWith(".png")).length;

  assert.match(html, /<section class="section preview-section" id="preview">/);
  assert.match(html, /<strong>Ch\u01B0\u01A1ng 1: Hi\u1EC3u v\u1EC1 Facebook Ads<\/strong>/);
  assert.match(html, /Xem n\u1ED9i dung n\u1EC1n t\u1EA3ng tr\u01B0\u1EDBc khi m\u1EDF kh\u00F3a to\u00E0n b\u1ED9 th\u01B0 vi\u1EC7n/);
  assert.match(html, /data-total-pages="37"/);
  assert.match(html, /Trang 01\/37/);
  assert.match(html, /currentPreviewPage = 1/);
  assert.match(html, /pageIndicator\.textContent = `Trang \$\{String\(currentPage\.page\)\.padStart\(2, "0"\)\}\/37`/);
  assert.equal(previewAssetCount, 37);
  assert.equal(published, html);
  assert.doesNotMatch(html, /trial=ebook|5 ph\u00FAt|\u0111\u1ECDc th\u1EED|\u0110\u1ECDc th\u1EED/);
  assert.doesNotMatch(registerForm, /trialMode|trial=ebook|FACEBOOK_EBOOK_READER_HREF/);
});

test("Ebook Facebook Ads order form buttons keep readable Vietnamese typography", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /\.form-actions \.btn\s*\{[\s\S]*?font-family:\s*"Be Vietnam Pro"/);
  assert.match(html, /\.form-actions \.btn\s*\{[\s\S]*?font-size:\s*15px;/);
  assert.match(html, /\.form-actions \.btn\s*\{[\s\S]*?line-height:\s*1\.25;/);
  assert.match(html, /\.form-actions \.btn\s*\{[\s\S]*?letter-spacing:\s*0;/);
  assert.match(html, /\.form-actions \.btn\s*\{[\s\S]*?white-space:\s*normal;/);
  assert.match(html, /<button class="btn btn-primary" type="submit">\u0110\u0103ng k\u00FD mua quy\u1EC1n truy c\u1EADp ngay<\/button>/);
  assert.doesNotMatch(html, /Nh\u1EAFn Zalo \u0111\u1EC3 truy c\u1EADp|href="https:\/\/zalo\.me\/0367928921"/);
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
  assert.match(html, /terms:\s*\["fanpage", "instagram", "messenger", "business suite"\]/);
  assert.match(html, /terms:\s*\["t\u00E0i kho\u1EA3n qu\u1EA3ng c\u00E1o c\u00E1 nh\u00E2n", "tkqc c\u00E1 nh\u00E2n"\]/);
  assert.match(html, /terms:\s*\["t\u00E0i kho\u1EA3n qu\u1EA3ng c\u00E1o doanh nghi\u1EC7p", "business manager"\]/);
  assert.match(html, /terms:\s*\["campaign", "ad set", "ad", "c\u1EA5u tr\u00FAc"\]/);
  assert.match(html, /terms:\s*\["hi\u1EC3u l\u1EA7m", "m\u1EDBi ch\u1EA1y", "sai l\u1EA7m"\]/);
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

  assert.match(html, /\/ebook-facebook-ads-2026\/phan-1\/\$\{currentPage\.page\}\.png/);
  assert.doesNotMatch(html, /Ebook PNG/);

  for (let page = 1; page <= 37; page += 1) {
    assert.ok(
      fs.existsSync(path.resolve(`public/ebook-facebook-ads-2026/phan-1/${page}.png`)),
      `Missing preview PNG page ${page}`,
    );
  }
});

test("Ebook Facebook Ads landing shows a buyer-facing table of contents without internal copy", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /<section class="section ebook-showcase-section" id="ebook-showcase">/);
  assert.match(html, /M\u1EE5c l\u1EE5c th\u01B0 vi\u1EC7n/);
  assert.match(html, /10 ph\u1EA7n \u0111\u1EC3 ki\u1EC3m so\u00E1t Facebook Ads t\u1EEB n\u1EC1n t\u1EA3ng \u0111\u1EBFn scale\./);
  assert.match(html, /class="ebook-toc-grid"/);
  assert.match(html, /class="ebook-toc-card reveal"/);
  assert.doesNotMatch(html, /class="ebook-showcase-grid"|class="ebook-shot reveal"/);
  assert.doesNotMatch(html, /Kh\u00F4ng ph\u1EA3i mockup|PNG th\u1EADt|\u1EA3nh th\u1EADt|n\u1ED9i dung \u0111\u00E3 s\u1EA3n xu\u1EA5t|folder|n\u1ED9i b\u1ED9/i);
  assert.match(html, /<h3>Hi\u1EC3u v\u1EC1 Facebook Ads<\/h3>/);
  assert.match(html, /<h3>M\u1EE5c ti\u00EAu v\u00E0 h\u00ECnh th\u1EE9c qu\u1EA3ng c\u00E1o<\/h3>/);
  assert.match(html, /<h3>Target v\u00E0 t\u1EC7p kh\u00E1ch h\u00E0ng<\/h3>/);
  assert.match(html, /<h3>Content v\u00E0 media qu\u1EA3ng c\u00E1o<\/h3>/);
  assert.match(html, /<h3>Th\u1EF1c h\u00E0nh t\u1EA1o qu\u1EA3ng c\u00E1o<\/h3>/);
  assert.match(html, /<h3>Pixel v\u00E0 CAPI<\/h3>/);
  assert.match(html, /<h3>\u0110\u1ECDc ch\u1EC9 s\u1ED1 v\u00E0 t\u1ED1i \u01B0u qu\u1EA3ng c\u00E1o<\/h3>/);
  assert.match(html, /<h3>Remarketing chuy\u00EAn s\u00E2u<\/h3>/);
  assert.match(html, /<h3>Testing, Optimize v\u00E0 Scale Up<\/h3>/);
  assert.match(html, /<h3>Ch\u00EDnh s\u00E1ch Facebook v\u00E0 h\u01B0\u1EDBng d\u1EABn r\u1EDDi r\u1EA1c<\/h3>/);
  assert.match(html, /Facebook Ads l\u00E0 g\u00EC v\u00E0 v\u00EC sao doanh nghi\u1EC7p c\u1EA7n ch\u1EA1y qu\u1EA3ng c\u00E1o/);
  assert.match(html, /C\u00E1ch t\u1ED1i \u01B0u sau 24 gi\u1EDD, 72 gi\u1EDD v\u00E0 7 ng\u00E0y/);
  assert.match(html, /Account Quality v\u00E0 quy tr\u00ECnh xin xem x\u00E9t l\u1EA1i/);
});

test("Ebook Facebook Ads landing submits to the existing payment order flow", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");

  assert.match(html, /slug:\s*"ebook-facebook-ads-2026"/);
  assert.match(html, /plan:\s*"full-access-399"/);
  assert.match(html, /amount:\s*399000/);
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
  assert.match(html, /value:\s*399000/);
  assert.match(html, /https:\/\/www\.facebook\.com\/tr\?id=1315653423712065&ev=PageView&noscript=1/);
});

test("Ebook Facebook Ads landing does not fire InitiateCheckout before checkout page", () => {
  const html = read("public/ladipage/ebook-facebook-ads-2026.html");
  const submitHandler = html.match(/form\.addEventListener\("submit", async \(event\) => \{([\s\S]*?)window\.location\.href = "\/thanh-toan\/" \+ encodeURIComponent\(payload\.order\.orderCode\);/);

  assert.ok(submitHandler, "Missing ebook payment form submit handler");
  assert.doesNotMatch(submitHandler[1], /InitiateCheckout/);
});

test("Ebook Facebook Ads payment plan is configured as a separate 399K product", () => {
  const courses = read("data/courses.ts");
  const orders = read("services/orderService.ts");
  const paymentPage = read("app/thanh-toan/[code]/page.tsx");
  const ordersRoute = read("app/api/orders/route.ts");
  const nextConfig = read("next.config.ts");
  const proxy = read("proxy.ts");

  assert.match(courses, /slug:\s*"ebook-facebook-ads-2026"/);
  assert.match(courses, /title:\s*"Thư viện kiến thức Facebook Ads 2026"/);
  assert.match(courses, /price:\s*"399\.000đ"/);
  assert.match(orders, /"ebook-facebook-ads-2026":\s*\{/);
  assert.match(orders, /"full-access-399":\s*\{[\s\S]*?amount:\s*399000/);
  assert.match(paymentPage, /function isFacebookAdsEbook2026/);
  assert.match(paymentPage, /productHref:\s*"\/academy\/ebook-facebook-ads-2026"/);
  assert.match(paymentPage, /currentPriceLabel:\s*"399\.000đ"/);
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
