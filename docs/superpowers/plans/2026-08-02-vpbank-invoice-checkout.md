# VPBank Invoice Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển checkout production sang tài khoản VPBank mới, thu thập yêu cầu hóa đơn trên mọi form khóa học hiện có và giữ copy/USP riêng của từng landing.

**Architecture:** Dữ liệu hóa đơn được chuẩn hóa trong `lib/orders/invoice.ts`, truyền qua hai API tạo đơn và lưu thành năm cột riêng trên `public.orders`. React checkout dùng một fieldset dùng lại; static landing giữ markup phù hợp thiết kế riêng nhưng gửi cùng API contract. Cấu hình ngân hàng tiếp tục đi qua ba biến môi trường hiện có; tên nhà cung cấp đối soát chỉ tồn tại trong định danh kỹ thuật nội bộ.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres migrations, Node test runner, Vercel CLI.

---

## File map

- Create `lib/orders/invoice.ts`: kiểu dữ liệu, chuẩn hóa và validation.
- Create `components/payment/invoice-request-fields.tsx`: checkbox nhỏ dưới CTA và bốn field có điều kiện.
- Create `supabase/migrations/*_add_order_invoice_fields.sql`: một migration timestamped do CLI tạo cho năm cột hóa đơn.
- Create `tests/invoice-checkout-flow.test.mjs`: domain, persistence, UI, privacy và copy guards.
- Modify `services/orderService.ts`, `/api/orders`, `/api/orders/from-session`: lưu invoice trong cùng đơn.
- Modify Agent Kit, register, cart và tám static landing source/published files.
- Modify payment page, poller và pending email: copy trung tính và xác nhận invoice không lộ PII.
- Modify repo/workspace contracts, env production, migration state và deployment state.

### Task 1: Invoice domain contract and migration

**Files:**
- Create: `lib/orders/invoice.ts`
- Create: `tests/invoice-checkout-flow.test.mjs`
- Create: `supabase/migrations/*_add_order_invoice_fields.sql` (một file timestamped do CLI tạo)

- [ ] **Step 1: Discover and generate the migration**

```bash
npx supabase migration new --help
npx supabase migration new add_order_invoice_fields
```

Expected: one timestamped SQL file under `supabase/migrations/`.

- [ ] **Step 2: Write failing normalization tests**

```js
assert.deepEqual(normalizeInvoiceInput({ requested: false, taxCode: "0101234567" }), {
  ok: true,
  value: emptyInvoiceDetails,
});
assert.equal(normalizeInvoiceInput({ requested: true }).ok, false);
assert.equal(normalizeInvoiceInput({
  requested: true,
  taxCode: "0101234567",
  companyName: "Công ty TNHH Ví dụ",
  companyAddress: "Hà Nội",
  email: "KETOAN@EXAMPLE.COM",
}).value.email, "ketoan@example.com");
```

- [ ] **Step 3: Run RED**

```bash
node --test tests/invoice-checkout-flow.test.mjs
```

Expected: FAIL because `lib/orders/invoice.ts` does not exist.

- [ ] **Step 4: Implement the pure contract**

```ts
export type InvoiceDetails = {
  requested: boolean;
  taxCode: string;
  companyName: string;
  companyAddress: string;
  email: string;
};

export const emptyInvoiceDetails: InvoiceDetails = {
  requested: false,
  taxCode: "",
  companyName: "",
  companyAddress: "",
  email: "",
};
```

`normalizeInvoiceInput()` uses existing cleaners, accepts MST of 10 digits or 10 digits plus `-` and 3 branch digits, and discards all detail when `requested=false`.

- [ ] **Step 5: Add the additive SQL**

```sql
alter table public.orders
  add column if not exists invoice_requested boolean not null default false,
  add column if not exists invoice_tax_code text,
  add column if not exists invoice_company_name text,
  add column if not exists invoice_company_address text,
  add column if not exists invoice_email text;
```

