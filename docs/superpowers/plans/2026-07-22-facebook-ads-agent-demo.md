# Facebook Ads Agent Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fast auto-playing Agent demo GIF and a twelve-image Zalo support carousel to the Facebook Ads Master 2026 landing page without changing its single 799K offer or checkout flow.

**Architecture:** Keep the existing static landing architecture. Generate optimized public assets from immutable local sources, add one CSS-only proof section between `#san-pham-thuc-te` and `#lo-trinh`, and lock placement/content/assets with the existing Node contract test. Keep source and published HTML byte-identical.

**Tech Stack:** Static HTML/CSS, Node `node:test`, FFmpeg/WebP/GIF, Next.js public assets.

---

### Task 1: Add the failing landing contract

**Files:**
- Modify: `tests/facebook-ads-landing.test.mjs`

- [x] **Step 1: Add a focused test for the new proof area**

Add a test that reads `public/ladipage/facebook-ads-2026.html` and asserts:

```js
const outcomeIndex = html.indexOf('id="san-pham-thuc-te"');
const demoIndex = html.indexOf('id="agent-tu-dong-len-quang-cao"');
const curriculumIndex = html.indexOf('id="lo-trinh"');

assert.ok(outcomeIndex < demoIndex && demoIndex < curriculumIndex);
assert.match(html, /Một câu lệnh\. Agent tự động lên toàn bộ quảng cáo\./);
assert.match(html, /facebook-ads-agent-demo\.gif/);
assert.match(html, /prefers-reduced-motion: reduce/);
assert.equal((html.match(/data-zalo-proof=/g) || []).length, 12);
assert.match(html, /Không chỉ xem video\. Vướng ở đâu, được hỗ trợ triển khai ở đó\./);
```

Assert every one of the twelve expected WebP paths exists and the omitted operational screenshot name is absent from HTML.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests\facebook-ads-landing.test.mjs
```

Expected: the new test fails because the section and assets do not exist; the existing nine tests remain passing.

### Task 2: Generate the Agent demo and Zalo assets

**Files:**
- Create: `public/ladipage/assets/facebook-ads-agent-demo.gif`
- Create: `public/ladipage/assets/facebook-ads-agent-demo-poster.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-01-agent-plan.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-02-marketing-advice.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-03-course-feedback.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-04-call-34m09.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-05-call-55m50.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-06-calls-21m59-46m04.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-07-call-30m59.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-08-call-36m10.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-09-call-22m51.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-10-agent-consultation.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-11-call-23m59.webp`
- Create: `public/ladipage/assets/zalo-support/zalo-proof-12-support-schedule.webp`

- [x] **Step 1: Generate the GIF and poster**

Use FFmpeg with the immutable source `F:\Dataset final\0722 (6).mp4`. Generate a 960px, 8fps, palette-optimized looping GIF and a 1280px WebP poster from the final proof state. Do not overwrite the MP4.

- [x] **Step 2: Generate twelve 640px WebP Zalo assets**

Use the seven approved designed PNGs from `E:\Kinh doanh\outputs\zalo-call-highlights-2026-07-22` and five original JPGs from `C:\Users\12c1t\Downloads\ảnh zalo`. Exclude the original file ending in `a1814dc3cf3103050c99a5f65d909d65.jpg`.

- [x] **Step 3: Verify asset geometry and size**

Run FFprobe/ImageMagick/System.Drawing checks. Expected: one looping GIF no larger than 12 MB, one poster, exactly twelve WebPs, every WebP 640px wide, and no source file modified.

### Task 3: Implement the proof area

**Files:**
- Modify: `public/ladipage/facebook-ads-2026.html`
- Modify: `public/academy/facebook-ads-master-2026.html`

- [x] **Step 1: Add scoped CSS**

Add `agent-proof-*` and `zalo-proof-*` classes only. Use the approved graphite background, Be Vietnam Pro, warm accent, wide demo frame, three proof items and two identical twelve-card sequences for a continuous CSS marquee. Add pause-on-hover/focus and a reduced-motion static horizontal-scroll state.

- [x] **Step 2: Add the HTML between outcomes and curriculum**

Insert `id="agent-tu-dong-len-quang-cao"` after `#san-pham-thuc-te` and before `#lo-trinh`. Use a `<picture>` whose reduced-motion source is the poster and whose default `<img>` is the GIF. Render one accessible set of twelve Zalo proofs and one `aria-hidden="true"` duplicate set.

- [x] **Step 3: Synchronize published HTML**

Copy `public/ladipage/facebook-ads-2026.html` byte-for-byte to `public/academy/facebook-ads-master-2026.html`.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests\facebook-ads-landing.test.mjs
```

Expected: all focused tests pass, including source/published equality and the continued absence of the removed 399K offer.

### Task 4: Verify the complete change and update project knowledge

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

Run full Node tests, TypeScript, ESLint, build, diff check, the protected landing preflight and central workspace verification for `theanh-main` preview.

- [x] **Step 2: Run local browser QA**

Check desktop and 390px mobile layouts. Verify GIF auto-play/loop, readable media, twelve Zalo cards, no horizontal page overflow, reduced-motion fallback, and no page/console errors.

- [x] **Step 3: Update project and entrypoint docs**

Record exact files, asset facts, test totals and the not-yet-deployed status. Do not claim production until a guarded deployment and live smoke are performed.

- [x] **Step 4: Review the final diff**

Run:

```powershell
git diff --check
git status --short
git diff -- public/ladipage/facebook-ads-2026.html public/academy/facebook-ads-master-2026.html tests/facebook-ads-landing.test.mjs CURRENT_STATE.md FEATURE_MAP.md SESSION_LOG.md docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md
```

Expected: only approved landing, asset, test, spec/plan and documentation changes; no checkout, payment, email, tracking, CRM, LMS or database diff.
