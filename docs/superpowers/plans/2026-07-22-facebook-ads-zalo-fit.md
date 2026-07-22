# Facebook Ads Zalo Proof Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing 12-image Zalo proof carousel form a tightly aligned, lightly cropped portrait proof wall.

**Architecture:** Keep the landing self-contained in the existing static HTML. Use one fixed card aspect ratio close to the source screenshots, `object-fit: cover`, a 12px flex gap and a duplicated `aria-hidden` sequence for seamless movement. Keep all media in `public/ladipage/assets` and preserve byte-identical source/published HTML.

**Tech Stack:** Static HTML/CSS, Node test runner, FFmpeg/WebP, Next.js public assets.

---

### Task 1: Lock the fitted-card contract

**Files:**
- Modify: `tests/facebook-ads-landing.test.mjs`

- [x] **Step 1: Extend the existing Agent proof regression**

Add assertions to the existing `Facebook Ads landing shows the Agent demo and exactly 12 Zalo support proofs before curriculum` test:

```js
assert.match(html, /\.zalo-proof-sequence\s*\{[\s\S]*?gap:\s*12px/);
assert.match(html, /\.zalo-proof-card\s*\{[\s\S]*?width:\s*300px;[\s\S]*?aspect-ratio:\s*15\s*\/\s*32;[\s\S]*?overflow:\s*hidden/);
assert.match(html, /\.zalo-proof-card img\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*cover/);
assert.match(html, /@media \(max-width:\s*680px\)[\s\S]*?\.zalo-proof-card\s*\{[\s\S]*?width:\s*244px/);
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests\facebook-ads-landing.test.mjs
```

Expected: the Agent/Zalo regression fails because the section/assets and fitted-card CSS are absent from the current checked-out landing.

### Task 2: Verify the existing optimized proof media

**Files:**
- Verify: `public/ladipage/assets/facebook-ads-agent-demo.gif`
- Verify: `public/ladipage/assets/facebook-ads-agent-demo-poster.webp`
- Verify: `public/ladipage/assets/zalo-support/*.webp`

- [x] **Step 1: Verify the media contract**

Expected: the existing GIF is 960x490 and no larger than 12 MB; exactly 12 Zalo WebPs exist; every WebP is 640px wide. Do not regenerate or overwrite approved media.

### Task 3: Fit the existing proof cards

**Files:**
- Modify: `public/ladipage/facebook-ads-2026.html`
- Modify: `public/academy/facebook-ads-master-2026.html`

- [x] **Step 1: Refine the scoped Zalo CSS**

Keep the existing Agent demo styles and replace only the proof-card geometry with this fitted core:

```css
.zalo-proof-sequence {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.zalo-proof-card {
  flex: 0 0 auto;
  width: 300px;
  aspect-ratio: 15 / 32;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  background: #f3f4f6;
}

.zalo-proof-card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

@media (max-width: 680px) {
  .zalo-proof-card {
    width: 244px;
  }
}
```

The source ratio is approximately 640:1385; the 15:32 card crops about 1.5% vertically.

- [x] **Step 2: Preserve the approved Agent/Zalo HTML**

Confirm `#agent-tu-dong-len-quang-cao` remains after `#san-pham-thuc-te` and before `#lo-trinh`. Do not add, remove or reorder the approved Agent headline, GIF `<picture>`, result cards, Zalo copy or 12 proof screenshots.

- [x] **Step 3: Synchronize the published HTML**

Copy `public/ladipage/facebook-ads-2026.html` byte-for-byte to `public/academy/facebook-ads-master-2026.html`.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests\facebook-ads-landing.test.mjs
```

Expected: all focused tests pass, including 799K-only offer, exact 12 proofs, fitted-card CSS and source/published equality.

### Task 4: Verify and hand off

**Files:**
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify: `E:\Kinh doanh\docs\SESSION_STATE.md`
- Modify: `E:\Kinh doanh\docs\FEATURE_REGISTRY.md`
- Modify: `E:\Kinh doanh\docs\TASK_LOG.md`
- Modify: `E:\Kinh doanh\docs\CHANGELOG.md`

- [x] **Step 1: Run repository verification**

Run focused tests, full Node tests with `--test-concurrency=1`, TypeScript, ESLint, `git diff --check` and the Next production build.

- [x] **Step 2: Verify crop geometry without altering source media**

Create a temporary contact sheet under `E:\Kinh doanh\temp` using the rendered 15:32 crop, inspect it with `view_image`, and confirm the highlighted call durations remain visible on all seven designed screenshots.

- [x] **Step 3: Update project knowledge**

Record exact asset geometry, verification totals, local-ready status and that production is not deployed.

- [x] **Step 4: Review final scope**

Confirm the diff contains only the approved landing, proof assets, tests, spec/plan and documentation. Confirm no checkout, payment, email, tracking, CRM, LMS or database file changed.
