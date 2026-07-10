import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.resolve(relativePath));
}

test("Facebook ebook reader is a gated student route, not a public static reader", () => {
  assert.ok(exists("app/thu-vien/facebook-ads/page.tsx"));

  const page = read("app/thu-vien/facebook-ads/page.tsx");
  const access = read("lib/ebook/facebook-ebook-access.ts");
  const reader = read("components/ebook/facebook-ebook-reader.tsx");

  assert.match(page, /requireFacebookEbookAccess/);
  assert.match(page, /FacebookEbookReader/);
  assert.match(page, /FACEBOOK_EBOOK_COURSE_SLUG/);
  assert.match(page, /\/dang-nhap\?next=/);
  assert.doesNotMatch(page, /trialEndsAt|trialExpiresAt/);

  const constants = read("lib/ebook/facebook-ebook.ts");
  assert.match(constants, /FACEBOOK_EBOOK_COURSE_SLUG = "ebook-facebook-ads-2026"/);
  assert.doesNotMatch(constants, /FACEBOOK_EBOOK_TRIAL_MINUTES/);
  assert.doesNotMatch(access, /trialExpiresAt|user\.created_at|FACEBOOK_EBOOK_TRIAL_MINUTES/);
  assert.doesNotMatch(reader, /trialEndsAt|trialExpired|5 phút|\/academy\/ebook-facebook-ads-2026\?trial=expired/);
});

test("Facebook ebook page images are served through an entitlement-checked API", () => {
  assert.ok(exists("app/api/ebook/facebook-ads/page/route.ts"));

  const route = read("app/api/ebook/facebook-ads/page/route.ts");

  assert.match(route, /requireFacebookEbookAccess/);
  assert.match(route, /FACEBOOK_EBOOK_STORAGE_BUCKET/);
  assert.match(route, /storage\.from/);
  assert.match(route, /Cache-Control/);
  assert.doesNotMatch(route, /isTrial|trialImageHeaders|no-store/);
  assert.doesNotMatch(route, /public\/ebook-facebook-ads-2026/);
});

test("Facebook ebook PDF download is gated by access and policy acceptance", () => {
  assert.ok(exists("app/thu-vien/facebook-ads/pdf/page.tsx"));
  assert.ok(exists("app/api/ebook/facebook-ads/pdf/route.ts"));

  const constants = read("lib/ebook/facebook-ebook.ts");
  const page = read("app/thu-vien/facebook-ads/pdf/page.tsx");
  const route = read("app/api/ebook/facebook-ads/pdf/route.ts");
  const client = read("components/ebook/facebook-ebook-pdf-download.tsx");

  assert.match(constants, /FACEBOOK_EBOOK_PDF_HREF = "\/thu-vien\/facebook-ads\/pdf"/);
  assert.match(constants, /FACEBOOK_EBOOK_PDF_API_HREF = "\/api\/ebook\/facebook-ads\/pdf"/);
  assert.match(constants, /FACEBOOK_EBOOK_PDF_DEFAULT_BUCKET = "facebook-ads-ebook-downloads-2026"/);
  assert.match(constants, /FACEBOOK_EBOOK_PDF_OBJECT_PATH = "downloads\/facebook-ads-2026-full-ebook\.pdf"/);
  assert.match(page, /requireFacebookEbookAccess/);
  assert.match(page, /facebookEbookPolicy/);
  assert.match(page, /FacebookEbookPdfDownload/);
  assert.match(client, /format=json/);
  assert.match(client, /Đang tạo link tải PDF/);
  assert.match(client, /Tôi đã đọc, hiểu và đồng ý/);
  assert.match(route, /requireFacebookEbookAccess/);
  assert.match(route, /hasAcceptedTerms/);
  assert.match(route, /wantsJson/);
  assert.match(route, /createSignedUrl/);
  assert.match(route, /download:\s*FACEBOOK_EBOOK_PDF_FILE_NAME/);
});

