export type RevenueResolution = "hour" | "day" | "week";

type DateRange = { range: string; from: string; to: string };
type RevenueRow = Record<string, unknown>;

const paidStatuses = new Set(["paid", "success", "completed"]);

function dateKey(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

function datesBetween(from: string, to: string) {
  const rows: string[] = [];
  let cursor = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  while (cursor <= end) {
    rows.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return rows;
}

function revenue(row: RevenueRow) {
  const status = String(row.status ?? row.payment_status ?? "").toLowerCase();
  if (!paidStatuses.has(status)) return 0;
  const amount = Number(row.amount ?? row.net_amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function buildAdaptiveRevenueSeries(rows: RevenueRow[], range: DateRange): { resolution: RevenueResolution; rows: Array<{ label: string; value: number }> } {
  if (range.range === "today") {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ label: `${String(hour).padStart(2, "0")}:00`, value: 0 }));
    for (const row of rows) {
      const amount = revenue(row);
      const timestamp = row.paid_at ?? row.created_at;
      if (!amount || dateKey(timestamp) !== range.from) continue;
      const date = new Date(String(timestamp));
      const hour = Number(date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", hour12: false })) % 24;
      buckets[hour].value += amount;
    }
    return { resolution: "hour", rows: buckets };
  }

  const daily = new Map(datesBetween(range.from, range.to).map((date) => [date, 0]));
  for (const row of rows) {
    const amount = revenue(row);
    const key = dateKey(row.paid_at ?? row.created_at);
    if (amount && daily.has(key)) daily.set(key, (daily.get(key) ?? 0) + amount);
  }

  if (range.range !== "90d" && daily.size <= 45) {
    return { resolution: "day", rows: [...daily].map(([date, value]) => ({ label: date.slice(5), value })) };
  }

  const entries = [...daily];
  const weekly: Array<{ label: string; value: number }> = [];
  for (let index = 0; index < entries.length; index += 7) {
    const chunk = entries.slice(index, index + 7);
    weekly.push({ label: chunk[0][0].slice(5), value: chunk.reduce((sum, [, value]) => sum + value, 0) });
  }
  return { resolution: "week", rows: weekly };
}
