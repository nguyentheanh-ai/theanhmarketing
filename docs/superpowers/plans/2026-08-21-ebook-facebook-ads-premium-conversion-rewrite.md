# Ebook Facebook Ads 2026 Premium Conversion Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Premium Ebook landing around fast lookup and clear decisions, implementing workbook P0 before P1 while preserving checkout, tracking, SEO and responsive behavior.

**Architecture:** Update the existing static HTML rather than creating a new route or commerce flow. Add regression assertions first, then reshape the source HTML and copy it byte-for-byte to the academy mirror; reuse existing real Ebook assets, public trial reader and server-known payment plans.

**Tech Stack:** Static HTML/CSS/JavaScript, Node test runner, Next.js public routes, existing `/api/orders` and Meta Pixel/CAPI contracts.

---

### Task 1: Lock the workbook conversion contract with failing tests

**Files:**
- Modify: `tests/ebook-facebook-ads-landing.test.mjs`

- [ ] **Step 1: Add a P0 regression test** that extracts the Premium source and asserts result-first hero copy, purchase CTA before trial CTA, the early `Không cần đọc hết 471 trang` message, real preview immediately after the hero, three situation cards, four mechanism layers, the renamed Part 10, absence of internal/process phrases, the real Parts 1 and 5 trial message, 399,000 VND without an Ebook 799,000 VND strike-through, and the source/published equality guard.
- [ ] **Step 2: Add preservation assertions** for the existing form fields, `full-access-399`, optional unchecked `full-access-399-course-699`, `/api/orders`, Pixel ID, `PageView`, `ViewContent`, successful-order `Lead`, canonical route and absence of early `InitiateCheckout`/browser `Purchase`.
- [ ] **Step 3: Run** `/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/ebook-facebook-ads-landing.test.mjs` and confirm the new contract fails on the current hero/section/copy structure.

### Task 2: Implement P0 structure, copy and honest pricing

**Files:**
- Modify: `public/ladipage/ebook-facebook-ads-2026-premium.html`
- Modify: `public/academy/ebook-facebook-ads-2026-premium.html`

- [ ] **Step 1: Replace the hero** with the approved eyebrow, result-first headline, workbook subheadline, primary `Nhận Ebook Facebook Ads 2026 – 399.000đ`, secondary `Đọc thử miễn phí 2 chương`, early no-need-to-read-all insight and verified delivery microcopy.
- [ ] **Step 2: Reorder and merge P0 sections** into Hero → real preview → three situations → four-layer mechanism → buyer outcomes → usage modes → trial → contents → author → real-deliverable stack → price/checkout → FAQ → final CTA.
- [ ] **Step 3: Remove internal phrases** including `landing page hệ thống hóa`, `manifest`, `Phần này không mở rộng`, `Ưu đãi hiện tại tập trung` and `theo quy trình giao ebook hiện tại`.
- [ ] **Step 4: Synchronize the trial** to the public reader's unlocked Parts 1 and 5, using existing public preview assets and preserving `sample_trial_reader_click`.
- [ ] **Step 5: Make pricing honest** by keeping 399,000 VND as the only Ebook selling price, removing the unverified Ebook 799,000 VND anchor and keeping the optional 699,000 VND course add-on unchecked and visually secondary.
- [ ] **Step 6: Copy the canonical source** to the academy mirror and run the focused test until the new P0 and preservation assertions pass.

### Task 3: Implement P1 compression, trust and mobile details

**Files:**
- Modify: `public/ladipage/ebook-facebook-ads-2026-premium.html`
- Modify: `public/academy/ebook-facebook-ads-2026-premium.html`
- Modify: `tests/ebook-facebook-ads-landing.test.mjs`

- [ ] **Step 1: Add P1 regression assertions** for compact ten-part disclosure cards, three usage modes, verified author copy, five real deliverables, delivery/access/device/update/support/license FAQs, secondary unselected upsell and mobile-safe CTA/navigation selectors.
- [ ] **Step 2: Implement the compact disclosures and trust copy** using only repository-backed facts; omit Ebook feedback and record `BLOCKED_NO_EBOOK_FEEDBACK_ASSETS` in the handoff.
- [ ] **Step 3: Tune responsive CSS** for 1440/390/320, ensure trial and contents do not create oversized horizontal rails, keep lazy loading below the fold and prevent the fixed controls from covering the final lines of cards.
- [ ] **Step 4: Recopy the canonical source** to the academy mirror and run focused tests.

### Task 4: Run QA and verify preservation contracts

**Files:**
- Verify: `public/ladipage/ebook-facebook-ads-2026-premium.html`
- Verify: `public/academy/ebook-facebook-ads-2026-premium.html`

- [ ] **Step 1: Run focused tests** for Ebook landing, preview reader, order plans, invoice checkout, payment-success email and Meta conversion behavior.
- [ ] **Step 2: Run full quality gates:** `node --test tests/*.mjs`, `npx tsc --noEmit --pretty false`, `npm run lint`, `npm run build`, `npm run verify:tracking`, `git diff --check`, byte comparison and mojibake scan.
- [ ] **Step 3: Browser QA** the local route at 1440, 390 and 320 pixels for section order, CTA hierarchy, trial route, menu/progress behavior, image failures, console errors and horizontal overflow. Exercise form validation and plan switching without submitting an order.
- [ ] **Step 4: Compare all 20 rows** in workbook sheet `07_QA_CHECKLIST`, marking each `DONE`, `NOT_APPLICABLE` or `BLOCKED` with evidence.

### Task 5: Record the handoff without deploying unapproved production scope

**Files:**
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/SESSION_STATE.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/FEATURE_REGISTRY.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/TASK_LOG.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/CHANGELOG.md`

- [ ] **Step 1: Record exact local files, tests and blockers** including `BLOCKED_NO_EBOOK_FEEDBACK_ASSETS`, no explicit online-access duration, no future-update promise and no approved Ebook refund policy.
- [ ] **Step 2: State release status precisely:** local implementation and browser QA are separate from deployment and live readback; do not deploy this new Ebook rewrite without explicit production authorization.

