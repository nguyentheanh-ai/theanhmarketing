import { buildAdaptiveRevenueSeries } from "./revenue-series";
import { reportSourceLabel } from "./report-source";
import { getCrmDateRange, normalizeCrmListQuery } from "./query";

export type AnalyticsRange = { range: string; from: string; to: string };
export type AnalyticsProduct = { slug: string; title: string };
export type AnalyticsOrder = Record<string, unknown> & { id: string };
export type AnalyticsSelection = { range: AnalyticsRange; product: string };
export type AnalyticsSnapshot = ReturnType<typeof buildAdminAnalytics>;
const paidStatuses = new Set(["paid", "success", "completed"]);
const day = (value: unknown) => {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
};
const isPaid = (row: AnalyticsOrder) => paidStatuses.has(String(row.status || row.payment_status || "").toLowerCase());
const money = (value: unknown) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Số tiền đơn hàng không hợp lệ; cần đối soát đơn gốc.");
  return amount;
};
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function getAnalyticsSelection(params: Record<string, string | string[] | undefined> = {}, now = new Date()): AnalyticsSelection {
  const query = normalizeCrmListQuery(params);
  if (query.range === "custom" && (!query.dateFrom || !query.dateTo || !validDate(query.dateFrom) || !validDate(query.dateTo))) {
    throw new Error("Chọn ngày bắt đầu và kết thúc hợp lệ.");
  }
  const range = getCrmDateRange(query, now);
  if ((Date.parse(range.to) - Date.parse(range.from)) / 86_400_000 > 1095) throw new Error("Chọn khoảng báo cáo tối đa 3 năm.");
  return { range, product: String(query.filters?.course ?? "").trim().slice(0, 300) };
}

/** Allocate each order once, using its saved line prices; never multiply bundle revenue. */
export function allocateOrderProducts(order: AnalyticsOrder, catalog: AnalyticsProduct[] = []) {
  const amount = money(order.amount);
  const titles = new Map(catalog.map((product) => [product.slug, product.title]));
  const rawItems = Array.isArray(order.order_items) ? order.order_items : [];
  const items = rawItems.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map((item) => ({ slug: String(item.slug || order.course_slug || "unassigned"), title: String(item.title || order.course_title || "Sản phẩm khác"), price: money(item.price) }));
  if (!items.length) items.push({ slug: String(order.course_slug || "unassigned"), title: String(order.course_title || "Sản phẩm khác"), price: amount });
  const weights = items.reduce((sum, item) => sum + item.price, 0);
  // Historical bundles without line values remain a single bundle, rather than inventing product values.
  if (!weights && items.length > 1 && amount > 0) return [{ slug: String(order.course_slug || "unassigned"), title: String(order.course_title || "Gói sản phẩm"), amount }];
  const quotas = items.map((item) => weights ? amount * item.price / weights : 0);
  const allocated = quotas.map((quota) => Math.floor(quota));
  if (weights) {
    // Largest remainder: only priced products receive rounding units. Ties retain
    // saved line order, and a zero-price gift can never absorb a negative residue.
    const ranked = items.map((item, index) => ({ index, price: item.price, remainder: quotas[index] - allocated[index] }))
      .filter((item) => item.price > 0)
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    let remainder = amount - allocated.reduce((sum, value) => sum + value, 0);
    for (const item of ranked) {
      if (remainder <= 0) break;
      const increment = Math.min(1, remainder);
      allocated[item.index] += increment;
      remainder -= increment;
    }
  } else if (items.length === 1) {
    allocated[0] = amount;
  }
  const byProduct = new Map<string, { slug: string; title: string; amount: number }>();
  items.forEach((item, index) => {
    const existing = byProduct.get(item.slug);
    byProduct.set(item.slug, { slug: item.slug, title: titles.get(item.slug) || item.title, amount: (existing?.amount ?? 0) + allocated[index] });
  });
  return [...byProduct.values()];
}

