# Facebook Ads Ebook Add-on Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional 299,000 VND Ebook upsell to the Facebook Ads 799,000 VND registration form and deliver both products through one 1,098,000 VND order.

**Architecture:** Keep the landing browser state limited to selecting a server-known plan ID. Extend the server payment-plan map so it remains the price authority and emits two order items for the bundle. Make checkout, redirect and email classification detect the two-product bundle before standalone Ebook behavior.

**Tech Stack:** Static HTML/CSS/JavaScript, Next.js App Router, TypeScript, Supabase orders, SePay, Node test runner.

---

### Task 1: Lock the landing and server bundle contracts

**Files:**
- Modify: `tests/facebook-ads-landing.test.mjs`
- Modify: `tests/payment-page-reference-ui.test.mjs`
- Modify: `tests/payment-success-email.test.mjs`
- Modify: `tests/pending-payment-email.test.mjs`

- [x] **Step 1: Add failing landing assertions**

Assert that the form contains `name="ebookAddon"`, the copy `299.000đ`, struck-through `799.000đ`, plan ID `zoom-kit-ebook-299`, amount `1098000`, and a resolver that returns the bundle only while the checkbox is checked. Replace the old phone-to-button assertion with phone-to-addon-to-button ordering.

- [x] **Step 2: Add failing order and checkout assertions**

Read `services/orderService.ts` and require this exact bundle shape:

```ts
"zoom-kit-ebook-299": {
  title: "Gói AI Agent 799K + Ebook Facebook Ads 299K",
  amount: 1098000,
  orderItems: [
    { slug: "facebook-ads-2026", price: 799000 },
    { slug: "ebook-facebook-ads-2026", price: 299000 },
  ],
}
```

Require checkout to recognize the combined order before the standalone Ebook branch and render `3.389.000đ` to `1.098.000đ`. Require the paid redirect to prefer the Facebook Ads thank-you route when both exact slugs are present.

- [x] **Step 3: Add failing email assertions**

Create a paid/pending bundle fixture with two order items. Success email must contain the course, AI Agent benefits, `Ebook Facebook Ads 2026`, `/thu-vien/facebook-ads`, `/thu-vien/facebook-ads/pdf`, and `1.098.000đ`. Pending email must use a combined product title and must not collapse into the standalone Ebook-only template.

- [x] **Step 4: Run focused tests and verify RED**

Run:

```powershell
node --test tests\facebook-ads-landing.test.mjs tests\payment-page-reference-ui.test.mjs tests\payment-success-email.test.mjs tests\pending-payment-email.test.mjs
```

Expected: failures for missing add-on UI, missing server bundle, wrong checkout branch/redirect and Ebook-only email classification.

### Task 2: Add the form checkbox and dynamic total

**Files:**
- Modify: `public/ladipage/facebook-ads-2026.html`
- Modify: `public/academy/facebook-ads-master-2026.html`

- [x] **Step 1: Add scoped add-on styles**

Add `.ebook-addon`, `.ebook-addon-control`, `.ebook-addon-price`, `.ebook-addon-original` and checked/focus-visible states. Keep a minimum 44px tap target and a single-column mobile layout.

- [x] **Step 2: Insert the option after phone**

Use accessible checkbox markup:

```html
<label class="ebook-addon" for="ebook-addon">
  <input id="ebook-addon" name="ebookAddon" type="checkbox" />
  <span class="ebook-addon-control" aria-hidden="true"></span>
  <span>
    <strong>Mua kèm Ebook Facebook Ads</strong>
    <span class="ebook-addon-price">299.000đ <del>799.000đ</del></span>
  </span>
</label>
```

- [x] **Step 3: Resolve one of two plan IDs**

Add `plans["zoom-kit-ebook-299"]` with amount `1098000`. Cache `ebookAddon`, make `resolveSelectedPlan()` return the bundle only when checked, and add `syncCheckoutState()` to update `paymentPlan`, summary, note, button, cart and total copy. Call it on `change` and before submit.

