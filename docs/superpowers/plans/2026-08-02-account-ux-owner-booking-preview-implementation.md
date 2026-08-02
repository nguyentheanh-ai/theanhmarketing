# Account UX and Owner Booking Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the student account controls into three clear inline sections and allow the verified owner account to inspect support booking without a fake paid order.

**Architecture:** Preserve existing Supabase Auth update calls and course snapshot services. Extend the account client component with isolated form states, and pass a server-derived owner flag through both support-booking page and POST eligibility checks.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Auth, Tailwind utilities, Node test runner.

---

### Task 1: Lock account UX behavior with a failing test

**Files:**
- Modify: `tests/student-account-portal.test.mjs`
- Modify: `components/account/account-profile-form.tsx`
- Modify: `app/tai-khoan/page.tsx`

- [ ] Add assertions for `Thông tin cá nhân`, `Email đăng nhập`, `Email mới`, `Đổi mật khẩu`, inline `updateUser({ password`, independent loading states and `aria-live` feedback.
- [ ] Run `node --test tests/student-account-portal.test.mjs` and confirm the new assertions fail because password changes are still a separate link/page.
- [ ] Implement the three account cards, current-email read-only display, empty new-email input, inline password confirmation/show-hide controls, friendly feedback and page summary.
- [ ] Run the focused test again and confirm all account assertions pass.

### Task 2: Add owner-only booking preview with a failing test

**Files:**
- Modify: `tests/support-booking-domain.test.mjs`
- Modify: `services/supportBookingService.ts`
- Modify: `app/dat-lich-ho-tro/page.tsx`
- Modify: `app/api/support-bookings/route.ts`
- Modify: `components/support-booking/support-booking-form.tsx`

- [ ] Add source-contract assertions that both page and POST pass a server-derived `isAdmin` option, that the service checks `allowOwnerPreview`, and that the UI warns a real pending order is created only on final submit.
- [ ] Run `node --test tests/support-booking-domain.test.mjs` and confirm the preview assertions fail against the paid-order-only implementation.
- [ ] Extend `EligibleSupportCustomer` with `previewMode`, use the latest existing non-support order only for verified owner identity when no paid order exists, and show the owner warning without changing the customer form.
- [ ] Run the focused support-booking test and confirm it passes.

### Task 3: Verify the complete release candidate

**Files:**
- Update: `CURRENT_STATE.md`
- Update: `FEATURE_MAP.md`
- Update: `SESSION_LOG.md`
- Update workspace handoff documents required by `AGENTS.md`

- [ ] Run focused account and support tests.
- [ ] Run all `tests/*.test.mjs`, TypeScript, ESLint and `next build`; require zero test/type/build failures and no new lint error.
- [ ] Start the local app and inspect `/tai-khoan` plus `/dat-lich-ho-tro` at desktop and mobile widths without submitting profile, email, password or booking forms.
- [ ] Record the 10/10 owner course grants, verification evidence, changed files and remaining deploy decision in repo/workspace documentation.
- [ ] Commit the verified local release candidate; do not deploy until the owner approves the local visual.
