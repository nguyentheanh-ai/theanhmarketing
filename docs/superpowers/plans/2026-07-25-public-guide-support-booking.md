# Public Guide And Paid Support Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-demo-ready public customer guide and paid 30-minute support booking system with SePay confirmation, owner admin, busy dates, and paid-only Telegram alerts.

**Architecture:** Keep the feature inside the canonical `theanh-main` Next.js app. A focused booking domain module owns Vietnam-time availability and validation; server-only services own Supabase reads/writes; public and owner-only route handlers expose bounded DTOs. Existing order checkout and SePay confirmation remain authoritative, with explicit branching for the non-course `support-session-30m` product.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Supabase/Postgres with RLS, SePay webhook, Telegram Bot API, Node test runner, Playwright.

---

### Task 1: Booking domain contract

**Files:**
- Create: `lib/support-booking/constants.ts`
- Create: `lib/support-booking/domain.ts`
- Test: `tests/support-booking-domain.test.mjs`

- [ ] **Step 1: Write failing tests** for day 0-6 blocking, day 7 opening, day 30 inclusion/day 31 rejection, the exact 30-minute slots, Vietnam-date parsing, contact/note validation, and stale slot rejection.
- [ ] **Step 2: Run** `node --test tests/support-booking-domain.test.mjs` and confirm failure because the domain files do not exist.
- [ ] **Step 3: Implement constants and pure functions** with this public API:

```ts
export const SUPPORT_PRODUCT_SLUG = "support-session-30m";
export const SUPPORT_PRICE_VND = 500_000;
export const SUPPORT_DURATION_MINUTES = 30;
export const SUPPORT_HOLD_MINUTES = 20;
export const SUPPORT_MIN_LEAD_DAYS = 7;
export const SUPPORT_MAX_LEAD_DAYS = 30;

export function listSupportSlots(): string[];
export function getSupportBookingWindow(now: Date): { minDate: string; maxDate: string };
export function validateSupportBookingInput(input: unknown, now: Date): SupportBookingInput;
export function toVietnamAppointment(date: string, time: string): { startsAt: string; endsAt: string };
```

- [ ] **Step 4: Run the focused test** and confirm all cases pass.
- [ ] **Step 5: Commit** `test/support domain` changes.

### Task 2: Additive Supabase schema and atomic reservation RPC

**Files:**
- Create: `supabase/migrations/<generated>_support_booking.sql`
- Test: `tests/support-booking-migration.test.mjs`

- [ ] **Step 1: Write a failing migration contract test** requiring `public.support_bookings`, `public.support_busy_dates`, RLS, revoked `anon/authenticated` table privileges, an order foreign-key index, status checks, and an atomic reservation function with a transaction advisory lock based on the UTC start.
- [ ] **Step 2: Run the focused test** and confirm it fails because the migration is absent.
- [ ] **Step 3: Run `supabase --version` and `supabase migration new support_booking`** so the CLI creates the filename.
- [ ] **Step 4: Implement the additive migration.** Store time as `timestamptz`, amount as `bigint`, local date as `date`, local time as `time`, and status as checked text. Enable RLS and grant no browser role access. Use a short transaction-level advisory lock in a service-role-only RPC to expire stale holds, reject busy dates/occupied slots, and insert one hold.
- [ ] **Step 5: Add indexes** on `(appointment_date, starts_at)`, `(status, starts_at)`, `order_id`, and a partial active-hold index.
- [ ] **Step 6: Run the migration contract test** and confirm it passes. Do not apply the migration to production.
- [ ] **Step 7: Commit** migration and test.

### Task 3: Server booking service and public APIs

**Files:**
- Create: `services/supportBookingService.ts`
- Create: `app/api/support-bookings/availability/route.ts`
- Create: `app/api/support-bookings/route.ts`
- Modify: `services/orderService.ts`
- Test: `tests/support-booking-service.test.mjs`
- Test: `tests/support-booking-api.test.mjs`

- [ ] **Step 1: Write failing tests** proving API parsing happens before database access, unavailable slots return `409`, valid submissions create exactly one 500,000 VND support order and one hold, and responses expose no internal notes or credentials.
- [ ] **Step 2: Run focused tests** and verify expected failures.
- [ ] **Step 3: Extend `orderService` minimally** with a dedicated `createSupportPaymentOrder` path that writes the existing `public.orders` shape with slug `support-session-30m`, one 500,000 VND order item, SePay QR, 20-minute expiry, and no course lookup.
- [ ] **Step 4: Implement `supportBookingService`** so reservation and order linking are idempotent; if order creation fails, cancel/release the hold. Availability returns only dates, slot labels, and availability states.
- [ ] **Step 5: Implement the public routes** with bounded strings, normalized email/phone, `Cache-Control: no-store`, Vietnamese error messages, and rate-limit-compatible response semantics.
- [ ] **Step 6: Run focused tests** and confirm green.
- [ ] **Step 7: Commit** service/API changes.

### Task 4: Payment confirmation and paid-only Telegram

**Files:**
- Modify: `services/checkoutNotificationService.ts`
- Modify: `app/api/sepay/webhook/route.ts`
- Modify: `lib/notifications/telegram.ts`
- Modify: `lib/notifications/payment-success-email.ts`
- Modify: `components/payment/payment-status-poller.tsx`
- Test: `tests/support-booking-payment.test.mjs`
- Modify: `tests/telegram-notifications.test.mjs`
- Modify: `tests/payment-success-email.test.mjs`

