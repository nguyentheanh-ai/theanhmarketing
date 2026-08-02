# AI Master X10 and AI Agent Kit Landing/Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI Master X10 and AI Agent Kit complete local sales journeys at exactly 990.000đ, remove the redundant Home nav item, and replace their catalog covers with landing-derived banners.

**Architecture:** Keep each real landing implementation instead of rebuilding a shared template: static source/published HTML for AI Master and the existing Next.js React landing for Agent Kit. Lock price at the server/API boundary and at every visible/tracking surface, then update only the two course thumbnail references to new versioned assets.

**Tech Stack:** Next.js App Router, React/TypeScript, static HTML/CSS/JavaScript LadiPage assets, Node test runner, built-in image generation, WebP assets.

---

### Task 1: Use the logo as Home and restore the AI Master clean route

**Files:**
- Modify: `data/site.ts`
- Modify: `next.config.ts`
- Modify: `proxy.ts`
- Modify: `tests/simple-public-services.test.mjs`
- Modify: `tests/ai-master-landing.test.mjs`

- [ ] **Step 1: Write failing navigation and route tests**

Update the tests to require no `Trang chủ` entry in `mainNav`, retain `href="/"` in `components/site/header.tsx`, require a clean AI Master rewrite, and reject the disabled-route branch:

```js
assert.doesNotMatch(siteData, /label:\s*"Trang chủ"/);
assert.match(header, /<Link href="\/"/);
assert.match(nextConfig, /source:\s*"\/academy\/ai-master-x10-hieu-suat"/);
assert.match(nextConfig, /destination:\s*"\/academy\/ai-master-x10-hieu-suat\.html"/);
assert.doesNotMatch(proxy, /isDisabledAcademyRoute/);
```

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```bash
node --test tests/simple-public-services.test.mjs tests/ai-master-landing.test.mjs
```

Expected: failures for the still-present Home nav item and disabled/missing AI Master route.

- [ ] **Step 3: Implement the minimal route/navigation change**

- Remove `{ label: "Trang chủ", href: "/" }` from `mainNav`.
- Add this rewrite in `next.config.ts`:

```ts
{
  source: "/academy/ai-master-x10-hieu-suat",
  destination: "/academy/ai-master-x10-hieu-suat.html",
},
```

- Delete `isDisabledAcademyRoute` and its 404 response branch from `proxy.ts`.
- Do not modify the existing brand `<Link href="/">`.

- [ ] **Step 4: Run focused tests and observe GREEN**