export function buildAdminAnalytics(rawOrders: AnalyticsOrder[], catalog: AnalyticsProduct[], selection: AnalyticsSelection) {
  const { range, product } = selection;
  const within = (value: unknown) => { const date = day(value); return Boolean(date && date >= range.from && date <= range.to); };
  const seen = new Set<string>();
  const orders = rawOrders.map((order): AnalyticsOrder & { lines: ReturnType<typeof allocateOrderProducts> } => {
    if (!order.id || seen.has(order.id)) throw new Error("Nguồn đơn hàng bị trùng định danh; hãy tải lại.");
    seen.add(order.id);
    return { ...order, lines: allocateOrderProducts(order, catalog) };
  });
  const options = new Map(catalog.map((entry) => [entry.slug, entry]));
  for (const order of orders) for (const line of order.lines) options.set(line.slug, { slug: line.slug, title: line.title });
  const scoped = orders.filter((order) => !product || order.lines.some((line) => line.slug === product));
  const amountFor = (order: typeof scoped[number]) => order.lines.filter((line) => !product || line.slug === product).reduce((sum, line) => sum + line.amount, 0);
  const paid = scoped.filter((order) => isPaid(order) && within(order.paid_at ?? order.created_at));
  const created = scoped.filter((order) => within(order.created_at));
  const cohortPaid = created.filter((order) => isPaid(order) && Boolean(day(order.paid_at ?? order.created_at)) && day(order.paid_at ?? order.created_at) <= range.to);
  const buyerKey = (order: AnalyticsOrder) => String(order.email ?? "").trim().toLowerCase() || `order:${order.id}`;
  const buyers = new Set(paid.map(buyerKey)).size;
  const cohortBuyers = new Set(created.map(buyerKey)).size;
  const paidCohortBuyers = new Set(cohortPaid.map(buyerKey)).size;
  const revenue = paid.reduce((sum, order) => sum + amountFor(order), 0);
  const series = buildAdaptiveRevenueSeries(paid.map((order) => ({ ...order, amount: amountFor(order) })), range);
  const productMap = new Map<string, { slug: string; title: string; paidOrders: number; revenue: number }>();
  const sourceMap = new Map<string, { title: string; paidOrders: number; revenue: number }>();
  for (const order of paid) {
    for (const line of order.lines.filter((line) => !product || line.slug === product)) {
      const current = productMap.get(line.slug) ?? { slug: line.slug, title: line.title, paidOrders: 0, revenue: 0 };
      current.paidOrders++; current.revenue += line.amount; productMap.set(line.slug, current);
    }
    const source = reportSourceLabel(order.utm_source);
    const current = sourceMap.get(source) ?? { title: source, paidOrders: 0, revenue: 0 };
    current.paidOrders++; current.revenue += amountFor(order); sourceMap.set(source, current);
  }
  const trend = series.rows.map((row, index, rows) => ({ ...row, cumulative: rows.slice(0, index + 1).reduce((sum, item) => sum + item.value, 0) }));
  return {
    selection, products: [...options.values()].sort((a, b) => a.title.localeCompare(b.title, "vi")),
    totals: { revenue, paidOrders: paid.length, buyers, averageOrder: paid.length ? revenue / paid.length : 0, createdOrders: created.length,
      cohortPaidOrders: cohortPaid.length, conversion: created.length ? cohortPaid.length / created.length * 100 : null,
      cohortBuyers, paidCohortBuyers, legacyPaymentDates: paid.filter((order) => !order.paid_at).length,
      anonymousBuyerOrders: paid.filter((order) => !String(order.email ?? "").trim()).length },
    resolution: series.resolution, trend,
    productRows: [...productMap.values()].sort((a, b) => b.revenue - a.revenue || b.paidOrders - a.paidOrders),
    sourceRows: [...sourceMap.values()].sort((a, b) => b.revenue - a.revenue),
    statuses: [
      { label: "Đã thanh toán", value: cohortPaid.length, tone: "green" },
      { label: "Chờ thanh toán", value: created.filter((order) => /pending|awaiting|new/.test(String(order.status)) || (isPaid(order) && !cohortPaid.includes(order))).length, tone: "blue" },
      { label: "Hết hạn / hủy / lỗi", value: created.filter((order) => /fail|expired|cancel/.test(String(order.status))).length, tone: "slate" },
      { label: "Hoàn tiền", value: created.filter((order) => /refund/.test(String(order.status))).length, tone: "orange" },
    ],
    orderRows: paid.map((order) => ({ id: order.id, code: String(order.order_code || order.id), product: order.lines.filter((line) => !product || line.slug === product).map((line) => line.title).join(" · "), amount: amountFor(order), paidAt: String(order.paid_at || order.created_at) })).sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
  };
}