Do not add public grants or new RLS policies; this changes an existing service-role-owned table.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/invoice-checkout-flow.test.mjs
git add lib/orders/invoice.ts tests/invoice-checkout-flow.test.mjs supabase/migrations
git commit -m "feat: define order invoice details"
```

### Task 2: Persist invoice through both order APIs

**Files:**
- Modify: `services/orderService.ts`
- Modify: `app/api/orders/route.ts`
- Modify: `app/api/orders/from-session/route.ts`
- Modify: `lib/security/public-order.ts`
- Test: `tests/invoice-checkout-flow.test.mjs`

- [ ] **Step 1: Add failing source/data-flow guards**

Assert both APIs call `normalizeInvoiceInput(body.invoice)`, pass normalized `invoice` to `createPaymentOrder`, selects include five columns, inserts map five values, and public sanitizer keeps only `requested` with blank details.

- [ ] **Step 2: Run RED**

```bash
node --test tests/invoice-checkout-flow.test.mjs
```

- [ ] **Step 3: Extend order types and mapping**

Add `invoice: InvoiceDetails` to `PaymentOrder` and `CreatePaymentOrderInput`. Map DB columns; old/fallback rows map to `emptyInvoiceDetails`.

- [ ] **Step 4: Extend insert and fail closed for invoice orders**

```ts
invoice_requested: input.invoice.requested,
invoice_tax_code: input.invoice.requested ? input.invoice.taxCode : null,
invoice_company_name: input.invoice.requested ? input.invoice.companyName : null,
invoice_company_address: input.invoice.requested ? input.invoice.companyAddress : null,
invoice_email: input.invoice.requested ? input.invoice.email : null,
```

If the primary insert fails while `requested=true`, throw instead of silently using the legacy insert. Normal orders retain the current fallback.

- [ ] **Step 5: Validate both API boundaries and sanitize polling**

Invalid invoice returns `400` before order creation. Omitted input becomes `emptyInvoiceDetails`. `toPublicPaymentOrder()` blanks every detail but retains `requested`.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/invoice-checkout-flow.test.mjs tests/order-created-email-flow.test.mjs tests/payment-expiry-flow.test.mjs
git add services/orderService.ts app/api/orders/route.ts app/api/orders/from-session/route.ts lib/security/public-order.ts tests/invoice-checkout-flow.test.mjs
git commit -m "feat: persist invoice requests on orders"
```

### Task 3: Add reusable React invoice fields

**Files:**
- Create: `components/payment/invoice-request-fields.tsx`
- Modify: `app/khoa-hoc/bo-kit-agent-doanh-nghiep/agent-kit-checkout-form.tsx`
- Modify: `components/auth/register-form.tsx`
- Modify: `components/cart/cart-page-client.tsx`
- Test: `tests/invoice-checkout-flow.test.mjs`

- [ ] **Step 1: Add failing UI contract tests**

Require a small centered `Tôi cần xuất hóa đơn` trigger after each primary CTA, four conditional fields, and the exact nested `invoice` payload.

- [ ] **Step 2: Run RED**

```bash
node --test tests/invoice-checkout-flow.test.mjs
```

- [ ] **Step 3: Build `InvoiceRequestFields`**

Use native controls, default unchecked, `variant: "light" | "dark"`, and `onChange(InvoiceDetails)` for cart. When checked, all four fields are required.

- [ ] **Step 4: Wire Agent Kit, registration and cart**

Agent Kit/register read the named inputs from `FormData`; cart posts controlled state to `/api/orders/from-session`. Preserve product title, amount, CTA and tracking.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/invoice-checkout-flow.test.mjs tests/agent-kit-private-landing.test.mjs tests/payment-page-reference-ui.test.mjs
git add components/payment/invoice-request-fields.tsx app/khoa-hoc/bo-kit-agent-doanh-nghiep/agent-kit-checkout-form.tsx components/auth/register-form.tsx components/cart/cart-page-client.tsx tests/invoice-checkout-flow.test.mjs
git commit -m "feat: add invoice fields to React checkout"
```

### Task 4: Add invoice fields to active static landings

**Files:**
- Modify: `public/ladipage/ai-master-x10-hieu-suat.html`
- Modify: `public/academy/ai-master-x10-hieu-suat.html`
- Modify: `public/ladipage/facebook-ads-2026.html`
- Modify: `public/academy/facebook-ads-master-2026.html`
- Modify: `public/ladipage/ebook-facebook-ads-2026.html`
- Modify: `public/academy/ebook-facebook-ads-2026.html`
- Modify: `public/ladipage/ebook-facebook-ads-2026-premium.html`
- Modify: `public/academy/ebook-facebook-ads-2026-premium.html`
- Test: `tests/invoice-checkout-flow.test.mjs` and existing landing tests

- [ ] **Step 1: Add failing coverage for all eight files**

Require checkbox, four inputs, disclosure script and nested payload in every file. Require source/published equality where existing guards demand it.

- [ ] **Step 2: Add failing Facebook Ads copy guards**

Require `Đăng ký và nhận khóa học Facebook Ads Master 2026 ngay hôm nay` and `Nhận khóa học + AI Agent - 799.000đ`. Reject `Đăng ký và tạo QR thanh toán`.

- [ ] **Step 3: Run RED**

```bash
node --test tests/invoice-checkout-flow.test.mjs tests/facebook-ads-landing.test.mjs tests/ebook-facebook-ads-landing.test.mjs
```

- [ ] **Step 4: Update each canonical landing**

Keep each landing's own title, USP, benefits, add-ons, price and CTA except the approved Facebook Ads wording. Place the small centered invoice trigger below its CTA and send the shared nested payload.

- [ ] **Step 5: Synchronize published copies mechanically**

Copy each canonical `/public/ladipage` file to its mapped `/public/academy` destination; do not hand-edit duplicate copies independently.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/invoice-checkout-flow.test.mjs tests/facebook-ads-landing.test.mjs tests/ebook-facebook-ads-landing.test.mjs tests/agent-kit-private-landing.test.mjs
git add public/ladipage public/academy tests/invoice-checkout-flow.test.mjs
git commit -m "feat: add invoice option to course landings"
```