test("dashboard opens the purchased Facebook ebook in the reader", () => {
  const dashboard = read("components/app/student-dashboard.tsx");

  assert.match(dashboard, /FACEBOOK_EBOOK_READER_HREF/);
  assert.match(dashboard, /FACEBOOK_EBOOK_PDF_HREF/);
  assert.match(dashboard, /course\.slug === FACEBOOK_EBOOK_COURSE_SLUG/);
  assert.match(dashboard, /Tải PDF/);
});

test("reader client searches only parts and topics and requests protected page images", () => {
  assert.ok(exists("components/ebook/facebook-ebook-reader.tsx"));

  const reader = read("components/ebook/facebook-ebook-reader.tsx");

  assert.match(reader, /\/api\/ebook\/facebook-ads\/page/);
  assert.match(reader, /topicPages/);
  assert.match(reader, /normalizeSearchText/);
  assert.doesNotMatch(reader, /Ebook PNG/);
  assert.doesNotMatch(reader, /search-index\.json/);
});

test("reader table of contents expands parts into clickable topic pages", () => {
  const reader = read("components/ebook/facebook-ebook-reader.tsx");
  const manifest = JSON.parse(read("data/facebook-ebook-manifest.json"));

  assert.match(reader, /expandedTocParts/);
  assert.match(reader, /Plus/);
  assert.match(reader, /Minus/);
  assert.match(reader, /onDoubleClick=\{\(\) => toggleTocPart\(part\.part\)\}/);
  assert.match(reader, /part\.topics\.map\(\(topic, index\) =>/);
  assert.match(reader, /const topicAbsolutePage = part\.topicPages\[index\] \|\| part\.startAbsolutePage/);
  assert.match(reader, /goToAbsolutePage\(topicAbsolutePage\)/);
  assert.match(reader, /Trang \{topicAbsolutePage\}/);

  for (const part of manifest.parts) {
    assert.ok(part.topics.length > 0, `Part ${part.part} should have topics`);
    assert.equal(part.topicPages.length, part.topics.length, `Part ${part.part} should map every topic to a page`);

    for (const topicPage of part.topicPages) {
      assert.ok(topicPage >= part.startAbsolutePage, `Part ${part.part} topic page ${topicPage} should not be before the part`);
      assert.ok(topicPage < part.startAbsolutePage + part.pageCount, `Part ${part.part} topic page ${topicPage} should stay inside the part`);
    }
  }
});

test("reader requires policy acceptance before showing the protected ebook", () => {
  const reader = read("components/ebook/facebook-ebook-reader.tsx");
  const policy = read("lib/ebook/facebook-ebook-policy.ts");

  assert.match(reader, /FACEBOOK_EBOOK_POLICY_STORAGE_KEY/);
  assert.match(reader, /showPolicyGate/);
  assert.match(reader, /localStorage\.getItem\(FACEBOOK_EBOOK_POLICY_STORAGE_KEY\)/);
  assert.match(reader, /Tôi đã đọc, hiểu và đồng ý/);
  assert.match(reader, /Chính sách miễn trừ trách nhiệm và chính sách bảo mật/);
  assert.match(policy, /Cập nhật lần cuối: 01\/07\/2026/);
  assert.match(policy, /Ebook “Tất tần tật về Facebook Ads 2026”/);
  assert.match(policy, /Quyền sở hữu nội dung ebook/);
  assert.match(policy, /Chính sách bảo mật thông tin/);
});

test("reader fullscreen mode lets the ebook image use the whole viewport", () => {
  const reader = read("components/ebook/facebook-ebook-reader.tsx");

  assert.match(reader, /isFullscreen/);
  assert.match(reader, /fullscreenchange/);
  assert.match(reader, /requestFullscreen\(\{ navigationUI: "hide" \}\)/);
  assert.match(reader, /zoom === 100 \? "100vw"/);
  assert.match(reader, /\`\$\{zoom\}vw\`/);
  assert.match(reader, /isFullscreen\s*\?\s*"none"/);
  assert.match(reader, /object-contain/);
});

test("reader preloads a buffered set of protected pages and prioritizes the visible page", () => {
  const reader = read("components/ebook/facebook-ebook-reader.tsx");
  const route = read("app/api/ebook/facebook-ads/page/route.ts");

  assert.match(reader, /preloadBufferedPages/);
  assert.match(reader, /preloadedImagesRef/);
  assert.match(reader, /new Image\(\)/);
  assert.match(reader, /\.decode\(\)/);
  assert.match(reader, /pageOffset <= 4/);
  assert.match(reader, /decoding="async"/);
  assert.match(reader, /fetchPriority="high"/);
  assert.match(route, /max-age=3600/);
  assert.match(route, /stale-while-revalidate=86400/);
});

test("reader prefetches table-of-contents targets before cross-part jumps", () => {
  const reader = read("components/ebook/facebook-ebook-reader.tsx");

  assert.match(reader, /preloadImageSrc/);
  assert.match(reader, /preloadTocTargets/);
  assert.match(reader, /requestIdleCallback/);
  assert.match(reader, /part\.startAbsolutePage/);
  assert.match(reader, /part\.topicPages/);
  assert.match(reader, /handleTocIntent/);
  assert.match(reader, /onPointerEnter=\{\(\) => handleTocIntent/);
  assert.match(reader, /onFocus=\{\(\) => handleTocIntent/);
  assert.match(reader, /onPointerEnter=\{\(\) => void preloadImageSrc\(getImageSrcFromAbsolute\(manifest, result\.absolutePage\)/);
});

test("reader decodes a jumped-to image before committing the visible part state", () => {
  const reader = read("components/ebook/facebook-ebook-reader.tsx");

  assert.match(reader, /pendingAbsolutePage/);
  assert.match(reader, /navigationRequestRef/);
  assert.match(reader, /setPendingAbsolutePage\(targetAbsolutePage\)/);
  assert.match(reader, /await preloadImageSrc\(getImageSrc\(part\.part, nextPage\)/);
  assert.match(reader, /navigationRequestRef\.current !== requestId/);
  assert.match(reader, /setCurrentPartNumber\(part\.part\)/);
  assert.match(reader, /setPendingAbsolutePage\(null\)/);
  assert.match(reader, /aria-live="polite"/);
});

test("reader keeps mouse wheel scrolling natural and keyboard page navigation active", () => {
  const reader = read("components/ebook/facebook-ebook-reader.tsx");

  assert.doesNotMatch(reader, /handleWheelZoom/);
  assert.doesNotMatch(reader, /onWheel=/);
  assert.doesNotMatch(reader, /event\.preventDefault\(\)/);
  assert.match(reader, /Math\.min\(130/);
  assert.match(reader, /Math\.max\(75/);
  assert.match(reader, /addEventListener\("keydown"/);
  assert.match(reader, /event\.key === "ArrowLeft"/);
  assert.match(reader, /event\.key === "ArrowRight"/);
});

test("reader expands the page when the sidebar table of contents is hidden", () => {
  const reader = read("components/ebook/facebook-ebook-reader.tsx");

  assert.match(reader, /isWideReadingMode/);
  assert.match(reader, /!isSidebarOpen && !isFullscreen/);
  assert.match(reader, /fit-content/);
  assert.match(reader, /calc\(100vh - 9rem\)/);
  assert.doesNotMatch(reader, /isWideReadingMode \? "none"/);
  assert.match(reader, /readingAreaPaddingClassName/);
});

test("reader fully collapses the desktop sidebar instead of leaving a blank rail", () => {
  const reader = read("components/ebook/facebook-ebook-reader.tsx");

  assert.match(reader, /lg:w-0/);
  assert.match(reader, /pointer-events-none/);
  assert.match(reader, /lg:border-transparent/);
  assert.match(reader, /lg:grid-cols-\[0_minmax\(0,1fr\)\]/);
});

test("private ebook asset sync is explicit and does not rely on public PNG URLs", () => {
  assert.ok(exists("scripts/sync-facebook-ebook-storage.mjs"));

  const script = read("scripts/sync-facebook-ebook-storage.mjs");

  assert.match(script, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(script, /facebook-ads-ebook-2026/);
  assert.match(script, /public:\s*false/);
  assert.doesNotMatch(script, /public\/ebook-facebook-ads-2026/);
});