- [x] **Step 4: Synchronize published HTML**

Copy the source HTML byte-for-byte to `public/academy/facebook-ads-master-2026.html`.

### Task 3: Make the server create a real two-product order

**Files:**
- Modify: `services/orderService.ts`

- [x] **Step 1: Extend the payment-plan type**

Use:

```ts
type CoursePaymentPlan = {
  title: string;
  amount: number;
  orderItems?: OrderItem[];
};
```

- [x] **Step 2: Register the bundle**

Add `zoom-kit-ebook-299` with total `1098000` and the two authoritative item prices `799000` and `299000`.

- [x] **Step 3: Emit both identities**

When `plan.orderItems` exists, return:

```ts
{
  amount: plan.amount,
  courseSlug: plan.orderItems.map((item) => item.slug).join(","),
  courseTitle: plan.orderItems.map((item) => item.title).join(" | "),
  orderItems: plan.orderItems,
}
```

Keep the existing one-course behavior for all other plans. This also preserves both slugs in the fallback insert when `order_items` is unavailable.

### Task 4: Handle the bundle across checkout, redirect and email

**Files:**
- Modify: `app/thanh-toan/[code]/page.tsx`
- Modify: `components/payment/payment-status-poller.tsx`
- Modify: `lib/notifications/payment-success-email.ts`
- Modify: `lib/notifications/pending-payment-email.ts`

- [x] **Step 1: Add exact product helpers**

In each touched module, detect a product with exact comma-split `courseSlug` entries or exact `orderItems[].slug` values. Define bundle as both `facebook-ads-2026` and `ebook-facebook-ads-2026`.

- [x] **Step 2: Render bundle checkout pricing**

In `getPaymentOffer()`, check the bundle first and return:

```ts
{ originalPriceLabel: "3.389.000đ", currentPriceLabel: "1.098.000đ" }
```

Standalone Ebook and existing Facebook Ads amounts keep their current branches.

- [x] **Step 3: Prefer the primary-course paid redirect**

In `getPaidRedirectPath()`, check the exact Facebook Ads course before standalone Ebook. A bundle goes to `/cam-on-thanh-toan/facebook-ads-2026`; an Ebook-only order still goes to `/cam-on-thanh-toan/ebook-facebook-ads-2026`.

- [x] **Step 4: Build a combined success email**

For a bundle, use the course email layout, combined title, existing 799K benefits, one additional Ebook-access benefit, and add reader/PDF buttons and plain-text URLs. Keep Ebook account gating in the webhook because the order still contains the Ebook slug.

- [x] **Step 5: Build a combined pending email**

Route only standalone Ebook orders to `buildFacebookEbookPendingPaymentEmailPayload()`. Bundle orders use the generic payment template with combined title, item list, 1,098,000 VND and the existing support-agent block.

### Task 5: Verify, document and hand off

**Files:**
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify: `E:\Kinh doanh\docs\SESSION_STATE.md`
- Modify: `E:\Kinh doanh\docs\FEATURE_REGISTRY.md`
- Modify: `E:\Kinh doanh\docs\TASK_LOG.md`
- Modify: `E:\Kinh doanh\docs\CHANGELOG.md`

- [x] **Step 1: Run focused GREEN verification**

Run the four focused test files and require zero failures.

- [x] **Step 2: Run repository verification**

Run full Node tests serially, TypeScript, ESLint, `git diff --check` and the Next production build.

- [ ] **Step 3: Verify the rendered form locally**

Check desktop and mobile states: unchecked 799,000 VND; checked 1,098,000 VND; checkbox tap/focus; no overflow; submitted payload uses only a recognized plan ID. Do not create a real order during local QA.

- [x] **Step 4: Update project knowledge**

Record the new plan ID, two-item order model, entitlement behavior, verification totals and local-ready/no-deploy status.

- [x] **Step 5: Review scope**

Confirm no database schema, standalone Ebook price, unrelated landing, CRM, LMS lesson or production data changed.
