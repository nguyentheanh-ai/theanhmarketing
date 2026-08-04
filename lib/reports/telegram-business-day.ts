export type TelegramBusinessReportSlot = "morning" | "full-day";

export type TelegramBusinessReportWindow = {
  slot: TelegramBusinessReportSlot;
  startIso: string;
  endIso: string;
};

type BusinessMetricsInput = {
  grossReceived: number;
  adSpend: number;
};

type TelegramBusinessReportMessageInput = TelegramBusinessReportWindow & {
  orderCount: number;
  grossReceived: number;
  test?: boolean;
  ads: { available: true; spend: number } | { available: false; reason?: string };
};

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function latestVietnamBoundary(slot: TelegramBusinessReportSlot, now: Date) {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const targetHour = slot === "morning" ? 8 : 14;
  const todayAtTargetUtc = Date.UTC(
    vietnamNow.getUTCFullYear(),
    vietnamNow.getUTCMonth(),
    vietnamNow.getUTCDate(),
    targetHour - 7,
  );
  return new Date(now.getTime() >= todayAtTargetUtc ? todayAtTargetUtc : todayAtTargetUtc - DAY_MS);
}

export function buildTelegramReportWindow(
  slot: TelegramBusinessReportSlot,
  now = new Date(),
): TelegramBusinessReportWindow {
  const end = latestVietnamBoundary(slot, now);
  const endInVietnam = new Date(end.getTime() + VIETNAM_OFFSET_MS);
  const start = new Date(Date.UTC(
    endInVietnam.getUTCFullYear(),
    endInVietnam.getUTCMonth(),
    endInVietnam.getUTCDate() - 1,
    7,
  ));

  return { slot, startIso: start.toISOString(), endIso: end.toISOString() };
}

function roundedMoney(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

export function calculateTelegramBusinessMetrics({ grossReceived, adSpend }: BusinessMetricsInput) {
  const normalizedGross = roundedMoney(grossReceived);
  const normalizedSpend = roundedMoney(adSpend);
  const vat = roundedMoney(normalizedGross * 0.08);
  const conversionFee = roundedMoney(normalizedSpend * 0.02);
  return {
    grossReceived: normalizedGross,
    vat,
    adSpend: normalizedSpend,
    conversionFee,
    estimatedResult: normalizedGross - vat - normalizedSpend - conversionFee,
  };
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(roundedMoney(value))} ₫`;
}

function formatSignedMoney(value: number) {
  const rounded = roundedMoney(value);
  return `${rounded > 0 ? "+" : ""}${formatMoney(rounded)}`;
}

function formatVietnamDateTime(iso: string) {
  const vietnam = new Date(new Date(iso).getTime() + VIETNAM_OFFSET_MS);
  const date = [vietnam.getUTCDate(), vietnam.getUTCMonth() + 1, vietnam.getUTCFullYear()]
    .map((part, index) => index < 2 ? String(part).padStart(2, "0") : String(part))
    .join("/");
  return `${String(vietnam.getUTCHours()).padStart(2, "0")}:00 ${date}`;
}

export function buildTelegramBusinessReportMessage(input: TelegramBusinessReportMessageInput) {
  const title = input.slot === "morning" ? "BÁO CÁO 08:00" : "BÁO CÁO CHỐT NGÀY 14:00";
  const lines = [
    `${input.test ? "[TEST] " : ""}${title} · The Anh Marketing`,
    `Kỳ: ${formatVietnamDateTime(input.startIso)} → ${formatVietnamDateTime(input.endIso)}`,
    "",
    `Đơn đã thanh toán: ${Math.max(0, Math.trunc(input.orderCount))}`,
    `Tổng tiền thực thu: ${formatMoney(input.grossReceived)}`,
  ];

  if (!input.ads.available) {
    lines.push(
      `VAT Facebook (8% tiền thu): ${formatMoney(input.grossReceived * 0.08)}`,
      "Chi phí Ads: CHƯA CÓ DỮ LIỆU",
      `Trạng thái Meta: ${input.ads.reason || "Không thể tải dữ liệu Meta Ads cho kỳ này."}`,
      "Lãi/lỗ tạm tính chưa được công bố để tránh coi chi phí Ads lỗi là 0.",
    );
    return lines.join("\n");
  }

  const metrics = calculateTelegramBusinessMetrics({ grossReceived: input.grossReceived, adSpend: input.ads.spend });
  lines.push(
    `VAT Facebook (8% tiền thu): ${formatMoney(metrics.vat)}`,
    `Chi phí Ads: ${formatMoney(metrics.adSpend)}`,
    `Phí chuyển đổi (2% Ads): ${formatMoney(metrics.conversionFee)}`,
    `Lãi/lỗ tạm tính: ${formatSignedMoney(metrics.estimatedResult)}`,
    `ROAS: ${metrics.adSpend > 0 ? `${(metrics.grossReceived / metrics.adSpend).toFixed(2)}x` : "Chưa đủ dữ liệu"}`,
    `Chi phí Ads/đơn: ${input.orderCount > 0 ? formatMoney(metrics.adSpend / input.orderCount) : "Chưa đủ dữ liệu"}`,
    "Công thức: tiền thu − 8% tiền thu − Ads − 2% Ads.",
  );
  return lines.join("\n");
}
