import assert from "node:assert/strict";
import test from "node:test";

import {
  runTelegramBusinessReport,
  validateAndAggregateSnapshots,
  type TelegramBusinessReportDependencies,
} from "../services/telegramBusinessReportService";

function dependencies(overrides: Partial<TelegramBusinessReportDependencies> = {}): TelegramBusinessReportDependencies {
  return {
    readPaidOrders: async () => [
      { amount: 799_000, courseSlug: "facebook-ads-2026", courseTitle: "Facebook Ads 2026" },
      { amount: 399_000, courseSlug: "ebook-facebook-ads-2026", courseTitle: "Ebook Facebook Ads" },
    ],
    readAds: async () => ({
      available: true,
      campaigns: [
        { campaignName: "FBA", spend: 120_000 },
        { campaignName: "Ebook", spend: 80_000 },
      ],
    }),
    claim: async () => ({ claimed: true, leaseToken: "lease-1" }),
    finish: async () => ({ ok: true }),
    send: async () => ({ ok: true, skipped: false, status: 200 }),
    ...overrides,
  };
}

test("17h report reads one Ads window, sends one two-account summary, and finishes only after delivery", async () => {
  const events: Array<Record<string, unknown>> = [];
  const orderWindows: string[] = [];
  const adsWindows: string[] = [];
  const result = await runTelegramBusinessReport(
    { slot: "full-day", now: new Date("2026-08-04T10:00:00.000Z") },
    dependencies({
      claim: async (input) => {
        events.push({ claim: input });
        return { claimed: true, leaseToken: "lease-1" };
      },
      readPaidOrders: async (window) => {
        orderWindows.push(`${window.startIso}/${window.endIso}`);
        return dependencies().readPaidOrders(window);
      },
      readAds: async (window) => {
        adsWindows.push(`${window.startIso}/${window.endIso}`);
        return {
          available: true,
          campaigns: [],
          accounts: [
            { accountName: "Greezhub 01", accountId: "1255736315302940", available: true, spend: 900_000, purchases: 3 },
            { accountName: "TAM01", accountId: "1103665698635605", available: true, spend: 600_000, purchases: 2 },
          ],
        };
      },
      send: async (text) => {
        events.push({ text });
        return { ok: true, skipped: false, status: 200 };
      },
      finish: async (input) => {
        events.push({ finish: input });
        return { ok: true };
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.match(String(events[0].claim && JSON.stringify(events[0].claim)), /full-day:2026-08-03T10:00:00.000Z:2026-08-04T10:00:00.000Z/);
  assert.equal(orderWindows.length, 0);
  assert.deepEqual(adsWindows, ["2026-08-03T10:00:00.000Z/2026-08-04T10:00:00.000Z"]);
  assert.equal(events.filter((event) => event.text).length, 1);
  assert.match(String(events[1].text), /Greezhub 01 - 900\.000 ₫ - 3 đơn/);
  assert.match(String(events[1].text), /TAM01 - 600\.000 ₫ - 2 đơn/);
  assert.match(String(events[1].text), /TỔNG 2 TÀI KHOẢN - 1\.500\.000 ₫ - 5 đơn/);
  assert.doesNotMatch(String(events[1].text), /7 NGÀY|DOANH THU THÁNG|CPM|CTR|ROAS/);
  assert.deepEqual(events[2].finish, { runKey: "full-day:2026-08-03T10:00:00.000Z:2026-08-04T10:00:00.000Z", leaseToken: "lease-1", outcome: "sent" });
});

test("duplicate scheduled report skips before reading or sending", async () => {
  let reads = 0;
  const result = await runTelegramBusinessReport(
    { slot: "morning", now: new Date("2026-08-04T01:00:00.000Z") },
    dependencies({
      claim: async () => ({ claimed: false }),
      readPaidOrders: async () => { reads += 1; return []; },
      readAds: async () => { reads += 1; return { available: true, campaigns: [] }; },
      send: async () => { throw new Error("must not send"); },
    }),
  );

  assert.deepEqual(result, { ok: true, skipped: true, reason: "Report window already claimed or sent." });
  assert.equal(reads, 0);
});

test("test report bypasses delivery claim and is visibly marked", async () => {
  let claimed = false;
  const texts: string[] = [];
  const result = await runTelegramBusinessReport(
    { slot: "full-day", now: new Date("2026-08-04T10:00:00.000Z"), test: true },
    dependencies({
      claim: async () => { claimed = true; return { claimed: false }; },
      send: async (message) => { texts.push(message); return { ok: true, skipped: false, status: 200 }; },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(claimed, false);
  assert.equal(texts.length, 1);
  assert.ok(texts.every((text) => /^\[TEST\]/.test(text)));
});

test("delivery failure is recorded without leaking transport internals", async () => {
  let finish: Record<string, unknown> | undefined;
  const result = await runTelegramBusinessReport(
    { slot: "full-day", now: new Date("2026-08-04T10:00:00.000Z") },
    dependencies({
      send: async () => ({ ok: false, skipped: false, status: 502, reason: "Telegram Bot API rejected the message." }),
      finish: async (input) => { finish = input; return { ok: true }; },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(finish?.outcome, "failed");
  assert.equal(finish?.reason, "Telegram Bot API rejected the message.");
});

test("the concise 17h report sends only one Telegram message", async () => {
  let sends = 0;
  const result = await runTelegramBusinessReport(
    { slot: "full-day", now: new Date("2026-08-04T10:00:00.000Z") },
    dependencies({
      send: async () => {
        sends += 1;
        return { ok: true, skipped: false, status: 200 };
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(sends, 1);
  assert.equal(result.parts, 1);
});

test("17h report does not send or mark sent when either Ads account snapshot is incomplete", async () => {
  let sends = 0;
  let finish: Record<string, unknown> | undefined;
  const result = await runTelegramBusinessReport(
    { slot: "full-day", now: new Date("2026-08-04T10:05:00.000Z") },
    dependencies({
      readAds: async () => ({
        available: false,
        campaigns: [],
        reason: "Snapshot MCP thiếu giờ tài khoản.",
        accounts: [
          { accountName: "Greezhub 01", accountId: "1255736315302940", available: false, reason: "0/24 giờ final" },
          { accountName: "TAM01", accountId: "1103665698635605", available: true, spend: 600_000, purchases: 2 },
        ],
      }),
      send: async () => {
        sends += 1;
        return { ok: true, skipped: false, status: 200 };
      },
      finish: async (input) => {
        finish = input;
        return { ok: true };
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(sends, 0);
  assert.equal(finish?.outcome, "failed");
  assert.match(String(finish?.reason), /Greezhub 01.*0\/24 giờ final/i);
});

test("hourly MCP snapshots must cover and reconcile every account hour", () => {
  const window = { startIso: "2026-08-03T07:00:00.000Z", endIso: "2026-08-03T09:00:00.000Z" };
  const account = (hour: string, spend: number) => ({
    entity_level: "account" as const,
    entity_id: "1255736315302940",
    entity_name: "Greezhub 01",
    local_start_at: hour,
    spend,
    data_status: "final" as const,
  });
  const campaign = (hour: string, name: string, spend: number) => ({
    entity_level: "campaign" as const,
    entity_id: name,
    entity_name: name,
    local_start_at: hour,
    spend,
    data_status: "final" as const,
  });
  const valid = validateAndAggregateSnapshots([
    account("2026-08-03T07:00:00.000Z", 100),
    account("2026-08-03T08:00:00.000Z", 200),
    campaign("2026-08-03T07:00:00.000Z", "Ebook", 100),
    campaign("2026-08-03T08:00:00.000Z", "FBA", 200),
  ], window);
  assert.deepEqual(valid, {
    available: true,
    campaigns: [
      { campaignName: "Ebook", spend: 100 },
      { campaignName: "FBA", spend: 200 },
    ],
  });

  const rounded = validateAndAggregateSnapshots([
    account("2026-08-03T07:00:00.000Z", 100_000),
    account("2026-08-03T08:00:00.000Z", 200_000),
    campaign("2026-08-03T07:00:00.000Z", "Ebook", 100_300),
    campaign("2026-08-03T08:00:00.000Z", "FBA", 199_500),
  ], window);
  assert.equal(rounded.available, true);

  const hourlyDriftWithExactPeriodTotal = validateAndAggregateSnapshots([
    account("2026-08-03T07:00:00.000Z", 100_000),
    account("2026-08-03T08:00:00.000Z", 200_000),
    campaign("2026-08-03T07:00:00.000Z", "Ebook", 101_000),
    campaign("2026-08-03T08:00:00.000Z", "FBA", 199_000),
  ], window);
  assert.equal(hourlyDriftWithExactPeriodTotal.available, true);

  const missing = validateAndAggregateSnapshots([
    account("2026-08-03T07:00:00.000Z", 100),
    campaign("2026-08-03T07:00:00.000Z", "Ebook", 100),
  ], window);
  assert.equal(missing.available, false);
  assert.match(missing.reason ?? "", /thiếu giờ/i);

  const unreconciled = validateAndAggregateSnapshots([
    account("2026-08-03T07:00:00.000Z", 100),
    account("2026-08-03T08:00:00.000Z", 200),
    campaign("2026-08-03T07:00:00.000Z", "Ebook", 100),
    campaign("2026-08-03T08:00:00.000Z", "FBA", 150),
  ], window);
  assert.equal(unreconciled.available, false);
  assert.match(unreconciled.reason ?? "", /chưa khớp/i);
});
