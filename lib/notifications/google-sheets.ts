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
  responseSnippet?: string;
  webhookHost?: string;
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

function sanitizeResponseSnippet(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function parseWebhookSuccess(responseText: string) {
  const snippet = sanitizeResponseSnippet(responseText);
  const lower = snippet.toLowerCase();
  const rawLower = responseText.toLowerCase();

  if (
    lower.includes("không tìm thấy hàm tập lệnh") ||
    lower.includes("khong tim thay ham tap lenh") ||
    lower.includes("script function not found") ||
    lower.includes("dopost") ||
    lower.includes("google apps script") ||
    rawLower.includes("<!doctype html")
  ) {
    return {
      ok: false as const,
      reason:
        "Google Sheets Apps Script Web App responded with an error page. The deployment must define function doPost(e) and return JSON.",
      responseSnippet: snippet,
    };
  }

  if (!responseText.trim()) {
    return { ok: true as const, responseSnippet: snippet };
  }

  try {
    const parsed = JSON.parse(responseText) as { ok?: unknown; success?: unknown; error?: unknown; message?: unknown };
    const explicitSuccess = parsed.ok === true || parsed.success === true;
    const explicitFailure = parsed.ok === false || parsed.success === false || parsed.error;

    if (explicitFailure) {
      return {
        ok: false as const,
        reason: String(parsed.error || parsed.message || "Google Sheets webhook returned a failure response."),
        responseSnippet: snippet,
      };
    }

    return { ok: explicitSuccess || Object.keys(parsed).length > 0, responseSnippet: snippet };
  } catch {
    return { ok: true as const, responseSnippet: snippet };
  }
}

function parseAppsScriptWebhookUrl(webhookUrl: string) {
  try {
    const url = new URL(webhookUrl);
    const isAppsScriptHost = url.hostname === "script.google.com" || url.hostname === "script.googleusercontent.com";
    const isExecPath = url.pathname.includes("/macros/s/") && url.pathname.endsWith("/exec");

    if (url.protocol !== "https:" || !isAppsScriptHost || !isExecPath) {
      return {
        ok: false as const,
        host: url.hostname,
        reason:
          "GOOGLE_SHEETS_WEBHOOK_URL must be an Apps Script Web App /exec URL, for example https://script.google.com/macros/s/.../exec.",
      };
    }

    return { ok: true as const, url, host: url.hostname };
  } catch {
    return {
      ok: false as const,
      host: "",
      reason: "GOOGLE_SHEETS_WEBHOOK_URL is not a valid URL.",
    };
  }
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
  const date = formatVietnamDateTime(order.createdAt);
  const paidAt = order.paidAt ? formatVietnamDateTime(order.paidAt) : "";
  const expiresAt = order.expiresAt ? formatVietnamDateTime(order.expiresAt) : "";
  const source = options.source ?? "Website";
  const orderItems = order.orderItems.map((item) => `${item.title} (${item.slug}) - ${item.price}`).join(" | ");
  const syncedAt = new Date().toISOString();

  return {
    entityType: "order",
    dedupeKey: order.orderCode || order.id,
    date,
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
    paidAt,
    source,
    orderItems,
    syncedAt,
    "Created At": date,
    "Order Code": order.orderCode,
    "Customer Name": order.studentName,
    Email: order.email,
    Phone: order.phone,
    "Course Slug": order.courseSlug,
    "Course Title": order.courseTitle,
    Amount: order.amount,
    Currency: order.currency,
    Status: order.status,
    "Payment Method": order.paymentMethod,
    "Payment URL": paymentUrl,
    "Paid At": paidAt,
    Source: source,
    "Order Items": orderItems,
    "Synced At": syncedAt,
    "Mã đơn": order.orderCode,
    "Ngày tạo": date,
    "Khách hàng": order.studentName,
    "SĐT": order.phone,
    "Khóa/Gói": order.courseTitle,
    "Số tiền": order.amount,
    "Trạng thái": order.status,
    "Phương thức": order.paymentMethod,
    "Ngày thanh toán": paidAt,
    "Hạn thanh toán": expiresAt,
    "Mã GD SePay": order.sepayReferenceCode ?? "",
    "Course slug": order.courseSlug,
    "Link thanh toán": paymentUrl,
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

  const parsedWebhook = parseAppsScriptWebhookUrl(webhookUrl);

  if (!parsedWebhook.ok) {
    console.warn("[google-sheets] Invalid webhook URL configuration.", {
      entityType: payload.entityType,
      dedupeKey: payload.dedupeKey,
      host: parsedWebhook.host || "invalid",
    });
    return {
      ok: false,
      skipped: false,
      reason: parsedWebhook.reason,
      webhookHost: parsedWebhook.host || undefined,
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(parsedWebhook.url.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    const responseSnippet = sanitizeResponseSnippet(responseText);
    const reason =
      response.status === 403
        ? "Google Sheets Apps Script webhook returned HTTP 403. Redeploy the Apps Script Web App with Execute as: Me and Who has access: Anyone, then update GOOGLE_SHEETS_WEBHOOK_URL to the new /exec URL."
        : `Google Sheets webhook rejected the sync with HTTP ${response.status}.`;

    console.warn("[google-sheets] Webhook rejected sync.", {
      entityType: payload.entityType,
      dedupeKey: payload.dedupeKey,
      status: response.status,
      host: parsedWebhook.host,
      responseSnippet,
    });
    return {
      ok: false,
      skipped: false,
      reason,
      status: response.status,
      responseSnippet,
      webhookHost: parsedWebhook.host,
    };
  }

  const parsedSuccess = parseWebhookSuccess(responseText);

  if (!parsedSuccess.ok) {
    console.warn("[google-sheets] Webhook returned an error payload.", {
      entityType: payload.entityType,
      dedupeKey: payload.dedupeKey,
      status: response.status,
      host: parsedWebhook.host,
      responseSnippet: parsedSuccess.responseSnippet,
    });
    return {
      ok: false,
      skipped: false,
      reason: parsedSuccess.reason,
      status: response.status,
      responseSnippet: parsedSuccess.responseSnippet,
      webhookHost: parsedWebhook.host,
    };
  }

  return {
    ok: true,
    skipped: false,
    status: response.status,
    responseSnippet: parsedSuccess.responseSnippet,
    webhookHost: parsedWebhook.host,
  };
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