### Task 5: Neutral payment copy and invoice acknowledgement

**Files:**
- Modify: `app/thanh-toan/[code]/page.tsx`
- Modify: `components/payment/payment-status-poller.tsx`
- Modify: `lib/notifications/pending-payment-email.ts`
- Modify: `tests/payment-page-reference-ui.test.mjs`
- Modify: `tests/pending-payment-email.test.mjs`
- Test: `tests/invoice-checkout-flow.test.mjs`

- [ ] **Step 1: Write failing copy/privacy tests**

Reject customer-visible provider branding in rendered copy/email while requiring technical imports/routes to remain. Require `Đã ghi nhận yêu cầu xuất hóa đơn` only for `order.invoice.requested`; forbid invoice details in polling/email.

- [ ] **Step 2: Run RED**

```bash
node --test tests/invoice-checkout-flow.test.mjs tests/payment-page-reference-ui.test.mjs tests/pending-payment-email.test.mjs
```

- [ ] **Step 3: Replace customer-facing copy only**

Use `Thanh toán chuyển khoản`, `Hệ thống tự đối soát`, `Hệ thống đã xác nhận tiền vào` and `QR thanh toán`. Keep internal `sepay` filenames, env names, webhook and payment method unchanged.

- [ ] **Step 4: Render compact server-side acknowledgement**

Show only the acknowledgement, never MST, company address or invoice email.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/invoice-checkout-flow.test.mjs tests/payment-page-reference-ui.test.mjs tests/pending-payment-email.test.mjs tests/payment-success-email.test.mjs
git add app/thanh-toan/[code]/page.tsx components/payment/payment-status-poller.tsx lib/notifications/pending-payment-email.ts tests
git commit -m "feat: finalize neutral invoice checkout copy"
```

### Task 6: Full verification and docs

**Files:**
- Modify: `.env.example`, `docs/SEPAY_SETUP.md`, `docs/DATABASE_ARCHITECTURE.md`, `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify workspace: payment/email/database contracts, session state, feature registry, task log and changelog

- [ ] **Step 1: Run focused payment gate**

```bash
node --test tests/invoice-checkout-flow.test.mjs tests/payment-expiry-flow.test.mjs tests/payment-page-reference-ui.test.mjs tests/pending-payment-email.test.mjs tests/payment-success-email.test.mjs tests/order-created-email-flow.test.mjs tests/sepay-order-code.test.mjs
```

- [ ] **Step 2: Run complete local gate**

```bash
node --test tests/*.mjs
npx tsc --noEmit --pretty false
npm run lint
npm run verify:tracking
git diff --check
npm run build
```

- [ ] **Step 3: Update all required contracts**

Record the five columns, every checkout surface, public privacy boundary, per-product copy ownership and neutral provider-copy rule. Never write secrets.

- [ ] **Step 4: Commit docs**

```bash
git add .env.example docs
git commit -m "docs: record invoice checkout rollout"
```

### Task 7: Atomic production rollout

**State:** Supabase schema, Vercel env and Vercel production deployment.

- [ ] **Step 1: Inspect identities and migration state read-only**

```bash
npx supabase migration list --linked
vercel project inspect
vercel env ls production
```

Expected: linked Supabase project and Vercel project `theanhmarketing`; no unresolved migration divergence.

- [ ] **Step 2: Apply schema before code**

Run `supabase db push --dry-run`, then `supabase db push`. Verify `information_schema.columns` contains the exact five columns and a read-only order select works. Do not mutate customer rows.

- [ ] **Step 3: Update three production bank variables atomically**

Set bank code/account/name to VPBank / `2070519999` / `GREEZHUB CO LTD`. Do not modify `SEPAY_WEBHOOK_API_KEY`.

- [ ] **Step 4: Build and deploy a candidate without production alias**

```bash
vercel build --prod
vercel deploy --prebuilt --prod --skip-domain
```

Inspect until `READY`, smoke candidate routes and verify public polling exposes no invoice PII.

- [ ] **Step 5: Promote the exact artifact**

```bash
vercel promote "$CANDIDATE_DEPLOYMENT_URL"
```

- [ ] **Step 6: Post-deploy smoke and logs**

Check active landings, unauthenticated webhook `401`, payment demo bank data, neutral public copy and error/fatal logs. Do not create a real order, send a real email or transfer money without separate approval.

- [ ] **Step 7: Record release state**

Update repo/workspace handoff with migration, env and deployment IDs, commit release docs, and report any real-bank transaction that remains unverified.
