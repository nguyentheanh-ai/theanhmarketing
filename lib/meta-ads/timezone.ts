export type MetaHourlyRow = {
  metaDate: string;
  metaHour: number;
  spend: number;
  impressions: number;
  clicks: number;
};

type ReportRange = { range: string; from: string; to: string };

const vietnamTimezone = "Asia/Ho_Chi_Minh";

function partsInTimezone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function zonedHourToUtc(metaDate: string, metaHour: number, timeZone: string) {
  const [year, month, day] = metaDate.split("-").map(Number);
  const targetWallClock = Date.UTC(year, month - 1, day, metaHour, 0, 0);
  let guess = targetWallClock;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = partsInTimezone(new Date(guess), timeZone);
    const renderedWallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const adjustment = targetWallClock - renderedWallClock;
    guess += adjustment;
    if (adjustment === 0) break;
  }
  return new Date(guess);
}

function dateAndHourInTimezone(date: Date, timeZone: string) {
  const parts = partsInTimezone(date, timeZone);
  return {
    date: `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    hour: parts.hour,
  };
}

function shiftDate(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function datesBetween(from: string, to: string) {
  const dates: string[] = [];
  for (let cursor = from; cursor <= to; cursor = shiftDate(cursor, 1)) dates.push(cursor);
  return dates;
}

export function metaHourToVietnamBucket(metaDate: string, metaHour: number, advertiserTimezone: string) {
  return dateAndHourInTimezone(zonedHourToUtc(metaDate, metaHour, advertiserTimezone), vietnamTimezone);
}

export function buildExpandedMetaDateWindow(range: Pick<ReportRange, "from" | "to">) {
  return { since: shiftDate(range.from, -1), until: shiftDate(range.to, 1) };
}

export function aggregateMetaAdsForVietnam(rows: MetaHourlyRow[], range: ReportRange, advertiserTimezone: string, now = new Date()) {
  const scoped = rows.flatMap((row) => {
    const bucket = metaHourToVietnamBucket(row.metaDate, row.metaHour, advertiserTimezone);
    return bucket.date >= range.from && bucket.date <= range.to ? [{ ...row, ...bucket }] : [];
  });
  const totals = scoped.reduce((sum, row) => ({ spend: sum.spend + row.spend, impressions: sum.impressions + row.impressions, clicks: sum.clicks + row.clicks }), { spend: 0, impressions: 0, clicks: 0 });
  const normalizedTotals = { ...totals, ctr: totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0, cpc: totals.clicks ? totals.spend / totals.clicks : 0 };
  const todayVietnam = dateAndHourInTimezone(now, vietnamTimezone).date;
  const quality = { status: range.to >= todayVietnam ? "partial" as const : "final" as const, timezone: advertiserTimezone };

  if (range.range === "today" || range.range === "yesterday") {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ label: `${String(hour).padStart(2, "0")}:00`, spend: 0, impressions: 0, clicks: 0 }));
    for (const row of scoped) {
      buckets[row.hour].spend += row.spend;
      buckets[row.hour].impressions += row.impressions;
      buckets[row.hour].clicks += row.clicks;
    }
    return { rows: buckets, totals: normalizedTotals, quality };
  }

  const daily = new Map(datesBetween(range.from, range.to).map((date) => [date, { label: date.slice(5), spend: 0, impressions: 0, clicks: 0 }]));
  for (const row of scoped) {
    const bucket = daily.get(row.date);
    if (!bucket) continue;
    bucket.spend += row.spend;
    bucket.impressions += row.impressions;
    bucket.clicks += row.clicks;
  }
  const dailyRows = [...daily.values()];
  if (range.range !== "90d") return { rows: dailyRows, totals: normalizedTotals, quality };

  const weeklyRows = Array.from({ length: Math.ceil(dailyRows.length / 7) }, (_, index) => {
    const chunk = dailyRows.slice(index * 7, index * 7 + 7);
    return {
      label: chunk[0]?.label ?? "",
      spend: chunk.reduce((sum, row) => sum + row.spend, 0),
      impressions: chunk.reduce((sum, row) => sum + row.impressions, 0),
      clicks: chunk.reduce((sum, row) => sum + row.clicks, 0),
    };
  });
  return { rows: weeklyRows, totals: normalizedTotals, quality };
}