Run the same focused command. Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add data/site.ts next.config.ts proxy.ts tests/simple-public-services.test.mjs tests/ai-master-landing.test.mjs
git commit -m "fix: restore AI Master landing route"
```

### Task 2: Lock both AI product prices at 990.000đ

**Files:**
- Modify: `public/ladipage/ai-master-x10-hieu-suat.html`
- Modify: `public/academy/ai-master-x10-hieu-suat.html`
- Modify: `app/khoa-hoc/bo-kit-agent-doanh-nghiep/agent-kit-checkout-form.tsx`
- Modify: `app/khoa-hoc/bo-kit-agent-doanh-nghiep/page.tsx`
- Modify: `services/orderService.ts`
- Modify: `tests/ai-master-landing.test.mjs`
- Modify: `tests/agent-kit-private-landing.test.mjs`

- [ ] **Step 1: Write failing price contract tests**

Require both pages and their tracking/server packages to use `990000`, require full visible `990.000đ`, and reject the old current prices and payment-plan key:

```js
assert.match(aiMasterHtml, /990000/);
assert.match(aiMasterHtml, /990\.000đ/);
assert.doesNotMatch(aiMasterHtml, /1299000|1\.299\.000đ/);
assert.match(checkoutForm, /agent-kit-standard-990/);
assert.match(checkoutForm, /990000/);
assert.match(checkoutForm, /990\.000đ/);
assert.match(orderService, /"agent-kit-standard-990"[\s\S]*amount:\s*990000/);
assert.doesNotMatch(checkoutForm, /359K|359000/);
```

- [ ] **Step 2: Run focused tests and observe RED**

```bash
node --test tests/ai-master-landing.test.mjs tests/agent-kit-private-landing.test.mjs
```

Expected: failures on `1299000`, `1.299.000đ`, `359K`, `359000` and `agent-kit-ads-359`.

- [ ] **Step 3: Update AI Master source and published copy**

Change current-price text, the Meta ViewContent value, the `course.amount` value and order/tracking payload value to `990000`; keep the truthful crossed-out old price if present. Synchronize with:

```bash
cp public/ladipage/ai-master-x10-hieu-suat.html public/academy/ai-master-x10-hieu-suat.html
```

- [ ] **Step 4: Update Agent Kit visible, tracking and server package values**

- Rename the plan constant to `agent-kit-standard-990`.
- Display `990.000đ` and change the submit copy to `Thanh toán 990.000đ ngay`.
- Change both marketing event values to `990000`.
- Change the server plan title to `Bộ Agent Kit X10 hiệu suất công việc` and amount to `990000`.
- Update the landing's `359K` stats/offer copy to `990.000đ` without changing its product promise.

- [ ] **Step 5: Run focused tests and observe GREEN**

Run the same focused test command. Expected: all tests pass and source/published AI Master HTML is byte-identical.

- [ ] **Step 6: Commit**

```bash
git add public/ladipage/ai-master-x10-hieu-suat.html public/academy/ai-master-x10-hieu-suat.html app/khoa-hoc/bo-kit-agent-doanh-nghiep services/orderService.ts tests/ai-master-landing.test.mjs tests/agent-kit-private-landing.test.mjs
git commit -m "fix: align AI product checkout prices"
```

### Task 3: Generate and integrate two landing-derived course banners

**Files:**
- Create: `public/course-thumbnails/ai-master-x10-hieu-suat-v3.webp`
- Create: `public/course-thumbnails/bo-agent-kit-x10-hieu-suat-cong-viec-v3.webp`
- Modify: `data/courses.ts`
- Modify: `tests/noti-style-course-catalog.test.mjs`

- [ ] **Step 1: Write the failing asset-reference test**

Require the two course records to reference their `-v3.webp` assets and confirm the six coming-soon records remain unchanged/non-live.

- [ ] **Step 2: Run the catalog test and observe RED**

```bash
node --test tests/noti-style-course-catalog.test.mjs
```

Expected: failure because both records still reference `-v2.webp`.

- [ ] **Step 3: Generate one background for each product with the built-in image tool**

Use two separate built-in image-generation calls.

AI Master prompt:

```text
Use case: ads-marketing
Asset type: square course catalog banner
Primary request: premium luminous AI knowledge-business workspace inspired by the existing AI Master X10 landing page
Subject: connected AI workspace, knowledge cards, content, landing page and CRM outputs, one clear central X10 energy motif
Style: polished 3D editorial product visual
Palette: bright cobalt, cyan and violet on a white/light-blue luminous background
Composition: square, generous safe area for exact Vietnamese title overlay
Constraints: no logo, no text, no watermark, no black or gray headline blocks, no proof claims
```

Agent Kit prompt:

```text
Use case: ads-marketing
Asset type: square course catalog banner
Primary request: organized AI Agent business operating hub inspired by the existing Agent Kit landing page
Subject: connected role-based agent nodes, command cards and repeatable workflow lanes around one central operating hub
Style: polished 3D editorial product visual
Palette: electric blue, cyan and purple on a white/light-blue luminous background
Composition: square, generous safe area for exact Vietnamese title overlay
Constraints: no logo, no text, no watermark, no black or gray headline blocks, no proof claims
```

- [ ] **Step 4: Validate and add exact title typography**

Inspect each generated background. Add deterministic Vietnamese titles in the same rounded display family used by the validated v2 course banners:

- `AI Master X10 hiệu suất` / `Biến tri thức thành tiền`.
- `Bộ Agent Kit X10 hiệu suất công việc` / `AI Agent cho Marketing và vận hành`.

Export optimized square WebP files at the exact paths listed above. Headline copy must be cobalt/cyan/violet, not black or gray.

- [ ] **Step 5: Update only the two course thumbnail references**

Replace the two `-v2.webp` paths with their `-v3.webp` siblings. Do not edit course slugs, landing URLs, prices or status.

- [ ] **Step 6: Run the catalog test and inspect both images**

```bash
node --test tests/noti-style-course-catalog.test.mjs
```

Expected: pass. Open both files with the local image viewer and confirm 1:1 aspect ratio, exact accents and no cropped text.

- [ ] **Step 7: Commit**

```bash
git add public/course-thumbnails/*-v3.webp data/courses.ts tests/noti-style-course-catalog.test.mjs
git commit -m "feat: align AI course banners with landing visuals"
```

### Task 4: Full verification, documentation and local handoff

**Files:**
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/SESSION_STATE.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/FEATURE_REGISTRY.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/TASK_LOG.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/CHANGELOG.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/DECISIONS.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/PAYMENT-FLOW.md`

- [ ] **Step 1: Run all automated checks**

```bash
node --test tests/*.test.mjs
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
./node_modules/.bin/next build
git diff --check
```

Expected: all tests/typecheck/build pass; ESLint has zero errors (the known unrelated warning may remain).

- [ ] **Step 2: Browser QA without submitting forms**

Verify:

- `/` brand/logo links to `/` and `Trang chủ` is absent from nav.
- `/khoa-hoc` shows both v3 banners and all six coming-soon cards remain non-clickable.
- `/academy/ai-master-x10-hieu-suat` returns 200, shows `990.000đ`, correct assets and no horizontal overflow.
- `/academy/bo-kit-agent-doanh-nghiep` returns 200, shows `990.000đ`, correct form/CTA and no horizontal overflow.
- No browser error log; no form submission or order creation.

- [ ] **Step 3: Update required project/workspace records**

Record local-only route, price, banner, test/build and no-production-mutation results in all listed docs. Add a payment contract note that both products use a fixed server-known 990.000đ package.

- [ ] **Step 4: Commit docs and preserve local worktree**

```bash
git add CURRENT_STATE.md FEATURE_MAP.md SESSION_LOG.md
git commit -m "docs: record AI landing and banner update"
git status --short
```

Expected: clean feature worktree. Do not push, merge or deploy.