- [ ] **Step 1: Write failing tests** requiring generic `[NEW ORDER]` Telegram suppression for the support product, paid webhook promotion, idempotent paid alerting, no course account provisioning, and a booking confirmation email/redirect.
- [ ] **Step 2: Run focused tests** and verify failures describe the missing support branch.
- [ ] **Step 3: Add `buildTelegramSupportBookingMessage` and `sendTelegramSupportBookingNotification`** without changing existing course messages.
- [ ] **Step 4: Branch checkout entry notifications** so support orders may send the customer pending-payment email but never the generic order-created Telegram message.
- [ ] **Step 5: Branch the paid webhook after existing amount/account/idempotency checks** to atomically confirm the booking, send the customer booking confirmation, then send Telegram once. A lost/expired slot becomes `needs_review` and does not overwrite another booking.
- [ ] **Step 6: Redirect paid support checkout** to `/dat-lich-ho-tro/thanh-cong?order=<code>` while preserving every existing course/Ebook redirect.
- [ ] **Step 7: Run focused tests** and confirm green.
- [ ] **Step 8: Commit** payment/notification changes.

### Task 5: Public booking UI

**Files:**
- Create: `app/dat-lich-ho-tro/page.tsx`
- Create: `app/dat-lich-ho-tro/thanh-cong/page.tsx`
- Create: `components/support-booking/support-booking-form.tsx`
- Test: `tests/support-booking-ui.test.mjs`

- [ ] **Step 1: Write a failing UI contract test** for public metadata, 30-day range, always-busy first seven days, two-step date/time selection, 500,000 VND price, 30-minute duration, required note, and checkout redirect.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Build the server page and client form** using the approved premium-minimal system, semantic buttons, live availability refresh, selected-slot summary, inline errors, loading state, and mobile single-column layout.
- [ ] **Step 4: Build the success page** showing paid booking details from a server-safe lookup and a fallback owner-review message.
- [ ] **Step 5: Run the UI test** and confirm green.
- [ ] **Step 6: Commit** booking UI changes.

### Task 6: Owner admin and busy-day control

**Files:**
- Create: `app/admin/crm-v2/support-bookings/page.tsx`
- Create: `components/crm-v2/support-bookings-client.tsx`
- Create: `app/api/admin/crm-v2/support-bookings/route.ts`
- Create: `app/api/admin/crm-v2/support-bookings/actions/route.ts`
- Modify: `components/crm-v2/crm-components.tsx`
- Test: `tests/support-booking-admin.test.mjs`

- [ ] **Step 1: Write failing tests** for canonical nav presence, owner guard before parsing/querying, paid-only confirmed list, no PII in unauthenticated responses, whole-day busy toggle, and refusal to unblock the rolling seven-day lock.
- [ ] **Step 2: Run focused tests** and verify expected failures.
- [ ] **Step 3: Add `Lịch hỗ trợ` to CRM navigation** and implement the owner-only page with confirmed booking table, status badge, detail note, and 30-day busy-date grid.
- [ ] **Step 4: Implement owner-only read/action routes** using existing `requireOwnerRole`/admin auth conventions and no-store responses.
- [ ] **Step 5: Run focused tests** and confirm green.
- [ ] **Step 6: Commit** admin changes.

### Task 7: Public guide, screenshots, and student CTA

**Files:**
- Create: `app/huong-dan/page.tsx`
- Create: `components/guide/customer-access-guide.tsx`
- Create: `public/huong-dan/*.webp`
- Modify: `components/app/student-dashboard.tsx`
- Test: `tests/public-customer-guide.test.mjs`
- Modify: `tests/student-dashboard-course-selection.test.mjs`

- [ ] **Step 1: Write failing tests** for a public no-auth guide, payment/email/login/course/Ebook steps, Inbox/Spam reminder, online-reader/PDF actions, and replacement of both old support buttons with one booking CTA.
- [ ] **Step 2: Run focused tests** and verify expected failures.
- [ ] **Step 3: Build `/huong-dan`** with one clear timeline, short copy, accessible screenshot captions, login and booking CTAs, and no protected content.
- [ ] **Step 4: Replace the dashboard support actions** with `Đặt lịch hỗ trợ` pointing to `/dat-lich-ho-tro`; preserve the anchor and dark/light styles.
- [ ] **Step 5: Start local Next.js, render synthetic payment/email/login/dashboard/Ebook states, capture screenshots, crop/redact if required, convert to WebP, and reference only those safe assets in the guide.
- [ ] **Step 6: Run focused tests** and confirm green.
- [ ] **Step 7: Commit** guide/assets/dashboard changes.

### Task 8: Local demo QA and mandatory handoff docs

**Files:**
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify: `E:/Kinh doanh/docs/SESSION_STATE.md`
- Modify: `E:/Kinh doanh/docs/FEATURE_REGISTRY.md`
- Modify: `E:/Kinh doanh/docs/TASK_LOG.md`
- Modify: `E:/Kinh doanh/docs/CHANGELOG.md`
- Modify if needed: `E:/Kinh doanh/docs/DECISIONS.md`
- Modify if needed: `E:/Kinh doanh/docs/NEED_VERIFY.md`

- [ ] **Step 1: Run focused booking/guide/payment/admin tests.**
- [ ] **Step 2: Run full verification:**

```powershell
node --test tests\*.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run lint
git diff --check
npm.cmd run build
```

- [ ] **Step 3: Run local browser QA** at desktop and 390px mobile for `/huong-dan`, `/dat-lich-ho-tro`, success state, student CTA, and synthetic owner admin. Confirm no console/page errors and no horizontal overflow.
- [ ] **Step 4: Confirm Git diff excludes** `public/academy/facebook-ads-master-2026.html` and `public/ladipage/facebook-ads-2026.html` from this task's staged changes.
- [ ] **Step 5: Update all mandatory workspace and repo handoff docs** with local-demo status, schema-not-applied state, commands/results, and the explicit next step: owner review before deploy.
- [ ] **Step 6: Commit** only this task's files. Do not deploy.
