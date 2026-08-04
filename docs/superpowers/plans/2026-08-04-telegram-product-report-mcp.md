# Telegram Product Report MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gửi báo cáo Telegram 08:00/14:00 có doanh thu và lãi/lỗ theo sản phẩm, 7 ngày, tháng đến hiện tại, với Ads lấy từ Facebook Ads MCP thay vì Meta access token của website.

**Architecture:** Một Codex heartbeat dùng Facebook Ads MCP đồng bộ spend campaign theo giờ vào bảng Supabase production chỉ dành cho service role. Website đọc order và snapshot này, kiểm tra độ phủ dữ liệu, dựng nhiều phần Telegram và gửi bằng bot hiện có; endpoint giữ ledger chống gửi trùng.

**Tech Stack:** Next.js 16, TypeScript, Supabase/Postgres, Facebook Ads MCP, Codex Automations, Vercel Cron, Telegram Bot API, Node test runner/tsx.

---

## File map

- Create `lib/reports/telegram-product-report.ts`: chuẩn hóa sản phẩm/campaign, dựng các kỳ và tính KPI theo sản phẩm.
- Modify `lib/reports/telegram-business-day.ts`: dùng model nhiều kỳ/nhiều sản phẩm và tách tin Telegram an toàn.
- Modify `services/telegramBusinessReportService.ts`: đọc orders theo sản phẩm, đọc snapshot MCP, kiểm tra coverage và gửi nhiều phần.
- Modify `lib/notifications/telegram.ts`: hỗ trợ gửi tuần tự một danh sách tin nhắn.
- Modify `app/api/reports/telegram/_shared.ts`: giữ auth manual/cron và phản hồi trạng thái nhiều phần.
- Create `supabase/migrations/*_telegram_meta_campaign_hourly_snapshots.sql`: bảng cache service-role-only và index kỳ báo cáo.
- Modify `vercel.json`: lịch gửi sau thời điểm heartbeat MCP đồng bộ.
- Create/update tests under `tests/`: mapping, windows, aggregation, fail-closed, multipart delivery.
- Update workspace/repo docs required by AGENTS protocol.

### Task 1: Product mapping and reporting windows

**Files:**
- Create: `lib/reports/telegram-product-report.ts`
- Test: `tests/telegram-product-report.test.mjs`

- [ ] **Step 1: Write failing tests**

Add tests proving `Ebook FB Ads 2026` maps to `ebook`, `FBA` and plain `FB Ads 2026` map to `facebook_ads_course`, unknown names map to `unclassified`, and the 7-day/month windows use Vietnam boundaries with half-open ranges.

```js
assert.equal(classifyCampaignProduct("Ebook FB Ads 2026"), "ebook");
assert.equal(classifyCampaignProduct("2026 | SALES | FBA | KB1"), "facebook_ads_course");
assert.equal(classifyCampaignProduct("2026 | SALES | FB Ads 2026"), "facebook_ads_course");
assert.equal(classifyCampaignProduct("ENGAGEMENT | Follow page"), "unclassified");
assert.deepEqual(buildSevenDayWindow(new Date("2026-08-04T07:00:00.000Z")), {
  startIso: "2026-07-28T07:00:00.000Z",
  endIso: "2026-08-04T07:00:00.000Z",
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/telegram-product-report.test.mjs`
Expected: FAIL because `telegram-product-report.ts` and exported functions do not exist.

- [ ] **Step 3: Implement minimal mapping/window helpers**

