import type { PaymentOrder } from "@/services/orderService";

type GoogleSheetSyncOptions = {
  source?: string;
  landingPageUrl?: string;
  siteUrl?: string;
  webhookUrl?: string;
  fetchImpl?: typeof fetch;
};

type GoogleSheetSyncResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  status?: number;
};

function cleanEnvValue(value: string | undefined) {
  return (value ?? "").replace(/^\uFEFF/, "").trim().replace(/^['"]|['"]$/g, "");
}

function getSiteUrl(options?: GoogleSheetSyncOptions) {
  return cleanEnvValue(options?.siteUrl) || cleanEnvValue(process.env.NEXT_PUBLIC_SITE_URL) || "https://www.theanhmarketing.com";
}

function formatVietnamDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

export function buildGoogleSheetOrderPayload(order: PaymentOrder, options: GoogleSheetSyncOptions = {}) {
  const siteUrl = getSiteUrl(options);
  const paymentUrl = `${siteUrl}/thanh-toan/${encodeURIComponent(order.orderCode)}`;
  const landingPageUrl = cleanEnvValue(options.landingPageUrl);

  return {
    date: formatVietnamDateTime(order.createdAt),
    createdAt: order.createdAt,
    orderCode: order.orderCode,
    name: order.studentName,
    email: order.email,
    phone: order.phone,
    ldpUrl: landingPageUrl,
    landingPageUrl,
    linkLdp: landingPageUrl,
    courseSlug: order.courseSlug,
    courseTitle: order.courseTitle,
    amount: order.amount,
    amountLabel: order.amountLabel,
    currency: order.currency,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentUrl,
    paidAt: order.paidAt ?? "",
    source: options.source ?? "Website",
    orderItems: order.orderItems.map((item) => `${item.title} (${item.slug}) - ${item.price}`).join(" | "),
    syncedAt: new Date().toISOString(),
  };
}

export async function syncOrderToGoogleSheet(
  order: PaymentOrder,
  options: GoogleSheetSyncOptions = {},
): Promise<GoogleSheetSyncResult> {
  const webhookUrl = cleanEnvValue(options.webhookUrl) || cleanEnvValue(process.env.GOOGLE_SHEETS_WEBHOOK_URL);

  if (!webhookUrl) {
    return { ok: true, skipped: true, reason: "Missing GOOGLE_SHEETS_WEBHOOK_URL" };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildGoogleSheetOrderPayload(order, options)),
  });

  if (!response.ok) {
    return {
      ok: false,
      skipped: false,
      reason: "Google Sheets webhook rejected the order sync.",
      status: response.status,
    };
  }

  return { ok: true, skipped: false, status: response.status };
}
