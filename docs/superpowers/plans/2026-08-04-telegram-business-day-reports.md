# Telegram Business-Day Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send accurate 08:00 snapshot and 14:00 full-day paid-order/Meta Ads reports to the existing Telegram group.

**Architecture:** Vercel Cron calls two protected Next.js routes. A reporting service builds exact Vietnam-time windows, queries canonical paid orders and exact-window Meta hourly spend, calculates the owner-approved costs, claims a durable delivery key, and sends aggregate-only Telegram text.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Supabase/Postgres, Meta Graph API, Telegram Bot API, Vercel Cron, Node test runner.

---

## File map

- Create `lib/reports/telegram-business-day.ts`: pure windows, calculations, and message formatting.
- Modify `lib/meta-ads/timezone.ts`: exact UTC-window aggregation of advertiser-hour rows.
- Modify `services/metaAdsReportService.ts`: expose exact-window Meta report retrieval.
- Modify `lib/notifications/telegram.ts`: reusable plain-text Telegram sender.
- Create `services/telegramBusinessReportService.ts`: canonical paid-order query, ledger claim, orchestration, and delivery.
- Create `app/api/reports/telegram/morning/route.ts` and `app/api/reports/telegram/full-day/route.ts`: protected cron/manual entry points.
- Create `supabase/migrations/20260804090000_telegram_business_report_runs.sql`: durable unique delivery ledger and claim RPC.
- Modify `vercel.json`: 01:00 and 07:00 UTC schedules.
- Create `tests/telegram-business-day-report.test.mjs`: contract and pure behavior coverage.
- Modify operational docs required by the workspace end protocol.

### Task 1: Lock window and finance rules with failing tests

- [ ] **Step 1: Write tests** in `tests/telegram-business-day-report.test.mjs` asserting:

```js
assert.deepEqual(buildTelegramReportWindow("morning", now), {
  startIso: "2026-08-03T07:00:00.000Z",
  endIso: "2026-08-04T01:00:00.000Z",
});
assert.deepEqual(calculateTelegramBusinessMetrics({ grossReceived: 10_000_000, adSpend: 2_000_000 }), {
  vat: 800_000,
  conversionFee: 40_000,
  estimatedResult: 7_160_000,
});
```

- [ ] **Step 2: Run** `node --test tests/telegram-business-day-report.test.mjs` and verify it fails because the module does not exist.
- [ ] **Step 3: Implement** `buildTelegramReportWindow`, `calculateTelegramBusinessMetrics`, and `buildTelegramBusinessReportMessage` in `lib/reports/telegram-business-day.ts`, using half-open UTC intervals derived from Vietnam wall-clock boundaries.
- [ ] **Step 4: Run** the focused test and verify both 08:00 and 14:00 windows, currency rounding, positive/negative result copy, `[TEST]`, and unavailable-Ads copy pass.
- [ ] **Step 5: Commit** the pure rules and tests.

### Task 2: Add exact-window Meta Ads support

- [ ] **Step 1: Add a failing timezone test** proving rows before the start and at the exclusive end are excluded while rows inside are summed.
- [ ] **Step 2: Run** `npx tsx --test tests/meta-ads-timezone.test.ts` and verify the missing exact-window function fails.
- [ ] **Step 3: Add** `aggregateMetaAdsForUtcWindow(rows, { startIso, endIso }, advertiserTimezone)` to `lib/meta-ads/timezone.ts`; convert every advertiser hour to UTC and filter with `start <= hour < end`.
- [ ] **Step 4: Refactor** `services/metaAdsReportService.ts` so `getMetaAdsReportForWindow` reuses account lookup, paging, timeout, error mapping, and returns `unavailable` instead of zero on failure.
- [ ] **Step 5: Run** focused Meta and report tests and commit.

### Task 3: Add durable delivery and Telegram orchestration

- [ ] **Step 1: Extend failing tests** to require aggregate paid-order selection, no PII fields in the message, fail-closed Meta behavior, duplicate scheduled-run skip, and retryable failed claims.
- [ ] **Step 2: Create migration** `20260804090000_telegram_business_report_runs.sql` with a service-role-only `telegram_business_report_runs` table, unique `run_key`, status/error/timestamps, RLS, and an atomic `claim_telegram_business_report` RPC that permits new, failed, or stale-processing claims.
- [ ] **Step 3: Add** `sendTelegramTextMessage(text, options)` in `lib/notifications/telegram.ts`, retaining the existing token/chat lookup and redacted error behavior; route existing order/support senders through it without changing their message text.
- [ ] **Step 4: Create** `services/telegramBusinessReportService.ts` to query `public.orders` with `.eq("status", "paid").gte("paid_at", startIso).lt("paid_at", endIso)`, sum order amounts, fetch exact Meta data, claim the scheduled run, send, and mark `sent` or `failed`.
- [ ] **Step 5: Run** focused Telegram tests and commit.

### Task 4: Add protected schedules and manual test

- [ ] **Step 1: Add failing route/config assertions** for `CRON_SECRET`, morning/full-day slots, test prefix, and Vercel schedules `0 1 * * *` and `0 7 * * *`.
- [ ] **Step 2: Create** morning and full-day route handlers that accept Vercel `GET` and protected manual `POST`; scheduled calls use the current slot window, while `POST` with `{ "test": true }` sends the latest window without consuming its scheduled key.
- [ ] **Step 3: Add** both schedules to `vercel.json`, run focused route tests, `node --test tests/telegram-notifications.test.mjs`, and `git diff --check`.
- [ ] **Step 4: Commit** routes and schedules.

### Task 5: Verify, document, deploy, and send the authorized test

- [ ] **Step 1: Run** focused tests, full `node --test tests/*.test.mjs`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`; fix only in-scope failures.
- [ ] **Step 2: Apply** the additive Supabase migration and verify table/RPC access without printing credentials.
- [ ] **Step 3: Update** `CURRENT_STATE.md`, `FEATURE_MAP.md`, `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`, and the workspace session/task/change documents without overwriting pre-existing edits.
- [ ] **Step 4: Deploy** through the repository production guard, confirm the deployment is Ready, and smoke both unauthenticated cron routes return 401.
- [ ] **Step 5: Invoke** the protected manual full-day test once, verify Telegram returns success, check the report is visibly prefixed `[TEST]`, and scan runtime logs for errors without exposing secrets.
- [ ] **Step 6: Commit** final docs and report exact verification/deployment/test evidence to the owner.
