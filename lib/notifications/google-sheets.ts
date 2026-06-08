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

export type GoogleSheetLeadRecord = {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  need?: string;
  source?: string;
  status?: string;
  saleStatus?: string;
  createdAt?: string;
  orderCode?: string | null;
  courseTitle?: string | null;
  paymentStatus?: string;
  paymentMethod?: string | null;
  paidAt?: string | null;
  resendEmailCount?: number;
};

function cleanEnvValue(value: string | undefined) {
  return (value ?? "").replace(/^\uFEFF/, "").trim().replace(/^['"]|['"]$/g, "");
}

function normalizeSiteUrl(value?: string) {
  const rawUrl = cleanEnvValue(value) || "https://theanhmarketing.com";

  try {
    const url = new URL(rawUrl);
    url.protocol = "https:";

    if (url.hostname === "www.theanhmarketing.com") {
      url.hostname = "theanhmarketing.com";
    }

    return url.origin;
  } catch {
    return "https://theanhmarketing.com";
  }
}

function getSiteUrl(options?: GoogleSheetSyncOptions) {
  return normalizeSiteUrl(options?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL);
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
    entityType: "order",
    dedupeKey: order.orderCode || order.id,
    date: formatVietnamDateTime(order.createdAt),
    createdAt: order.createdAt,
    id: order.id,
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

export function buildGoogleSheetLeadPayload(lead: GoogleSheetLeadRecord, options: GoogleSheetSyncOptions = {}) {
  const createdAt = lead.createdAt || new Date().toISOString();
  const normalizedEmail = (lead.email ?? "").trim().toLowerCase();
  const normalizedPhone = (lead.phone ?? "").replace(/\D/g, "");
  const orderCode = lead.orderCode ?? "";
  const dedupeKey = lead.id || orderCode || normalizedEmail || normalizedPhone;

  return {
    entityType: "lead",
    dedupeKey,
    date: formatVietnamDateTime(createdAt),
    createdAt,
    leadId: lead.id ?? "",
    orderCode,
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone,
    courseTitle: lead.courseTitle ?? "",
    status: lead.status ?? "new",
    saleStatus: lead.saleStatus ?? "Chưa liên hệ",
    paymentStatus: lead.paymentStatus ?? "unpaid",
    paymentMethod: lead.paymentMethod ?? "",
    paidAt: lead.paidAt ?? "",
    source: options.source ?? lead.source ?? "Website",
    note: lead.need ?? "",
    resendEmailCount: lead.resendEmailCount ?? 0,
    syncedAt: new Date().toISOString(),
  };
}

async function postGoogleSheetPayload(payload: Record<string, unknown>, options: GoogleSheetSyncOptions = {}) {
  const webhookUrl = cleanEnvValue(options.webhookUrl) || cleanEnvValue(process.env.GOOGLE_SHEETS_WEBHOOK_URL);

  if (!webhookUrl) {
    console.warn("[google-sheets] Missing GOOGLE_SHEETS_WEBHOOK_URL; skipped sync.", {
      entityType: payload.entityType,
      dedupeKey: payload.dedupeKey,
    });
    return { ok: true, skipped: true, reason: "Missing GOOGLE_SHEETS_WEBHOOK_URL" };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.warn("[google-sheets] Webhook rejected sync.", {
      entityType: payload.entityType,
      dedupeKey: payload.dedupeKey,
      status: response.status,
    });
    return {
      ok: false,
      skipped: false,
      reason: "Google Sheets webhook rejected the sync.",
      status: response.status,
    };
  }

  return { ok: true, skipped: false, status: response.status };
}

export async function syncOrderToGoogleSheet(
  order: PaymentOrder,
  options: GoogleSheetSyncOptions = {},
): Promise<GoogleSheetSyncResult> {
  return postGoogleSheetPayload(buildGoogleSheetOrderPayload(order, options), options);
}

export async function syncLeadToGoogleSheet(
  lead: GoogleSheetLeadRecord,
  options: GoogleSheetSyncOptions = {},
): Promise<GoogleSheetSyncResult> {
  return postGoogleSheetPayload(buildGoogleSheetLeadPayload(lead, options), options);
}
