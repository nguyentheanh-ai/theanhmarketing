export type CrmOrderMetricRow = {
  status: string;
  amount: number;
  createdAt: string;
};

export type CrmOrderSummary = {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  refunded: number;
  revenue: number;
  successRate: number;
  resolution: "hour" | "day" | "week";
  series: Array<{ label: string; orders: number; revenue: number }>;
};

type DateRange = { range: string; from: string; to: string };

const paidStatuses = new Set(["paid", "success", "completed"]);

function dateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

function hourKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return -1;
  return Number(date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", hour12: false })) % 24;
}

function datesBetween(from: string, to: string) {
  const dates: string[] = [];
  let cursor = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return dates;
}

export function buildCrmOrderSummary(rows: CrmOrderMetricRow[], range: DateRange): CrmOrderSummary {
  const scopedRows = rows.filter((row) => {
    const key = dateKey(row.createdAt);
    return key >= range.from && key <= range.to;
  });
  const status = (row: CrmOrderMetricRow) => row.status.trim().toLowerCase();
  const paid = scopedRows.filter((row) => paidStatuses.has(status(row))).length;
  const refunded = scopedRows.filter((row) => status(row).includes("refund")).length;
  const failed = scopedRows.filter((row) => !status(row).includes("refund") && /fail|expired|cancel/.test(status(row))).length;
  const pending = scopedRows.filter((row) => /pending|awaiting|new/.test(status(row))).length;
  const revenue = scopedRows.reduce((sum, row) => sum + (paidStatuses.has(status(row)) ? row.amount : 0), 0);

  if (range.range === "today" || range.range === "yesterday") {
    const series = Array.from({ length: 24 }, (_, hour) => ({ label: `${String(hour).padStart(2, "0")}:00`, orders: 0, revenue: 0 }));
    for (const row of scopedRows) {
      const hour = hourKey(row.createdAt);
      if (hour < 0) continue;
      series[hour].orders += 1;
      if (paidStatuses.has(status(row))) series[hour].revenue += row.amount;
    }
    return { total: scopedRows.length, paid, pending, failed, refunded, revenue, successRate: scopedRows.length ? Math.round((paid / scopedRows.length) * 1000) / 10 : 0, resolution: "hour", series };
  }

  const daily = new Map(datesBetween(range.from, range.to).map((date) => [date, { orders: 0, revenue: 0 }]));
  for (const row of scopedRows) {
    const bucket = daily.get(dateKey(row.createdAt));
    if (!bucket) continue;
    bucket.orders += 1;
    if (paidStatuses.has(status(row))) bucket.revenue += row.amount;
  }
  const dailySeries = [...daily].map(([date, value]) => ({ label: date.slice(5), ...value }));
  const series = range.range === "90d"
    ? Array.from({ length: Math.ceil(dailySeries.length / 7) }, (_, index) => {
        const chunk = dailySeries.slice(index * 7, index * 7 + 7);
        return { label: chunk[0]?.label ?? "", orders: chunk.reduce((sum, row) => sum + row.orders, 0), revenue: chunk.reduce((sum, row) => sum + row.revenue, 0) };
      })
    : dailySeries;

  return { total: scopedRows.length, paid, pending, failed, refunded, revenue, successRate: scopedRows.length ? Math.round((paid / scopedRows.length) * 1000) / 10 : 0, resolution: range.range === "90d" ? "week" : "day", series };
}