Define `ReportProductKey`, `classifyCampaignProduct`, `classifyOrderProduct`, `buildSevenDayWindow`, and `buildMonthToDateWindow`. Match Ebook before Facebook Ads so the phrase `Ebook FB Ads 2026` cannot be misclassified.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test tests/telegram-product-report.test.mjs`
Expected: all Task 1 tests pass.

- [ ] **Step 5: Commit**

Commit only Task 1 files with message `feat: add Telegram product report domain rules`.

### Task 2: Secure MCP hourly snapshot storage

**Files:**
- Create: `supabase/migrations/<generated>_telegram_meta_campaign_hourly_snapshots.sql`
- Test: `tests/telegram-product-report-contract.test.mjs`

- [ ] **Step 1: Write failing contract tests**

Require a table with `ad_account_id`, `entity_level`, `entity_id`, `entity_name`, `local_start_at`, `local_end_at`, `spend`, `data_status`, `fetched_at`; require a unique key on account/level/entity/hour, RLS, revoked `anon`/`authenticated`, and grants only for `service_role`.

- [ ] **Step 2: Run the contract test and verify RED**

Run: `node --test tests/telegram-product-report-contract.test.mjs`
Expected: FAIL because the migration is absent.

- [ ] **Step 3: Generate and implement migration**

Run `supabase migration new telegram_meta_campaign_hourly_snapshots`, then define `public.telegram_meta_campaign_hourly_snapshots`, its unique/index constraints, RLS, revokes, and service-role grants. Store both `account` totals and `campaign` rows so coverage and reconciliation can fail closed.

- [ ] **Step 4: Apply migration and verify schema**

Apply with Supabase MCP to project `vsxxgdzwtscuxcmjfckt`; query `pg_class`, `pg_indexes`, `pg_policies`, and `information_schema.role_table_grants` to verify the contract.

- [ ] **Step 5: Run tests and commit**

Run the contract test and commit with message `feat: add private MCP campaign snapshot cache`.

### Task 3: Aggregate product KPIs and render Telegram sections

**Files:**
- Modify: `lib/reports/telegram-product-report.ts`
- Modify: `lib/reports/telegram-business-day.ts`
- Test: `tests/telegram-product-report.test.mjs`
- Test: `tests/telegram-business-day-report.test.mjs`

- [ ] **Step 1: Write failing aggregation tests**

Cover paid orders grouped by canonical product, campaign spend grouped by mapping, `unclassified` spend as a separate line, formula `gross - 8% gross - Ads - 2% Ads`, seven-day and month-to-date sections, and no profit result when account/campaign totals do not reconcile.

- [ ] **Step 2: Run tests and verify RED**

Run both test files; expect failures for missing aggregation and multipart message functions.

- [ ] **Step 3: Implement minimal aggregation/message code**

Add pure functions that return product rows and report sections. Split at section boundaries below Telegram's 4096-character limit; never split a money line or product row.

- [ ] **Step 4: Run tests and verify GREEN**

Run both test files and confirm all pass.

- [ ] **Step 5: Commit**

Commit with message `feat: format product and period Telegram reports`.

### Task 4: Read snapshots and deliver all report parts safely

**Files:**
- Modify: `services/telegramBusinessReportService.ts`
- Modify: `lib/notifications/telegram.ts`
- Modify: `app/api/reports/telegram/_shared.ts`
- Test: `tests/telegram-business-report-service.test.ts`

- [ ] **Step 1: Write failing service tests**

Require parallel reads for the current, seven-day, and month windows; require product fields on orders; require snapshot freshness/reconciliation checks; require sequential delivery of every part; and require the ledger to mark `sent` only after every Telegram call succeeds.

- [ ] **Step 2: Run the focused TypeScript test and verify RED**

Run: `tsx --test tests/telegram-business-report-service.test.ts`
Expected: FAIL on the new dependency and multipart expectations.

- [ ] **Step 3: Implement repository/service changes**

Select `amount, course_slug, course_title, order_items` from paid orders. Query cached MCP rows by half-open `local_start_at`/`local_end_at`; validate `fetched_at`, `data_status`, and campaign sum against account total. Send parts sequentially and retain the existing claim/finish lease behavior.

- [ ] **Step 4: Run tests and verify GREEN**

Run focused TS and MJS report tests; confirm no failures.

- [ ] **Step 5: Commit**

Commit with message `feat: deliver complete MCP-backed Telegram reports`.

### Task 5: MCP heartbeat, release, and production proof

**Files:**
- Modify: `vercel.json`
- Update: `/Users/theanh/.codex/automations/<telegram-report-automation>/automation.toml` through `automation_update` only
- Update: `CURRENT_STATE.md`, `FEATURE_MAP.md`, `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md` without overwriting unrelated dirty edits
- Update: `/Users/theanh/CodexProjects/Kinh doanh/docs/SESSION_STATE.md`
- Update: `/Users/theanh/CodexProjects/Kinh doanh/docs/FEATURE_REGISTRY.md`
- Append: `/Users/theanh/CodexProjects/Kinh doanh/docs/TASK_LOG.md`
- Update: `/Users/theanh/CodexProjects/Kinh doanh/docs/CHANGELOG.md`, `DECISIONS.md`, `DATABASE-CONTRACT.md`

- [ ] **Step 1: Create the MCP heartbeat**

Create one heartbeat scheduled at 08:00 and 14:00 Asia/Ho_Chi_Minh. Its prompt must query account `1255736315302940` through Facebook Ads MCP with campaign and account hourly breakdowns, verify fields first, upsert normalized rows through Supabase MCP, then trigger the matching report only after the snapshot is complete. It must never request or print a Meta token.

- [ ] **Step 2: Adjust Vercel fallback schedule**

Keep Vercel cron as a delayed delivery fallback after MCP sync, preventing a race while preserving the existing ledger.

- [ ] **Step 3: Run full verification**

Run focused tests, all Node tests, `tsc --noEmit`, lint, security verification, and production build. Expected: zero failures/errors.

- [ ] **Step 4: Apply migration, deploy, and smoke**

Apply the reviewed migration, deploy the clean release commit using the verified production workflow, verify runtime errors, and invoke a `[TEST]` report after manually syncing MCP rows for the test window.

- [ ] **Step 5: Update documentation and commit**

Record exact sources, mapping, schedule, formula, migration, deployment ID, tests, and any remaining data-quality limitations. Commit only owned files; preserve unrelated dirty work.

## Self-review

- Spec coverage: product mapping, 14h→14h, seven-day per product, month-to-date, MCP-only Ads source, data-quality fail-closed, multipart Telegram and production test are each mapped to Tasks 1–5.
- Placeholder scan: no TBD/TODO or unspecified implementation steps remain.
- Type consistency: all windows use `{ startIso, endIso }`; product keys are `ebook`, `facebook_ads_course`, `unclassified`; snapshots use account/campaign entity levels.
