# Zalo ZNS Pending-Payment Reminder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send one approved Zalo ZBS transfer reminder 5–6 minutes after registration for still-pending Ebook Facebook Ads 2026 and Facebook Ads 2026 purchases, with a safe path into the existing payment page and bank/VietQR flow.

**Architecture:** A Supabase Cron job calls a `CRON_SECRET`-protected Next.js worker every minute. A lease-fenced Postgres outbox atomically claims only eligible pending orders, the worker rereads status immediately before the provider call, and a terminal success marker prevents duplicates. Zalo OAuth credentials stay server-only in a restricted database credential store; provider details are implemented only after they are copied from the authenticated official Zalo API Explorer into a redacted contract fixture. Production delivery is disabled by default and requires an approved template, rollout timestamp, and explicit daily spend/message cap.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres/RPC/Cron, Zalo ZBS OpenAPI, Node test runner, ESLint.

---

## Guardrails that apply to every task

- Work only in `/Users/theanh/CodexProjects/TheAnh-Web/worktrees/theanhmarketing-email-account-hotfix` for website code and `/Users/theanh/CodexProjects/Kinh doanh/docs` for mandatory workspace handoff docs.
- Preserve the pre-existing dirty changes in `CURRENT_STATE.md`, `FEATURE_MAP.md`, and `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`; inspect the diff before editing and stage only the lines/files owned by this task.
- Never print, commit, screenshot, paste into tests, or return Zalo app secrets, access tokens, refresh tokens, `CRON_SECRET`, Supabase service-role keys, or customer phone numbers.
- Do not enable production ZNS sends until the template is approved, a controlled test succeeds, and the owner supplies the daily message cap. No historical backfill.
- Treat only exact slugs `facebook-ads-2026` and `ebook-facebook-ads-2026` as eligible. Title substring matching is forbidden.
- Treat only `status = 'pending'` as eligible. `paid`, `failed`, and `expired` are terminal exclusions.
- The canonical CTA is `https://www.theanhmarketing.com/thanh-toan/<order_code>?openBank=1`; amount, bank account, and transfer content remain server-derived.

## Task 1: Freeze the official Zalo contract without secrets

**Files:**

- Create: `docs/integrations/zalo-zbs-api-contract.md`
- Create: `tests/fixtures/zalo-zbs-contract.json`
- Create: `tests/zalo-zbs-contract.test.mjs`

