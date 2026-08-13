# Facebook Ads Typography and Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm landing Facebook Ads Master 2026 có nhịp chữ gần WeSuccess và dễ đọc ở 320px/390px mà không đổi nội dung, commerce hoặc tracking.

**Architecture:** Giữ HTML tĩnh hiện có và thêm lớp CSS override cuối stylesheet để kiểm soát typography bằng cascade. `public/ladipage/facebook-ads-2026.html` là nguồn duy nhất; sau khi test đạt sẽ đồng bộ byte-identical sang route published.

**Tech Stack:** HTML/CSS/JavaScript tĩnh, Node test runner, Playwright/Chromium, Next.js.

---

### Task 1: Khóa contract typography bằng test

**Files:**
- Modify: `tests/facebook-ads-landing.test.mjs`
- Test: `tests/facebook-ads-landing.test.mjs`

- [ ] **Step 1: Viết test thất bại**

Thêm test:

```js
test("Facebook Ads landing uses the approved WeSuccess-inspired typography and mobile rhythm", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");

  assert.match(html, /--type-display-weight:\s*800/);
  assert.match(html, /--type-heading-tracking:\s*-0\.02em/);
  assert.match(html, /\.course-hero-title\s*\{[\s\S]*?font-size:\s*clamp\(44px,\s*4\.2vw,\s*60px\)[\s\S]*?line-height:\s*1\.16/);
  assert.match(html, /\.hybrid-section-head h2\s*\{[\s\S]*?font-size:\s*clamp\(36px,\s*3\.5vw,\s*48px\)/);
  assert.match(html, /@media \(max-width:\s*680px\)[\s\S]*?\.course-hero-title\s*\{[\s\S]*?font-size:\s*clamp\(30px,\s*8\.6vw,\s*34px\)[\s\S]*?line-height:\s*1\.2/);
  assert.match(html, /padding-bottom:\s*calc\(8px \+ env\(safe-area-inset-bottom\)\)/);
});
```

- [ ] **Step 2: Chạy RED**

Run: `/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/facebook-ads-landing.test.mjs`

Expected: FAIL vì chưa có token và rule typography mới.

- [ ] **Step 3: Commit test**

Run: `git add tests/facebook-ads-landing.test.mjs && git commit -m "test: guard Facebook Ads responsive typography"`

### Task 2: Áp dụng typography vào source

**Files:**
- Modify: `public/ladipage/facebook-ads-2026.html`
- Test: `tests/facebook-ads-landing.test.mjs`

- [ ] **Step 1: Thêm token vào `:root`**

```css
--type-display-weight: 800;
--type-heading-weight: 700;
--type-heading-tracking: -0.02em;
--type-body-leading: 1.6;
```

- [ ] **Step 2: Thêm override desktop cuối stylesheet**

```css
body {
  line-height: var(--type-body-leading);
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3,
.course-hero-title,
.hybrid-copy h2,
.hybrid-section-head h2,
.curriculum-heading h2,
.gold-title {
  font-weight: var(--type-display-weight);
  letter-spacing: var(--type-heading-tracking);
}

.btn, button, summary, label, strong,
.eyebrow, .section-kicker, .course-hero-label, .curriculum-kicker {
  font-weight: var(--type-display-weight);
}

.course-hero-title {
  max-width: 720px;
  font-size: clamp(44px, 4.2vw, 60px);
  line-height: 1.16;
}

h2 {
  font-size: clamp(34px, 3.4vw, 46px);
  line-height: 1.22;
}

.hybrid-section-head h2 {
  font-size: clamp(36px, 3.5vw, 48px);
  line-height: 1.2;
}

.hybrid-copy h2,
.curriculum-heading h2 {
  font-size: clamp(34px, 3.5vw, 46px);
  line-height: 1.2;
}
```

- [ ] **Step 3: Thêm override mobile**

```css
@media (max-width: 680px) {
  .container { width: min(calc(100% - 32px), 1160px); }
  .section, .hybrid-section { padding: 56px 0; }
  .course-hero { padding-top: 32px; }
  .course-hero-title {
    font-size: clamp(30px, 8.6vw, 34px);
    line-height: 1.2;
    letter-spacing: -0.015em;
  }
  h2,
  .hybrid-section-head h2,
  .hybrid-copy h2,
  .curriculum-heading h2 {
    font-size: clamp(26px, 7.5vw, 30px);
    line-height: 1.28;
    letter-spacing: -0.012em;
  }
  .hero-copy, .section-copy, .hybrid-copy > p,
  .hybrid-section-head p:last-child, .final-cta p {
    font-size: 16px;
    line-height: 1.62;
  }
  .plan-card, .price-card, .form-card, .learning-format-card { padding: 22px; }
  .sticky-cta {
    padding: 8px 8px 0;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
  }
}

@media (max-width: 360px) {
  .container { width: min(calc(100% - 24px), 1160px); }
  .course-hero-title { font-size: 29px; }
  .form-card, .plan-card, .price-card, .learning-format-card { padding: 18px; }
}
```

- [ ] **Step 4: Chạy test**

Run: `/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/facebook-ads-landing.test.mjs`

Expected: test typography pass; equality test còn fail cho tới khi sync published.

### Task 3: Đồng bộ published và QA

**Files:**
- Modify: `public/academy/facebook-ads-master-2026.html`
- Test: `tests/facebook-ads-landing.test.mjs`

- [ ] **Step 1: Sync cơ học source sang published**

Run: `cp public/ladipage/facebook-ads-2026.html public/academy/facebook-ads-master-2026.html`

- [ ] **Step 2: Chạy focused test**

Run: `/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/facebook-ads-landing.test.mjs`

Expected: toàn bộ focused test pass.

- [ ] **Step 3: Chạy Playwright tại 1440, 1020, 390 và 320px**

Kiểm tra `scrollWidth <= clientWidth`, H1 mobile 29–34px/weight 800/line-height >= 1.18, sticky CTA không che form. Mở một module, bật/tắt Ebook checkbox, mở/đóng mục lục và bấm CTA cuộn tới form; không submit form thật.

- [ ] **Step 4: Commit code**

Run: `git add public/ladipage/facebook-ads-2026.html public/academy/facebook-ads-master-2026.html tests/facebook-ads-landing.test.mjs && git commit -m "style: refine Facebook Ads typography on mobile"`

### Task 4: Full gate và handoff

**Files:**
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md` nếu contract cần lưu dài hạn
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/SESSION_STATE.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/FEATURE_REGISTRY.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/TASK_LOG.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/CHANGELOG.md`

- [ ] **Step 1: Chạy full verification**

Run lần lượt:

```bash
/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.mjs
/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm exec tsc --noEmit --pretty false
/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run lint
/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run build
git diff --check
```

Expected: tất cả đạt. Nếu có baseline failure, ghi đúng output và không gọi task hoàn tất.

- [ ] **Step 2: Cập nhật workspace docs**

Ghi app `main-site`, hai HTML đã đổi, test/viewport đã chạy, commerce/tracking không đổi và điểm còn cần verify. `FEATURE_REGISTRY.md` ghi contract typography mobile; `TASK_LOG.md` append-only; `CHANGELOG.md` thêm mục 2026-08-13.

- [ ] **Step 3: Commit handoff repo nếu có thay đổi**

Run: `git add docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md && git commit -m "docs: record Facebook Ads typography contract"`
