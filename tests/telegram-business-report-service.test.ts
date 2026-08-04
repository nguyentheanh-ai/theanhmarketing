import assert from "node:assert/strict";
import test from "node:test";

import { runTelegramBusinessReport, type TelegramBusinessReportDependencies } from "../services/telegramBusinessReportService";

function dependencies(overrides: Partial<TelegramBusinessReportDependencies> = {}): TelegramBusinessReportDependencies {
  return {
    readPaidOrders: async () => [{ amount: 799_000 }, { amount: 399_000 }],
    readAds: async () => ({ available: true, spend: 200_000 }),
    claim: async () => ({ claimed: true, leaseToken: "lease-1" }),
    finish: async () => ({ ok: true }),
    send: async () => ({ ok: true, skipped: false, status: 200 }),
    ...overrides,
  };
}

test("scheduled report claims a deterministic key, sends aggregates, and finishes sent", async () => {
  const events: Array<Record<string, unknown>> = [];
  const result = await runTelegramBusinessReport(
    { slot: "full-day", now: new Date("2026-08-04T07:00:00.000Z") },
    dependencies({
      claim: async (input) => {
        events.push({ claim: input });
        return { claimed: true, leaseToken: "lease-1" };
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
  assert.match(String(events[0].claim && JSON.stringify(events[0].claim)), /full-day:2026-08-03T07:00:00.000Z:2026-08-04T07:00:00.000Z/);
  assert.match(String(events[1].text), /Đơn đã thanh toán: 2/);
  assert.match(String(events[1].text), /1\.198\.000 ₫/);
  assert.deepEqual(events[2].finish, { runKey: "full-day:2026-08-03T07:00:00.000Z:2026-08-04T07:00:00.000Z", leaseToken: "lease-1", outcome: "sent" });
});

test("duplicate scheduled report skips before reading or sending", async () => {
  let reads = 0;
  const result = await runTelegramBusinessReport(
    { slot: "morning", now: new Date("2026-08-04T01:00:00.000Z") },
    dependencies({
      claim: async () => ({ claimed: false }),
      readPaidOrders: async () => { reads += 1; return []; },
      readAds: async () => { reads += 1; return { available: true, spend: 0 }; },
      send: async () => { throw new Error("must not send"); },
    }),
  );

  assert.deepEqual(result, { ok: true, skipped: true, reason: "Report window already claimed or sent." });
  assert.equal(reads, 0);
});

test("test report bypasses delivery claim and is visibly marked", async () => {
  let claimed = false;
  let text = "";
  const result = await runTelegramBusinessReport(
    { slot: "full-day", now: new Date("2026-08-04T07:00:00.000Z"), test: true },
    dependencies({
      claim: async () => { claimed = true; return { claimed: false }; },
      send: async (message) => { text = message; return { ok: true, skipped: false, status: 200 }; },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(claimed, false);
  assert.match(text, /^\[TEST\]/);
});

test("delivery failure is recorded without leaking transport internals", async () => {
  let finish: Record<string, unknown> | undefined;
  const result = await runTelegramBusinessReport(
    { slot: "full-day", now: new Date("2026-08-04T07:00:00.000Z") },
    dependencies({
      send: async () => ({ ok: false, skipped: false, status: 502, reason: "Telegram Bot API rejected the message." }),
      finish: async (input) => { finish = input; return { ok: true }; },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(finish?.outcome, "failed");
  assert.equal(finish?.reason, "Telegram Bot API rejected the message.");
});
