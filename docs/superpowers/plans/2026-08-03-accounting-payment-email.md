# Accounting Payment Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send one idempotent accounting email for every newly paid order and backfill eligible Greezhub payments from 2026-08-02 to `thuthaoch@gmail.com`.

**Architecture:** Add dedicated delivery markers to `public.orders`, a focused accounting email renderer/sender, and a shared orchestration service called by both authoritative paid routes. A rerunnable TypeScript backfill uses the same service, filters by the current receiving-account evidence, and defaults to dry-run.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Supabase, Resend HTTP API, Node test runner, `tsx`, Vercel.

---

## File map

- Create `supabase/migrations/20260803090000_add_accounting_email_markers.sql`: additive accounting delivery state.
- Modify `services/orderService.ts`: expose marker fields on `PaymentOrder`, persist success/failure, and list bounded backfill candidates.
- Create `lib/notifications/accounting-payment-email.ts`: validate recipient, render HTML/text, and call Resend with an order-scoped idempotency key.
- Create `services/accountingNotificationService.ts`: eligibility, sent-marker guard, provider call, and marker persistence.
- Modify `app/api/sepay/webhook/route.ts`: notify accounting for every newly paid SePay order independently of customer fulfillment.
- Modify `app/api/payment/confirm/route.ts`: notify accounting for every newly paid manual confirmation.
- Create `scripts/backfill-accounting-payment-emails.ts`: dry-run/live backfill for the Greezhub receiving account.
- Create `tests/accounting-payment-email.test.mjs`: renderer, recipient, marker, route, and backfill regression tests.
- Modify `.env.example`: document `ACCOUNTING_NOTIFICATION_EMAIL` without a production value.
- Modify payment/email/database docs and cross-session handoffs after verification.

### Task 1: Add accounting email persistence contract

**Files:**
- Create: `supabase/migrations/20260803090000_add_accounting_email_markers.sql`
- Modify: `services/orderService.ts`
- Test: `tests/accounting-payment-email.test.mjs`

- [ ] **Step 1: Write the failing schema/type test**

Add a Node test that reads the migration and order service and requires both columns, both `PaymentOrder` properties, both select lists, `mapDbOrder`, `markAccountingEmailSent`, and `markAccountingEmailError`.

```js
test("orders persist accounting delivery state", () => {
  const migration = read("supabase/migrations/20260803090000_add_accounting_email_markers.sql");
  const orders = read("services/orderService.ts");
  for (const field of ["accounting_email_sent_at", "accounting_email_last_error"]) {
    assert.match(migration, new RegExp(field));
    assert.match(orders, new RegExp(field));
  }
  assert.match(orders, /markAccountingEmailSent/);
  assert.match(orders, /markAccountingEmailError/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/accounting-payment-email.test.mjs`

Expected: FAIL because the migration and marker functions do not exist.

- [ ] **Step 3: Add the migration and minimal order mapping**

Use an additive migration:

```sql
alter table public.orders
  add column if not exists accounting_email_sent_at timestamptz,
  add column if not exists accounting_email_last_error text;
```

Add nullable camelCase properties to `PaymentOrder`, snake-case properties to `DbOrder`, include them in both safe selects, map them in `mapDbOrder`, and initialize them to `null` in fallbacks.

Implement marker writes parallel to the existing customer-payment markers:

