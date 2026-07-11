import assert from "node:assert/strict";
import test from "node:test";

import { aggregateMetaAdsForVietnam, buildExpandedMetaDateWindow, metaHourToVietnamBucket } from "../lib/meta-ads/timezone.ts";

test("Meta advertiser hours convert to Vietnam with US daylight saving time", () => {
  assert.deepEqual(metaHourToVietnamBucket("2026-07-11", 10, "America/Los_Angeles"), { date: "2026-07-12", hour: 0 });
  assert.deepEqual(metaHourToVietnamBucket("2026-01-11", 10, "America/Los_Angeles"), { date: "2026-01-12", hour: 1 });
});

test("Meta query window includes adjacent advertiser dates", () => {
  assert.deepEqual(buildExpandedMetaDateWindow({ from: "2026-07-01", to: "2026-07-07" }), { since: "2026-06-30", until: "2026-07-08" });
});

test("Vietnam aggregation returns 24 hourly buckets and ignores adjacent-day rows", () => {
  const report = aggregateMetaAdsForVietnam(
    [
      { metaDate: "2026-07-11", metaHour: 10, spend: 100_000, impressions: 1000, clicks: 20 },
      { metaDate: "2026-07-11", metaHour: 11, spend: 200_000, impressions: 2000, clicks: 40 },
      { metaDate: "2026-07-10", metaHour: 9, spend: 999_000, impressions: 9999, clicks: 99 },
    ],
    { range: "today", from: "2026-07-12", to: "2026-07-12" },
    "America/Los_Angeles",
    new Date("2026-07-12T03:00:00+07:00"),
  );

  assert.equal(report.rows.length, 24);
  assert.equal(report.rows[0]?.spend, 100_000);
  assert.equal(report.rows[1]?.spend, 200_000);
  assert.equal(report.totals.spend, 300_000);
  assert.equal(report.quality.status, "partial");
});
