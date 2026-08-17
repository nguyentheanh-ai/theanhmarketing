export type ReportProductKey = "ebook" | "facebook_ads_course" | "unclassified";

export type IsoWindow = {
  startIso: string;
  endIso: string;
};

type OrderProductIdentity = {
  courseSlug?: string | null;
  courseTitle?: string | null;
  productName?: string | null;
};

export type ProductOrderInput = OrderProductIdentity & {
  amount: number;
};

export type CampaignSpendInput = {
  campaignName: string;
  spend: number;
};

export type AccountPerformanceInput = {
  accountName: string;
  accountId: string;
  available: boolean;
  reason?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  purchases?: number;
  purchaseValue?: number;
};

export type ProductMetricRow = {
  key: ReportProductKey;
  label: string;
  orderCount: number;
  grossReceived: number;
  vat: number;
  adSpend: number | null;
  conversionFee: number | null;
  estimatedResult: number | null;
};

export type ProductMetricsReport = {
  available: boolean;
  reason?: string;
  rows: ProductMetricRow[];
  totals: Omit<ProductMetricRow, "key" | "label">;
};

type ProductReportPeriod = IsoWindow & { metrics: ProductMetricsReport; accounts?: AccountPerformanceInput[] };

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const PRODUCT_LABELS: Record<ReportProductKey, string> = {
  ebook: "Ebook",
  facebook_ads_course: "Khóa Facebook Ads",
  unclassified: "Chưa phân loại",
};

const PRODUCT_ORDER: ReportProductKey[] = ["ebook", "facebook_ads_course", "unclassified"];