```ts
export async function markAccountingEmailSent(orderCode: string, sentAt = new Date().toISOString()) {
  return updateAccountingMarker(orderCode, {
    accounting_email_sent_at: sentAt,
    accounting_email_last_error: null,
  });
}

export async function markAccountingEmailError(orderCode: string, reason: string) {
  return updateAccountingMarker(orderCode, {
    accounting_email_last_error: reason.slice(0, 1000),
  });
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/accounting-payment-email.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the persistence slice**

```bash
git add supabase/migrations/20260803090000_add_accounting_email_markers.sql services/orderService.ts tests/accounting-payment-email.test.mjs
git commit -m "feat: track accounting payment emails"
```

### Task 2: Build the accounting email renderer and sender

**Files:**
- Create: `lib/notifications/accounting-payment-email.ts`
- Modify: `.env.example`
- Test: `tests/accounting-payment-email.test.mjs`

- [ ] **Step 1: Write failing renderer tests**

Load the TypeScript module with the existing `typescript.transpileModule` pattern. Assert the payload recipient, subject, mandatory HTML/text fields, Vietnam time, and conditional invoice section.

```js
const payload = buildAccountingPaymentEmailPayload(paidOrder, {
  recipient: "thuthaoch@gmail.com",
  from: "The Anh Marketing <noreply@theanhmarketing.com>",
});
assert.equal(payload.to, "thuthaoch@gmail.com");
assert.match(payload.subject, /TAM123/);
for (const value of ["Nguyễn Văn A", "0900000000", "buyer@example.com", "799.000đ", "Khóa học mẫu"]) {
  assert.match(payload.html, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(payload.text, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.doesNotMatch(payload.text, /Mã số thuế/);
```

Add a second order with `invoice.requested=true` and assert tax code, company, address, and invoice email appear in HTML and text. Add a missing-recipient send test expecting a skipped/error result without calling `fetch`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/accounting-payment-email.test.mjs`

Expected: FAIL because the accounting email module is missing.

- [ ] **Step 3: Implement the renderer and Resend call**

Export:

```ts
export type AccountingEmailOptions = { recipient?: string; from?: string };
export function buildAccountingPaymentEmailPayload(order: PaymentOrder, options?: AccountingEmailOptions): ResendEmailPayload;
export async function sendAccountingPaymentEmail(order: PaymentOrder, options?: AccountingEmailOptions): Promise<SendEmailResult>;
```

Read the recipient from `options.recipient ?? process.env.ACCOUNTING_NOTIFICATION_EMAIL`, validate it with the existing security email validator, escape all customer/order values, format `paidAt` with `Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ... })`, and send through Resend using:

```ts
headers: {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json; charset=utf-8",
  "Idempotency-Key": `accounting-paid-${order.orderCode}`,
}
```

Append `ACCOUNTING_NOTIFICATION_EMAIL=` next to the other server-side notification addresses in `.env.example`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/accounting-payment-email.test.mjs`

Expected: PASS with no real HTTP call.

- [ ] **Step 5: Commit the email slice**

```bash
git add .env.example lib/notifications/accounting-payment-email.ts tests/accounting-payment-email.test.mjs
git commit -m "feat: render accounting payment emails"
```

### Task 3: Add shared idempotent orchestration

**Files:**
- Create: `services/accountingNotificationService.ts`
- Modify: `app/api/sepay/webhook/route.ts`
- Modify: `app/api/payment/confirm/route.ts`
- Test: `tests/accounting-payment-email.test.mjs`

- [ ] **Step 1: Write failing orchestration and route tests**

Require a service-level function with dependency injection and static route guards:

```js
test("both paid routes use the shared accounting notification", () => {
  for (const file of ["app/api/sepay/webhook/route.ts", "app/api/payment/confirm/route.ts"]) {
    const source = read(file);
    assert.match(source, /notifyAccountingForPaidOrder/);
    assert.match(source, /!confirmation\.wasAlreadyPaid/);
  }
});
```

Test that a paid order with a sent marker skips provider delivery; success marks sent; failure marks only the accounting error; and thrown provider errors are converted to a bounded operational result.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/accounting-payment-email.test.mjs`

Expected: FAIL because the shared service and route calls are missing.

- [ ] **Step 3: Implement the service**

Export a default production wrapper and a dependency-injected core:

```ts
export async function notifyAccountingForPaidOrder(
  order: PaymentOrder,
  dependencies: AccountingNotificationDependencies = productionDependencies,
): Promise<AccountingNotificationResult> {
  if (order.status !== "paid" || order.accountingEmailSentAt) {
    return { ok: true, skipped: true, reason: "already_sent_or_not_paid" };
  }
  const result = await dependencies.send(order);
  if (result.ok && !result.skipped) await dependencies.markSent(order.orderCode);
  else await dependencies.markError(order.orderCode, result.reason ?? "Accounting email was not sent.");
  return result;
}
```

Catch provider and marker exceptions, redact/bound error messages, and never throw into the paid route.

- [ ] **Step 4: Wire both paid routes**

In each route, inside an independent `if (!confirmation.wasAlreadyPaid)` block, call the service in `try/catch`. Log only order code and bounded reason. Do not nest it under student provisioning, consultation, support booking, Meta, Telegram, or Google Sheets branches.

- [ ] **Step 5: Run focused payment/accounting tests**

Run:

```bash
node --test tests/accounting-payment-email.test.mjs tests/payment-success-email.test.mjs tests/consultation-payment-flow.test.mjs tests/student-account.test.mjs tests/sepay-order-code.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the runtime slice**

```bash
git add services/accountingNotificationService.ts app/api/sepay/webhook/route.ts app/api/payment/confirm/route.ts tests/accounting-payment-email.test.mjs
git commit -m "feat: notify accounting for paid orders"
```

### Task 4: Add the safe Greezhub backfill

**Files:**
- Modify: `services/orderService.ts`
- Create: `scripts/backfill-accounting-payment-emails.ts`
- Test: `tests/accounting-payment-email.test.mjs`

- [ ] **Step 1: Write failing backfill-contract tests**

Require the fixed UTC boundary, dry-run default, explicit `--send`, exact current-account comparison when SePay evidence exists, sent-marker skip, and aggregate-only output.

```js
test("accounting backfill defaults to dry-run from the Greezhub boundary", () => {
  const source = read("scripts/backfill-accounting-payment-emails.ts");
  assert.match(source, /2026-08-01T17:00:00\.000Z/);
  assert.match(source, /--send/);
  assert.match(source, /accountingEmailSentAt/);
  assert.match(source, /SEPAY_BANK_ACCOUNT_NUMBER/);
  assert.doesNotMatch(source, /studentName|\.email\b|\.phone\b/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/accounting-payment-email.test.mjs`

Expected: FAIL because the script and bounded query do not exist.

- [ ] **Step 3: Add a bounded candidate query**

In `orderService.ts`, add an internal backfill row type containing the mapped `PaymentOrder` and normalized stored receiving-account evidence. Query only `status=paid`, `paid_at >= boundary`, order ascending by `paid_at`, and cap the batch. Do not expose `sepay_payload` through public order APIs.

- [ ] **Step 4: Implement dry-run and live modes**

The script must:

```ts
const SEND = process.argv.includes("--send");
const SINCE = "2026-08-01T17:00:00.000Z";
```

Load configured server env, refuse live mode if the accounting recipient, Resend key, Supabase admin config, or current bank account is absent, classify candidates as `eligible`, `alreadySent`, `ambiguous`, or `ineligible`, and call `notifyAccountingForPaidOrder` only for eligible unsent rows in `--send` mode. Print JSON containing counts, total eligible VND, and ambiguous order codes only.

- [ ] **Step 5: Run focused tests and local dry-run safety check**

Run:

```bash
node --test tests/accounting-payment-email.test.mjs
npx tsx scripts/backfill-accounting-payment-emails.ts
```

Expected: test PASS; the script either prints a dry-run aggregate or exits safely with a missing-config message and sends no email.

- [ ] **Step 6: Commit the backfill slice**

```bash
git add services/orderService.ts scripts/backfill-accounting-payment-emails.ts tests/accounting-payment-email.test.mjs
git commit -m "feat: add accounting email backfill"
```

### Task 5: Full verification and documentation

**Files:**
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify: `docs/DATABASE_ARCHITECTURE.md`
- Modify: `docs/SEPAY_SETUP.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/SESSION_STATE.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/FEATURE_REGISTRY.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/TASK_LOG.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/CHANGELOG.md`
- Modify if needed: `/Users/theanh/CodexProjects/Kinh doanh/docs/DECISIONS.md`
- Modify if needed: `/Users/theanh/CodexProjects/Kinh doanh/docs/NEED_VERIFY.md`

- [ ] **Step 1: Run fresh local verification**

Using the bundled Node runtime on macOS, run:

```bash
node --test tests/*.mjs
npx tsc --noEmit --pretty false
npm run lint
git diff --check
npm run build
```

Expected: zero test/type/lint/build failures. Existing explicitly documented warnings may remain only if unchanged.

- [ ] **Step 2: Update repository and workspace contracts**

Record the shared paid-event accounting notification, two marker columns, recipient env name, failure isolation, backfill boundary, files changed, and exact verification evidence. Do not record customer PII, bank account numbers, provider tokens, or raw errors.

- [ ] **Step 3: Commit verified implementation and docs**

```bash
git add .env.example app lib services scripts supabase tests docs
git commit -m "docs: record accounting payment notification flow"
```

### Task 6: Production migration, configuration, deploy, and backfill

**Files:**
- No new source files; production Supabase, Vercel environment, deployment, and aggregate handoff updates only.

- [ ] **Step 1: Run protected predeploy checks**

Confirm the branch/worktree is the allowed `theanh-main` deploy source, the worktree is clean, the release diff contains no unrelated landing/price/tracking changes, and all active landing smoke checks required by `AGENTS.md` pass.

- [ ] **Step 2: Apply and verify migration**

Apply `20260803090000_add_accounting_email_markers.sql` to the production Supabase project, then use a read-only schema query to confirm both nullable columns exist. Do not update any order row during schema verification.

- [ ] **Step 3: Set recipient and deploy**

Set `ACCOUNTING_NOTIFICATION_EMAIL` to the approved address in Vercel Production without printing other environment values. Deploy the exact clean commit through the existing protected project configuration and wait for `READY`.

- [ ] **Step 4: Run live safety smoke**

Verify public payment pages remain 200, protected routes remain protected, invalid/unauthenticated SePay and manual-confirm requests remain rejected, and runtime error logs are clean. Do not create a synthetic paid order.

- [ ] **Step 5: Run read-only backfill dry run**

Execute the production-configured script without `--send`. Compare eligible count and total VND with a separate read-only paid-order aggregate. Stop if any ambiguous order cannot be tied to the Greezhub period.

- [ ] **Step 6: Send the approved backfill once**

Execute the same script with `--send`, record aggregate attempted/sent/skipped/failed counts, and do not expose customer PII in logs or handoff.

- [ ] **Step 7: Prove idempotency**

Re-run dry-run and require every eligible order to appear as already sent with zero new send candidates. Query marker counts and failures read-only.

- [ ] **Step 8: Final documentation commit**

Append production deployment ID, migration verification, aggregate backfill results, smoke commands, and remaining failures/ambiguities to repository and workspace handoffs, then commit only those documentation changes.
