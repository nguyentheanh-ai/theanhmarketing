# Facebook Ads Post-Payment Access Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the post-payment Facebook Ads access guide so customers know to check email, retrieve the temporary password, log in, and start learning.

**Architecture:** Keep the existing paid redirect in `PaymentStatusPoller`; enhance the existing noindex route at `app/cam-on-thanh-toan/facebook-ads-2026/page.tsx`. Add a focused source-level regression test so this route cannot regress back to a vague three-step guide.

**Tech Stack:** Next.js App Router, React Server Component page, Tailwind utility classes, Node test runner.

---

### Task 1: Regression Test

**Files:**
- Create: `tests/facebook-ads-thank-you-guide.test.mjs`
- Read: `components/payment/payment-status-poller.tsx`
- Read: `app/cam-on-thanh-toan/facebook-ads-2026/page.tsx`

- [ ] **Step 1: Write the failing test**

```js
assert.match(page, /Mở email xác nhận thanh toán/);
assert.match(page, /Lấy mật khẩu tạm/);
assert.match(page, /Không tự tạo tài khoản mới/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests\facebook-ads-thank-you-guide.test.mjs`
Expected: FAIL because the current page only has a three-step guide.

### Task 2: Page UI

**Files:**
- Modify: `app/cam-on-thanh-toan/facebook-ads-2026/page.tsx`
- Test: `tests/facebook-ads-thank-you-guide.test.mjs`

- [ ] **Step 1: Implement the five-step guide**

Use an array of five steps: payment success, check mail, open the confirmation email, retrieve the temporary password, log in and learn.

- [ ] **Step 2: Add a credential reminder panel**

Show safe placeholder copy only: `Email đã mua khóa`, `Mật khẩu tạm`, and masked dots. Do not show real credentials.

- [ ] **Step 3: Preserve CTAs**

Keep the primary link at `/dang-nhap?next=%2Fdashboard` and the support link at `/vao-khoa-hoc`.

- [ ] **Step 4: Run the targeted test**

Run: `node --test tests\facebook-ads-thank-you-guide.test.mjs`
Expected: PASS.

### Task 3: Verification

**Files:**
- Read: `app/cam-on-thanh-toan/facebook-ads-2026/page.tsx`
- Read: local browser screenshot

- [ ] **Step 1: Run related tests**

Run: `node --test tests\facebook-ads-thank-you-guide.test.mjs tests\payment-page-reference-ui.test.mjs`
Expected: PASS.

- [ ] **Step 2: Run type/build checks appropriate to the change**

Run: `npx.cmd tsc --noEmit --pretty false`
Run: `npm.cmd run build`
Expected: both commands exit 0, unless unrelated dirty-worktree issues are discovered and reported.

- [ ] **Step 3: Visual smoke**

Open `/cam-on-thanh-toan/facebook-ads-2026` locally or live, capture a screenshot, and confirm there is no visible customer-data leak.