function normalized(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function classifyCampaignProduct(campaignName: string): ReportProductKey {
  const name = normalized(campaignName);
  if (/\bebook\b/.test(name)) return "ebook";
  if (/\bfba\b/.test(name) || /\bfb\s*ads\s*2026\b/.test(name)) return "facebook_ads_course";
  return "unclassified";
}

export function classifyOrderProduct(identity: OrderProductIdentity): ReportProductKey {
  const value = normalized([
    identity.courseSlug,
    identity.courseTitle,
    identity.productName,
  ].filter(Boolean).join(" "));
  if (/\bebook\b/.test(value)) return "ebook";
  if (/facebook[-_\s]*ads|\bfba\b/.test(value)) return "facebook_ads_course";
  return "unclassified";
}

function latestClosedVietnamBusinessDay(now: Date) {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const todayAt17 = Date.UTC(
    vietnamNow.getUTCFullYear(),
    vietnamNow.getUTCMonth(),
    vietnamNow.getUTCDate(),
    10,
  );
  return new Date(now.getTime() >= todayAt17 ? todayAt17 : todayAt17 - DAY_MS);
}

export function buildSevenDayWindow(now: Date): IsoWindow {
  const end = latestClosedVietnamBusinessDay(now);
  return {
    startIso: new Date(end.getTime() - 7 * DAY_MS).toISOString(),
    endIso: end.toISOString(),
  };
}

export function buildMonthToDateWindow(now: Date): IsoWindow {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const start = new Date(Date.UTC(
    vietnamNow.getUTCFullYear(),
    vietnamNow.getUTCMonth(),
    1,
    -7,
  ));
  return { startIso: start.toISOString(), endIso: now.toISOString() };
}

function roundedMoney(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function calculateRow(key: ReportProductKey, orderCount: number, grossReceived: number, adSpend: number | null): ProductMetricRow {
  const gross = roundedMoney(grossReceived);
  const vat = roundedMoney(gross * 0.08);
  if (adSpend === null) {
    return {
      key,
      label: PRODUCT_LABELS[key],
      orderCount,
      grossReceived: gross,
      vat,
      adSpend: null,
      conversionFee: null,
      estimatedResult: null,
    };
  }
  const ads = roundedMoney(adSpend);
  const conversionFee = roundedMoney(ads * 0.02);
  return {
    key,
    label: PRODUCT_LABELS[key],
    orderCount,
    grossReceived: gross,
    vat,
    adSpend: ads,
    conversionFee,
    estimatedResult: gross - vat - ads - conversionFee,
  };
}

export function aggregateProductMetrics(input: {
  orders: ProductOrderInput[];
  campaigns: CampaignSpendInput[];
  ads: { available: true } | { available: false; reason?: string };
}): ProductMetricsReport {
  const orderBuckets = new Map<ReportProductKey, { count: number; gross: number }>();
  for (const order of input.orders) {
    const key = classifyOrderProduct(order);
    const bucket = orderBuckets.get(key) ?? { count: 0, gross: 0 };
    bucket.count += 1;
    bucket.gross += roundedMoney(order.amount);
    orderBuckets.set(key, bucket);
  }

  const spendBuckets = new Map<ReportProductKey, number>();
  for (const campaign of input.campaigns) {
    const key = classifyCampaignProduct(campaign.campaignName);
    spendBuckets.set(key, (spendBuckets.get(key) ?? 0) + roundedMoney(campaign.spend));
  }

  const keys = PRODUCT_ORDER.filter((key) => orderBuckets.has(key) || spendBuckets.has(key));
  const rows = keys.map((key) => {
    const orders = orderBuckets.get(key) ?? { count: 0, gross: 0 };
    return calculateRow(key, orders.count, orders.gross, input.ads.available ? (spendBuckets.get(key) ?? 0) : null);
  });
  const totalOrderCount = rows.reduce((sum, row) => sum + row.orderCount, 0);
  const totalGross = rows.reduce((sum, row) => sum + row.grossReceived, 0);
  const totalSpend = input.ads.available ? rows.reduce((sum, row) => sum + (row.adSpend ?? 0), 0) : null;
  const totalRow = calculateRow("unclassified", totalOrderCount, totalGross, totalSpend);

  return {
    available: input.ads.available,
    reason: input.ads.available ? undefined : input.ads.reason,
    rows,
    totals: {
      orderCount: totalRow.orderCount,
      grossReceived: totalRow.grossReceived,
      vat: totalRow.vat,
      adSpend: totalRow.adSpend,
      conversionFee: totalRow.conversionFee,
      estimatedResult: totalRow.estimatedResult,
    },
  };
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(roundedMoney(value))} ₫`;
}

function formatSignedMoney(value: number) {
  return `${value > 0 ? "+" : ""}${formatMoney(value)}`;
}

function formatVietnamDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).format(new Date(iso));
}

function metricLines(report: ProductMetricsReport) {
  const lines = report.rows.map((row) => {
    const base = `${row.label}: ${row.orderCount} đơn · Thu ${formatMoney(row.grossReceived)}`;
    if (row.adSpend === null || row.estimatedResult === null) return `${base} · Ads CHƯA ĐỦ`;
    return `${base} · Ads ${formatMoney(row.adSpend)} · L/L ${formatSignedMoney(row.estimatedResult)}`;
  });
  if (!report.available) lines.push(`Dữ liệu Ads: ${report.reason || "Snapshot MCP chưa đủ."}`, "Không công bố lãi/lỗ khi Ads thiếu hoặc chưa đối soát.");
  return lines;
}

function accountMetricLines(accounts: AccountPerformanceInput[] | undefined) {
  if (!accounts?.length) return [];
  return accounts.map((account) => {
    const label = `${account.accountName} (${account.accountId})`;
    if (!account.available) return `${label}: CHƯA ĐỦ DỮ LIỆU · ${account.reason || "Snapshot MCP chưa đủ."}`;
    const spend = account.spend ?? 0;
    const impressions = account.impressions ?? 0;
    const clicks = account.clicks ?? 0;
    const purchases = account.purchases ?? 0;
    const purchaseValue = account.purchaseValue ?? 0;
    const cpm = impressions > 0 ? (spend * 1000) / impressions : 0;
    const ctr = impressions > 0 ? (clicks * 100) / impressions : 0;
    const cpa = purchases > 0 ? formatMoney(spend / purchases) : "Chưa đủ";
    const roas = spend > 0 ? `${(purchaseValue / spend).toFixed(2)}x` : "Chưa đủ";
    return `${label}: Ads ${formatMoney(spend)} · Impressions ${Math.round(impressions).toLocaleString("vi-VN")} · CPM ${formatMoney(cpm)} · CTR ${ctr.toFixed(2)}% · Purchase ${purchases} · CPA ${cpa} · ROAS ${roas}`;
  });
}

function currentSection(slot: "morning" | "full-day", test: boolean | undefined, period: ProductReportPeriod) {
  const title = slot === "morning" ? "BÁO CÁO 08:00" : "BÁO CÁO CHỐT NGÀY 17:00";
  const totals = period.metrics.totals;
  const lines = [
    `${test ? "[TEST] " : ""}${title} · The Anh Marketing`,
    `Kỳ: ${formatVietnamDateTime(period.startIso)} → ${formatVietnamDateTime(period.endIso)}`,
    "",
    `Tổng: ${totals.orderCount} đơn · Thu ${formatMoney(totals.grossReceived)}`,
  ];
  if (totals.adSpend === null || totals.estimatedResult === null) {
    lines.push("Ads: CHƯA ĐỦ DỮ LIỆU · Lãi/lỗ: KHÔNG CÔNG BỐ");
  } else {
    lines.push(
      `Ads: ${formatMoney(totals.adSpend)} · VAT 8%: ${formatMoney(totals.vat)} · Phí 2% Ads: ${formatMoney(totals.conversionFee ?? 0)}`,
      `Lãi/lỗ tạm tính: ${formatSignedMoney(totals.estimatedResult)}`,
    );
  }
  lines.push("", "THEO SẢN PHẨM", ...metricLines(period.metrics));
  const accountLines = accountMetricLines(period.accounts);
  if (accountLines.length) lines.push("", "THEO TÀI KHOẢN QUẢNG CÁO", ...accountLines);
  return lines.join("\n");
}

function sevenDaySection(test: boolean | undefined, period: ProductReportPeriod) {
  return [
    `${test ? "[TEST] " : ""}7 NGÀY · 17:00 → 17:00`,
    `Kỳ: ${formatVietnamDateTime(period.startIso)} → ${formatVietnamDateTime(period.endIso)}`,
    "",
    ...metricLines(period.metrics),
  ].join("\n");
}

function monthSection(test: boolean | undefined, period: ProductReportPeriod) {
  return [
    `${test ? "[TEST] " : ""}DOANH THU THÁNG ĐẾN HIỆN TẠI`,
    `Kỳ: ${formatVietnamDateTime(period.startIso)} → ${formatVietnamDateTime(period.endIso)}`,
    "",
    `Tổng doanh thu: ${formatMoney(period.metrics.totals.grossReceived)} · ${period.metrics.totals.orderCount} đơn`,
    ...period.metrics.rows.map((row) => `${row.label}: ${formatMoney(row.grossReceived)} · ${row.orderCount} đơn`),
  ].join("\n");
}

function splitTelegramMessage(message: string) {
  if (message.length <= 4096) return [message];
  const chunks: string[] = [];
  let current = "";
  for (const line of message.split("\n")) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > 4000 && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function buildTelegramProductReportMessages(input: {
  slot: "morning" | "full-day";
  test?: boolean;
  current: ProductReportPeriod;
  sevenDay: ProductReportPeriod;
  month: ProductReportPeriod;
}) {
  return [
    currentSection(input.slot, input.test, input.current),
    sevenDaySection(input.test, input.sevenDay),
    monthSection(input.test, input.month),
  ].flatMap(splitTelegramMessage);
}