- [ ] In the authenticated Zalo API Explorer, select the current app, OA, and the phone-delivered ZBS Template API. Record only the following non-secret facts in `docs/integrations/zalo-zbs-api-contract.md`: official documentation URL, send endpoint, HTTP method, access-token header name and scheme, request field names, success/error envelope fields, timeout/retry guidance, OAuth refresh endpoint/method/content type, whether refresh tokens rotate, and the exact approved template variable names.
- [ ] Use the official page currently exposed at [Zalo Developers](https://developers.zalo.me/docs/) and API Explorer as the authority. If the authenticated UI disagrees with cached public documentation, stop and add the discrepancy to `/Users/theanh/CodexProjects/Kinh doanh/docs/NEED_VERIFY.md`; do not choose one silently.
- [ ] Create `tests/fixtures/zalo-zbs-contract.json` containing only public contract metadata. Its top-level keys are exactly `verified_at`, `official_documentation_url`, `send`, `oauth_refresh`, and `template_variables`. `send` contains `method`, `url`, `access_token_header`, `request_fields`, `success_fields`, and `error_fields`; `oauth_refresh` contains `method`, `url`, `content_type`, and `refresh_token_rotates`. Populate every value directly from the authenticated API Explorer before saving the file; empty field arrays are invalid.
- [ ] Write `tests/zalo-zbs-contract.test.mjs` to reject an unfinished or secret-bearing fixture:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contract = JSON.parse(fs.readFileSync("tests/fixtures/zalo-zbs-contract.json", "utf8"));
const serialized = JSON.stringify(contract);

test("ZBS contract is verified and contains no credentials", () => {
  assert.equal(contract.verified_at, "2026-08-03");
  assert.match(contract.official_documentation_url, /^https:\/\/developers\.zalo\.me\//);
  assert.equal(contract.send.method, "POST");
  assert.match(contract.send.url, /^https:\/\//);
  assert.ok(contract.send.request_fields.length > 0);
  assert.ok(contract.send.success_fields.length > 0);
  assert.ok(contract.send.error_fields.length > 0);
  assert.ok(contract.template_variables.length > 0);
  assert.doesNotMatch(serialized, /access[_-]?token["']?\s*:\s*["'][A-Za-z0-9_-]{16,}|refresh[_-]?token["']?\s*:\s*["'][A-Za-z0-9_-]{16,}/i);
});
```

- [ ] Run `node --test tests/zalo-zbs-contract.test.mjs` using the workspace Node runtime. Expected: PASS only after all official values are recorded and all placeholders are gone.
- [ ] Commit:

```bash
git add docs/integrations/zalo-zbs-api-contract.md tests/fixtures/zalo-zbs-contract.json tests/zalo-zbs-contract.test.mjs
git commit -m "docs: lock verified Zalo ZBS API contract"
```

## Task 2: Add a lease-fenced ZNS outbox and restricted OAuth store

**Files:**

- Create: `supabase/migrations/20260803090000_zalo_pending_payment_outbox.sql`
- Create: `tests/zalo-pending-payment-outbox.test.mjs`
- Reference: `supabase/migrations/20260727150000_meta_purchase_outbox.sql`

- [ ] Start with a failing contract test that requires the migration to provide:

```js
test("pending-payment ZNS uses an exact-scope lease-fenced outbox", () => {
  const sql = read("supabase/migrations/20260803090000_zalo_pending_payment_outbox.sql");
  assert.match(sql, /claim_pending_payment_zns_orders/);
  assert.match(sql, /finish_pending_payment_zns_order/);
  assert.match(sql, /FOR UPDATE\s+SKIP LOCKED/i);
  assert.match(sql, /interval\s*'5 minutes'/i);
  assert.match(sql, /interval\s*'10 minutes'/i);
  assert.match(sql, /zns_pending_payment_attempt_count\s*<\s*3/i);
  assert.match(sql, /o\.status\s*=\s*'pending'/i);
  assert.match(sql, /facebook-ads-2026/);
  assert.match(sql, /ebook-facebook-ads-2026/);
  assert.match(sql, /lease_token\s+is distinct from\s+p_lease_token/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /grant execute[\s\S]*service_role/i);
  assert.doesNotMatch(sql, /insert[\s\S]*access_token|insert[\s\S]*refresh_token/i);
});
```

- [ ] Run `node --test tests/zalo-pending-payment-outbox.test.mjs`. Expected: FAIL because the migration does not exist.
- [ ] Add these independent fields to `public.orders`:

```sql
zns_pending_payment_state text,
zns_pending_payment_attempt_count integer not null default 0,
zns_pending_payment_last_attempt_at timestamptz,
zns_pending_payment_next_attempt_at timestamptz,
zns_pending_payment_lease_token uuid,
zns_pending_payment_lease_expires_at timestamptz,
zns_pending_payment_last_error text,
zns_pending_payment_sent_at timestamptz,
zns_pending_payment_message_id text
```

- [ ] Constrain state to `pending`, `sending`, `retry`, `sent`, `cancelled`, or `dead`; constrain lease token/expiry to be both null or both non-null; cap stored error at 800 characters and provider message ID at 160 characters.
- [ ] Create `private.zalo_oauth_credentials` with exactly one logical record keyed by `integration = 'zbs'`, fields for access token, refresh token, access expiry, and update time. Revoke all direct privileges from `public`, `anon`, and `authenticated`; expose security-definer RPCs only to `service_role`. Do not seed any token in the migration.
- [ ] Implement `claim_pending_payment_zns_orders(p_limit integer, p_rollout_at timestamptz, p_daily_limit integer)` with all of these conditions in one transaction:

```sql
o.status = 'pending'
and o.created_at >= p_rollout_at
and o.created_at <= v_now - interval '5 minutes'
and o.created_at >= v_now - interval '24 hours'
and coalesce(o.zns_pending_payment_attempt_count, 0) < 3
```

The product predicate must accept a single exact approved slug or the two-product approved bundle, and must reject a row containing any third slug. Extract slugs from both comma-separated `course_slug` and `order_items[*].slug`, then require the normalized set to be non-empty and a subset of the two-item allowlist. The positive portion is:

```sql
exists (
  select 1
  from unnest(string_to_array(coalesce(o.course_slug, ''), ',')) as raw_slug
  where trim(raw_slug) in ('facebook-ads-2026', 'ebook-facebook-ads-2026')
)
or exists (
  select 1
  from jsonb_array_elements(coalesce(to_jsonb(o.order_items), '[]'::jsonb)) as item
  where item->>'slug' in ('facebook-ads-2026', 'ebook-facebook-ads-2026')
)
```

Add a matching `not exists` rejection for every normalized slug outside `('facebook-ads-2026', 'ebook-facebook-ads-2026')`.

- [ ] Inside the claim RPC, use `pg_advisory_xact_lock` on a fixed feature-specific key before counting today’s `sent` plus unexpired `sending` rows. Claim at most the remaining `p_daily_limit`, use `FOR UPDATE SKIP LOCKED`, create a UUID lease, and set a ten-minute expiry. Reject null/invalid rollout timestamps, limits outside `1..1000`, and batch sizes outside `1..25`.
- [ ] Return only the order fields needed to send: order code, student name, phone, exact course identifiers/title, amount/currency, status, creation time, order items, attempt count, and lease token. Never return email or Zalo credentials.
- [ ] Implement `finish_pending_payment_zns_order(p_order_code, p_lease_token, p_outcome, p_next_attempt_at, p_error, p_message_id)` with lease fencing. Outcomes behave exactly as follows:

  - `sent`: terminal, sets `sent_at`, clears lease/error, stores bounded message ID.
  - `retry`: only valid with a future retry time and attempts below three; clears lease and stores a safe bounded error.
  - `cancelled`: terminal for paid/expired/failed, invalid phone, or ineligible product discovered by the second check.
  - `dead`: terminal after attempt three or a non-retryable provider/configuration rejection.

- [ ] Add RPCs `get_zalo_oauth_credentials()` and `replace_zalo_oauth_credentials(p_access_token text, p_refresh_token text, p_access_expires_at timestamptz)`, granted only to `service_role`. Reject blank tokens and invalid expiry values. The replace RPC must update both tokens atomically when the verified Zalo contract says refresh tokens rotate.
- [ ] Run `node --test tests/zalo-pending-payment-outbox.test.mjs`. Expected: PASS.
- [ ] Commit:

```bash
git add supabase/migrations/20260803090000_zalo_pending_payment_outbox.sql tests/zalo-pending-payment-outbox.test.mjs
git commit -m "feat: add durable pending-payment ZNS outbox"
```

## Task 3: Build pure eligibility, phone, URL, and template mapping

**Files:**

- Create: `lib/zalo/pending-payment.ts`
- Create: `tests/zalo-pending-payment-mapper.test.mjs`
- Reference: `lib/notifications/pending-payment-email.ts`
- Reference: `lib/payments/sepay.ts`

- [ ] Write failing tests for all of these cases:

  - exact `facebook-ads-2026` is eligible;
  - exact `ebook-facebook-ads-2026` is eligible;
  - the bundle containing both exact slugs is eligible;
  - a bundle containing either approved slug plus any third product is excluded;
  - `facebook-ads-2026-copy`, title-only matches, support, consultation, AI Master, and Agent Kit are excluded;
  - `0901234567` and `+84901234567` normalize to the exact phone form required by the verified fixture;
  - invalid, landline, blank, or non-Vietnamese phone values return a typed failure;
  - the payment URL is the fixed origin/path plus `?openBank=1` and cannot be overridden by input;
  - template data uses “khóa học”, never “đơn hàng”, and includes customer name, product name, registration code, formatted VND amount, transfer content, and `Chờ thanh toán`;
  - `tracking_id` is stable for a given order code and channel.

- [ ] Run `node --test tests/zalo-pending-payment-mapper.test.mjs`. Expected: FAIL because the mapper does not exist.
- [ ] Implement and export these pure functions:

```ts
export const ZNS_ELIGIBLE_COURSE_SLUGS = new Set([
  "facebook-ads-2026",
  "ebook-facebook-ads-2026",
]);

export function isPendingPaymentZnsEligible(input: {
  courseSlug?: string | null;
  orderItems?: Array<{ slug?: string | null }> | null;
}): boolean;

export function normalizeVietnamMobileForZalo(phone: string):
  | { ok: true; phone: string }
  | { ok: false; reason: "missing_phone" | "invalid_phone" };

export function buildPendingPaymentUrl(orderCode: string): string;
export function buildPendingPaymentZbsPayload(order: PendingPaymentZnsOrder): PendingPaymentZbsPayload;
```

- [ ] Import existing `formatVnd` and the order’s authoritative transfer reference. Do not accept amount, bank account, or transfer content from query parameters.
- [ ] Derive the final payload keys from `tests/fixtures/zalo-zbs-contract.json`; fail closed if the approved template variable list differs from the mapper’s exact keys.
- [ ] Run `node --test tests/zalo-pending-payment-mapper.test.mjs`. Expected: PASS.
- [ ] Commit:

```bash
git add lib/zalo/pending-payment.ts tests/zalo-pending-payment-mapper.test.mjs
git commit -m "feat: map pending course payments to ZBS template"
```

## Task 4: Implement the server-only Zalo OAuth and ZBS provider boundary

**Files:**

- Create: `lib/zalo/client.ts`
- Create: `tests/zalo-client.test.mjs`
- Reference: `tests/fixtures/zalo-zbs-contract.json`
- Reference: `lib/supabase/admin.ts`

- [ ] Write tests using a stubbed `fetch` and stubbed credential repository. Cover: valid access token, expired access token refresh, rotated refresh-token persistence, one refresh-and-retry after an authentication error, provider timeout, retryable 429/5xx, non-retryable 4xx, safe message ID extraction, and redaction of phone/token/provider body from returned errors.
- [ ] Run `node --test tests/zalo-client.test.mjs`. Expected: FAIL because the client does not exist.
- [ ] Implement environment validation for only non-rotating configuration:

```text
ZALO_APP_ID
ZALO_APP_SECRET
ZALO_ZNS_PENDING_PAYMENT_TEMPLATE_ID
```

Access and refresh tokens must come from the restricted RPC store created in Task 2, not a client bundle or committed file.
- [ ] Build request URLs, headers, encodings, request keys, and response parsing from the verified fixture. Do not duplicate a remembered endpoint as an independent constant; the test must assert the implementation matches the fixture.
- [ ] Use `AbortSignal.timeout(10_000)`. Return a discriminated result containing only `ok`, `retryable`, safe reason code, HTTP status when safe, and provider message ID when successful.
- [ ] Refresh under a database advisory lock so concurrent workers do not rotate the same refresh token twice. Persist the new access token and, when documented, the rotated refresh token before retrying the send.
- [ ] Never log raw request/response bodies. Add a source test assertion that rejects `console.log`, `console.warn`, or `console.error` calls containing token, phone, payload, or response variables.
- [ ] Run `node --test tests/zalo-client.test.mjs tests/zalo-zbs-contract.test.mjs`. Expected: PASS.
- [ ] Commit:

```bash
git add lib/zalo/client.ts tests/zalo-client.test.mjs
git commit -m "feat: add secure Zalo ZBS provider client"
```

## Task 5: Implement the second-check dispatcher and bounded retries

**Files:**

- Create: `lib/zalo/pending-payment-outbox.ts`
- Create: `tests/zalo-pending-payment-dispatcher.test.mjs`
- Reference: `lib/meta/purchase-outbox.ts`
- Reference: `services/orderService.ts`

- [ ] Write failing tests for the dispatcher summary and safety behavior:

```ts
type PendingPaymentZnsDispatchSummary = {
  claimed: number;
  sent: number;
  retried: number;
  cancelled: number;
  dead: number;
  lostLease: number;
  disabled: boolean;
  error?: string;
};
```

Tests must prove:

  - missing/false `ZALO_ZNS_ENABLED` claims nothing;
  - missing rollout timestamp or daily limit claims nothing;
  - the worker rereads `status`, `course_slug`, `order_items`, phone, and amount by order code after claiming;
  - a row changed to paid is cancelled without calling Zalo;
  - an ineligible or invalid-phone row is cancelled without calling Zalo;
  - a successful provider response finishes `sent` once;
  - retryable failures use delays of 5 minutes then 15 minutes;
  - attempt three becomes `dead` and never schedules attempt four;
  - a lost lease increments only `lostLease`;
  - summary/error strings contain no customer data or credentials.

- [ ] Run `node --test tests/zalo-pending-payment-dispatcher.test.mjs`. Expected: FAIL because the dispatcher does not exist.
- [ ] Implement `dispatchPendingPaymentZnsOrders({ limit = 10 })`. It must parse these explicit rollout controls:

```text
ZALO_ZNS_ENABLED=true
ZALO_ZNS_ROLLOUT_AT=<ISO-8601 deployment timestamp>
ZALO_ZNS_DAILY_LIMIT=<owner-approved integer>
```

- [ ] Claim through `claim_pending_payment_zns_orders`, then reread each order from `public.orders` immediately before `sendPendingPaymentZbs`. If the reread is not exactly pending/eligible or its authoritative amount/course/phone is unusable, finish as `cancelled` without a provider call.
- [ ] Use retry delays `[5, 15]`; attempt three is terminal `dead`. Treat timeouts, 429, and 5xx as retryable. Treat invalid template, invalid recipient, permission/configuration errors, and other documented permanent codes as `dead`.
- [ ] Ensure the stable provider tracking key is `pending-payment:<UPPERCASE_ORDER_CODE>` if the official contract supports it. If it does not, record that constraint in the contract doc and rely solely on the database lease/sent marker.
- [ ] Run `node --test tests/zalo-pending-payment-dispatcher.test.mjs`. Expected: PASS.
- [ ] Commit:

```bash
git add lib/zalo/pending-payment-outbox.ts tests/zalo-pending-payment-dispatcher.test.mjs
git commit -m "feat: dispatch pending-payment ZNS safely"
```

## Task 6: Add the protected cron route

**Files:**

- Create: `app/api/zalo/pending-payment/send-due/route.ts`
- Create: `tests/zalo-pending-payment-route.test.mjs`
- Reference: `app/api/meta/purchase-retry/route.ts`

- [ ] Write a failing source-level route test requiring Node runtime, exact bearer authorization with `CRON_SECRET`, a batch limit of 10, GET and POST support, and an aggregate-only response that excludes phone, name, email, token, payload, and provider response bodies.
- [ ] Run `node --test tests/zalo-pending-payment-route.test.mjs`. Expected: FAIL because the route does not exist.
- [ ] Implement the route using the existing protected route pattern:

```ts
import { NextResponse } from "next/server";
import { dispatchPendingPaymentZnsOrders } from "@/lib/zalo/pending-payment-outbox";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("Authorization") === `Bearer ${secret}`);
}

async function handle(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await dispatchPendingPaymentZnsOrders({ limit: 10 });
  return NextResponse.json({ ok: !result.error, ...result }, { status: result.error ? 503 : 200 });
}

export const GET = handle;
export const POST = handle;
```

- [ ] Run `node --test tests/zalo-pending-payment-route.test.mjs`. Expected: PASS.
- [ ] Commit:

```bash
git add app/api/zalo/pending-payment/send-due/route.ts tests/zalo-pending-payment-route.test.mjs
git commit -m "feat: expose protected pending-payment ZNS worker"
```

## Task 7: Add verified bank-app handoff with mandatory fallback

**Files:**

- Create: `lib/payments/bank-app-handoff.ts`
- Create: `components/payment/bank-app-handoff.tsx`
- Modify: `app/thanh-toan/[code]/page.tsx`
- Create: `tests/bank-app-handoff.test.mjs`
- Reference: `components/payment/transfer-details.tsx`
- Reference: `lib/payments/sepay.ts`

- [ ] Before coding, verify from VietQR/NAPAS or the target bank’s official developer documentation whether a universal browser-to-bank-app URL exists and which parameters are supported. Record the authoritative URL and supported-platform behavior in `docs/integrations/zalo-zbs-api-contract.md`. Do not use an unofficial deep-link list.
- [ ] If no official universal link is documented, implement `openBank=1` as a handoff prompt that leaves the existing QR and copy controls visible and provides a user-gesture button only for an officially verified bank/app URL. Do not claim that every bank opens automatically.
- [ ] Write failing tests proving that:

  - only `openBank=1` activates the handoff UI;
  - the URL builder receives server-derived bank, account, amount, and transfer content;
  - arbitrary search params cannot override payment data;
  - unsupported desktop/mobile environments keep QR and `TransferDetails` visible;
  - automatic navigation is attempted at most once and never loops on return;
  - the user can always dismiss the prompt and copy transfer details.

- [ ] Run `node --test tests/bank-app-handoff.test.mjs`. Expected: FAIL because the component/helper do not exist.
- [ ] Implement a small client component that attempts only the verified scheme and stores a session-scoped attempted marker keyed by order code. Render it near the current QR/`TransferDetails`, without changing SePay reconciliation or payment status polling.
- [ ] Update the page’s server component to pass only authoritative order/config values. Keep `createSepayQrUrl`, `PaymentStatusPoller`, and `TransferDetails` intact.
- [ ] Run `node --test tests/bank-app-handoff.test.mjs`. Expected: PASS.
- [ ] Commit:

```bash
git add lib/payments/bank-app-handoff.ts components/payment/bank-app-handoff.tsx app/thanh-toan/'[code]'/page.tsx tests/bank-app-handoff.test.mjs docs/integrations/zalo-zbs-api-contract.md
git commit -m "feat: add safe bank-app payment handoff"
```

## Task 8: Create and submit the approved ZBS template

**Files:**

- Use: `public/zalo-zns/pending-course-payment-reminder-v3.png`
- Modify after approval: deployment environment variable `ZALO_ZNS_PENDING_PAYMENT_TEMPLATE_ID`
- Update: `docs/integrations/zalo-zbs-api-contract.md`

- [ ] With computer use, open ZBS template creation for OA `Greezhub Academy - The Anh Marketing` and choose `Mẫu yêu cầu chuyển khoản`.
- [ ] Upload `public/zalo-zns/pending-course-payment-reminder-v3.png` and enter the approved customer wording exactly:

```text
Hoàn tất thanh toán khóa học

Chào <customer_name>, khóa học <product_name> của bạn vẫn đang chờ thanh toán. Vui lòng hoàn tất để hệ thống xác nhận và gửi quyền truy cập.
```

- [ ] Configure the bill rows as registration code, course, amount, transfer content, and status `Chờ thanh toán`. Configure one business action labeled `MỞ APP NGÂN HÀNG` using the allowlisted payment URL pattern.
- [ ] Preview both eligible product variants and confirm the UI contains no incorrect logo, no “đơn hàng” customer wording, no embedded account/price in the action URL, and both Ebook and Facebook Ads artwork.
- [ ] Submit for Zalo review. Record the template ID, submission date, approval status, exact variable names, and current per-message estimate in the contract doc; record no token.
- [ ] Stop here if the template is not approved. Do not set `ZALO_ZNS_ENABLED=true` and do not run a real provider-send test.
- [ ] After approval, set `ZALO_ZNS_PENDING_PAYMENT_TEMPLATE_ID` in preview/staging first. Keep production disabled.
- [ ] Commit the non-secret status update:

```bash
git add docs/integrations/zalo-zbs-api-contract.md
git commit -m "docs: record approved ZBS payment template"
```

## Task 9: Schedule the worker safely in Supabase Cron

**Files:**

- Create: `docs/runbooks/zalo-zns-pending-payment.md`
- Create: `tests/zalo-pending-payment-runbook.test.mjs`

- [ ] Write a runbook contract test requiring: one-minute cadence, protected route path, Vault/secret-manager use, rollout timestamp, daily cap, disable switch, controlled test, no backfill, and rollback steps.
- [ ] Run `node --test tests/zalo-pending-payment-runbook.test.mjs`. Expected: FAIL before the runbook exists.
- [ ] In `docs/runbooks/zalo-zns-pending-payment.md`, document the exact Supabase Dashboard steps to enable `pg_cron`/`pg_net`, store the target URL and bearer secret in Supabase Vault, and create one every-minute job that POSTs `/api/zalo/pending-payment/send-due`. Never put the bearer secret in a migration, screenshot, shell history, or committed SQL.
- [ ] Document safe rollout order:

  1. deploy code and migration with `ZALO_ZNS_ENABLED=false`;
  2. seed current Zalo tokens through the restricted RPC in a private SQL session;
  3. set the approved template ID;
  4. set `ZALO_ZNS_ROLLOUT_AT` to the current deployment timestamp so older orders cannot backfill;
  5. set the owner-approved `ZALO_ZNS_DAILY_LIMIT`;
  6. run one owner-approved test phone/order;
  7. set `ZALO_ZNS_ENABLED=true` only after the test passes;
  8. enable the one-minute Cron job.

- [ ] Document rollback: disable/delete the Cron job first, set `ZALO_ZNS_ENABLED=false`, preserve outbox evidence, and never clear `sent_at` markers.
- [ ] Run `node --test tests/zalo-pending-payment-runbook.test.mjs`. Expected: PASS.
- [ ] Commit:

```bash
git add docs/runbooks/zalo-zns-pending-payment.md tests/zalo-pending-payment-runbook.test.mjs
git commit -m "docs: add ZNS pending-payment operations runbook"
```

## Task 10: Verify the complete flow and update mandatory handoff docs

**Files:**

- Modify carefully: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify carefully: `CURRENT_STATE.md`
- Modify carefully: `FEATURE_MAP.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/SESSION_STATE.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/FEATURE_REGISTRY.md`
- Append: `/Users/theanh/CodexProjects/Kinh doanh/docs/TASK_LOG.md`
- Append: `/Users/theanh/CodexProjects/Kinh doanh/docs/CHANGELOG.md`
- Modify if needed: `/Users/theanh/CodexProjects/Kinh doanh/docs/DECISIONS.md`
- Modify if needed: `/Users/theanh/CodexProjects/Kinh doanh/docs/NEED_VERIFY.md`

- [ ] First inspect pre-existing diffs with `git diff -- CURRENT_STATE.md FEATURE_MAP.md docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`. Merge only additive ZNS notes; do not overwrite unrelated work.
- [ ] Run the focused suite:

```bash
node --test \
  tests/zalo-zbs-contract.test.mjs \
  tests/zalo-pending-payment-outbox.test.mjs \
  tests/zalo-pending-payment-mapper.test.mjs \
  tests/zalo-client.test.mjs \
  tests/zalo-pending-payment-dispatcher.test.mjs \
  tests/zalo-pending-payment-route.test.mjs \
  tests/bank-app-handoff.test.mjs \
  tests/zalo-pending-payment-runbook.test.mjs
```

Expected: all PASS.

- [ ] Run all repository checks with the configured workspace Node runtime:

```bash
node --test tests/*.mjs
npx tsc --noEmit
npm run lint
npm run build
```

Expected: exit code 0 for every command. If an unrelated existing failure appears, record the exact command/output in `NEED_VERIFY.md`; do not relabel it as a pass.
- [ ] Apply the migration to the non-production Supabase project and test these cases with synthetic orders and an owner-controlled phone: minute 4 no claim, minute 5 claim, status changed to paid before send cancels, overlapping workers produce one provider call, transient failure retries at most twice, and success remains terminal.
- [ ] Smoke-test the route without leaking data:

  - no authorization → HTTP 401 with `{ "ok": false }`;
  - valid authorization while disabled → HTTP 200 aggregate with `disabled: true` and zero claims;
  - controlled enabled test → aggregate counts only;
  - repeated call after success → zero sends.

- [ ] On mobile, open the ZBS action from the controlled test. Confirm the verified bank-app handoff when supported and the existing VietQR/copy fallback when unsupported or blocked. Confirm SePay still reconciles the same order code and amount.
- [ ] Update the repo and workspace docs with: app `main-site`, payment/order/ZNS contracts, exact files changed, migration name, protected route, daily cap control, template approval state, tests run, deployment state, rollback, and next action. Keep secrets and customer data out of docs.
- [ ] Scan for forbidden placeholders/secrets and inspect the final diff:

```bash
rg -n "TBD|TODO|PLACEHOLDER|ZALO_(?:APP_SECRET|OA_ACCESS_TOKEN|OA_REFRESH_TOKEN)\s*=" \
  docs lib app components tests supabase --glob '!superpowers/plans/**'
git diff --check
git status --short
git diff --stat
```

Expected: no unfinished placeholder, no credential assignment, no whitespace errors, and only intended task files plus preserved pre-existing changes.
- [ ] Commit code/docs in their respective repositories. In the website worktree, stage task files explicitly rather than `git add -A`:

```bash
git add \
  app/api/zalo \
  app/thanh-toan/'[code]'/page.tsx \
  components/payment/bank-app-handoff.tsx \
  lib/payments/bank-app-handoff.ts \
  lib/zalo \
  supabase/migrations/20260803090000_zalo_pending_payment_outbox.sql \
  tests/zalo-*.test.mjs \
  tests/bank-app-handoff.test.mjs \
  tests/fixtures/zalo-zbs-contract.json \
  docs/integrations/zalo-zbs-api-contract.md \
  docs/runbooks/zalo-zns-pending-payment.md \
  docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md \
  CURRENT_STATE.md \
  FEATURE_MAP.md
git commit -m "feat: send one ZNS reminder for pending course payments"
```

- [ ] Before enabling production, obtain a written daily message cap from the owner. Report the current Zalo per-message estimate and the resulting maximum daily spend. Without that answer, leave `ZALO_ZNS_ENABLED=false` and mark the feature “implemented, production activation blocked by spend authorization.”

## Completion criteria

- Exactly one successful ZBS reminder can be recorded per eligible order.
- Normal first delivery occurs after minute 5 and before minute 7, subject to provider availability.
- A paid/failed/expired order cannot pass both status checks.
- Only the two exact approved course slugs qualify.
- No provider or Cron credential is present in browser code, logs, API responses, docs, tests, migrations, or Git history.
- The payment CTA cannot override authoritative order values and always retains QR/copy fallback.
- Three attempts in 24 hours is the hard maximum; success, cancelled, and dead are terminal.
- Production remains off until template approval, controlled verification, and owner-approved daily cap are all recorded.
