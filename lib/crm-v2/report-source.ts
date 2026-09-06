type Row = Record<string, unknown>;
type PageResult = { data: unknown[] | null; error: { message: string } | null; count?: number | null };
export async function readReportPages(fetchPage: (offset: number, limit: number) => PromiseLike<PageResult>, maxRows = 100000) {
  const rows: Row[] = [];
  const seen = new Set<string>();
  let total: number | undefined;
  while (rows.length < maxRows) {
    const limit = Math.min(500, maxRows - rows.length);
    const page = await fetchPage(rows.length, limit);
    if (page.error || !Array.isArray(page.data) || page.count == null) throw new Error("Chưa đọc đủ nguồn báo cáo; hãy tải lại.");
    if (total !== undefined && total !== page.count) throw new Error("Nguồn báo cáo thay đổi khi đang đọc; hãy tải lại.");
    total = page.count;
    if (total > maxRows) throw new Error("Kỳ báo cáo vượt giới hạn đối soát; hãy chọn khoảng thời gian ngắn hơn.");
    for (const raw of page.data) {
      const row = raw as Row;
      const id = String(row.id ?? "");
      if (!id || seen.has(id)) throw new Error("Nguồn báo cáo trùng hoặc thiếu định danh; hãy tải lại.");
      seen.add(id); rows.push(row);
    }
    if (rows.length === total) return rows;
    if (page.data.length < limit || rows.length > total) throw new Error("Nguồn báo cáo bị cắt ngắn; chưa thể chốt số liệu.");
  }
  throw new Error("Nguồn báo cáo chưa đầy đủ.");
}
export function reportSourceLabel(value: unknown) {
  const text = String(value ?? "").trim();
  if (/facebook|\bfb\b|meta/i.test(text)) return "Facebook Ads";
  if (/google/i.test(text)) return "Google";
  if (/email|resend/i.test(text)) return "Email";
  return text || "Chưa rõ nguồn";
}
export function aggregateRevenueAttribution(leads: Row[], orders: Row[]) {
  const groups = new Map<string, { leads: number; mql: number; paid: number; revenue: number; emailRevenue: number }>();
  const get = (source: string) => {
    if (!groups.has(source)) groups.set(source, { leads: 0, mql: 0, paid: 0, revenue: 0, emailRevenue: 0 });
    return groups.get(source)!;
  };
  for (const lead of leads) {
    const group = get(reportSourceLabel(lead.source));
    group.leads++;
    if (["consulting", "high_intent", "pending_payment", "paid"].includes(String(lead.stage || lead.status))) group.mql++;
  }
  for (const order of orders) {
    if (!["paid", "success", "completed"].includes(String(order.status ?? order.payment_status ?? "").toLowerCase())) continue;
    const source = reportSourceLabel(order.utm_source);
    const group = get(source);
    const amount = Number(order.amount ?? 0);
    if (!Number.isFinite(amount)) throw new Error("Đơn hàng có số tiền không hợp lệ.");
    group.paid++; group.revenue += amount;
    if (source === "Email") group.emailRevenue += amount;
  }
  return [...groups].map(([channel, stats]) => ({ id: channel, channel, ...stats,
    cr: stats.leads ? `${Math.round(stats.paid / stats.leads * 1000) / 10}%` : "—",
    cac: "Chưa đủ dữ liệu", roi: "Chưa đủ dữ liệu",
    note: "Đơn theo UTM; lượt lead và đơn trong kỳ, chưa phải tỷ lệ chuyển đổi cùng nhóm khách.",
  })).sort((a,b) => b.revenue-a.revenue);
}
