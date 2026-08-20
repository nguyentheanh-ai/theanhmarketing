# Facebook Ads Mobile Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore readable contrast in the cream tools section, render complete Zalo proof images on every viewport, release the exact verified artifact, and create one pending 799K test order.

**Architecture:** Make a scoped CSS-only presentation correction inside the canonical static landing, mirror it byte-for-byte to the published route, and guard the exact selectors in the existing landing regression. Keep commerce and event assets untouched. Release through the existing Git-preview-to-production promotion flow, then exercise the unchanged public order API once and verify the resulting pending checkout state.

**Tech Stack:** Static HTML/CSS, Node test runner, Next.js 16, Vercel, Supabase-backed order API, in-app Browser.

---

### Task 1: Add the mobile-readability regression

**Files:**
- Modify: `tests/facebook-ads-landing.test.mjs`

- [ ] Add one test asserting the cream tools heading/body/card colors, warm card surface, proof image `height:auto`/`object-fit:contain`, and a fixed near-full-width mobile proof track.
- [ ] Run `node --test tests/facebook-ads-landing.test.mjs` and confirm the new test fails against the current production CSS.

### Task 2: Correct the canonical and published landing CSS

**Files:**
- Modify: `public/ladipage/facebook-ads-2026.html`
- Modify: `public/academy/facebook-ads-master-2026.html`

- [ ] Add scoped `.hybrid-section.is-cream` overrides for `.hybrid-copy`, `.section-kicker`, `.learning-format-card`, `h3` and card body copy.
- [ ] Change `.proof-case-card img` to natural responsive height with no crop.
- [ ] Change the mobile proof columns from `minmax(220px, 76vw)` to `min(84vw, 320px)` and retain mandatory snap.
- [ ] Sync the canonical file to the published file byte-for-byte.
- [ ] Run the focused landing/event tests and confirm they pass.

### Task 3: Verify locally and visually

**Files:**
- Verify only.

- [ ] Run all Node tests, TypeScript, ESLint, tracking verification, `git diff --check` and the Webpack production build.
- [ ] Serve the production static files locally and inspect `#bo-cong-cu` plus `#feedback` at 1440x900, 390x844 and 320x700.
- [ ] Confirm dark-on-cream computed colors, complete proof images, near-full mobile cards, working snap, intact sticky CTA, no mojibake and no horizontal overflow.

### Task 4: Release the exact artifact

**Files:**
- Commit the two HTML files, regression and approved design/plan documents.

- [ ] Commit and push the scoped change.
- [ ] Wait for the Git preview to become `READY` and verify it points to the exact commit.
- [ ] Promote that preview to production and retain the current production deployment as rollback.
- [ ] Read back the live route, exact HTML hash, event-script hash, protected route status and Vercel runtime errors.
- [ ] Repeat mobile/desktop Browser QA on production.

### Task 5: Create and verify one pending test order

**Files:**
- No source changes.

- [ ] Post one controlled payload to production `/api/orders` using `studentName`, `email`, `phone`, `courseSlug=facebook-ads-2026`, `paymentPlan=zoom-kit` and the canonical landing URL.
- [ ] Confirm the response exposes `order.orderCode`, status `pending`, amount `799000` and a QR URL.
- [ ] Open `/thanh-toan/<orderCode>` and confirm the code, 799,000 VND amount and loaded QR without submitting payment.
- [ ] Read back the exact order and pending notification markers through the existing authorized production channel. Confirm `paid_at`, payment-success email and entitlement remain absent.

### Task 6: Record the release

**Files:**
- Modify: `CURRENT_STATE.md`
- Modify: `SESSION_LOG.md`
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify workspace `docs/SESSION_STATE.md`, `docs/FEATURE_REGISTRY.md`, `docs/TASK_LOG.md`, `docs/CHANGELOG.md`

- [ ] Record feature commit, deployment, rollback, hashes, responsive QA, test-order evidence and preservation boundaries.
- [ ] Commit/push repo handoff docs, verify a clean worktree and confirm local HEAD equals upstream.

