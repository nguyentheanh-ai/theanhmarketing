# Telegram Business-Day Reports Design

## Goal

Send two automatic reports to the existing `Greezhub x Report` Telegram chat each day, using Vietnam time and canonical paid-order plus Meta Ads data.

## Reporting windows

- Morning snapshot at 08:00: `[14:00 previous day, 08:00 current day)`.
- Full-day close at 14:00: `[14:00 previous day, 14:00 current day)`.
- All boundaries use `Asia/Ho_Chi_Minh`; orders are included by `paid_at` and only when `status = paid`.

## Calculations

- `grossReceived = sum(paid order amount)`.
- `vat = grossReceived * 0.08`.
- `adSpend = Meta Ads hourly spend inside the exact report window`.
- `conversionFee = adSpend * 0.02`.
- `estimatedResult = grossReceived - vat - adSpend - conversionFee`.
- The Telegram copy labels this as an owner-defined temporary result, not accounting profit.
- If Meta Ads is unavailable or incomplete, the report shows the problem and does not substitute zero or publish a misleading result.

## Architecture

- Vercel Cron invokes two `CRON_SECRET`-protected internal routes at 01:00 and 07:00 UTC.
- A focused reporting service creates exact UTC boundaries, loads canonical paid orders, requests Meta hourly insights, filters those rows into the exact Vietnam interval, calculates metrics, and formats the message.
- The existing Telegram Bot API credentials and chat ID are reused server-side.
- A small database run ledger with a unique window key prevents duplicate scheduled delivery while retaining failed attempts for retry and diagnosis.
- A protected manual test call renders the latest completed window with a visible `[TEST]` prefix and does not consume the scheduled run key.

## Safety and verification

- No customer PII is included; only aggregate counts and money metrics are sent.
- Telegram and Meta credentials are never returned or logged.
- Unit tests cover both windows, boundary exclusion, calculations, missing Meta data, message formatting, cron authentication, and schedules.
- After deployment, send one real `[TEST]` report to `Greezhub x Report` and verify Telegram accepted it.
