import { createHash } from "node:crypto";

type MetaActionSource =
  | "email"
  | "website"
  | "app"
  | "phone_call"
  | "chat"
  | "physical_store"
  | "system_generated"
  | "business_messaging"
  | "other";

type MetaUserData = {
  em?: string[];
  ph?: string[];
  external_id?: string;
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  lead_id?: number;
};

type MetaCustomData = Record<string, string | number | boolean | string[] | null | undefined>;

export type MetaServerEvent = {
  event_name: "Lead" | "Purchase" | string;
  event_time: number;
  action_source: MetaActionSource;
  event_id?: string;
  event_source_url?: string;
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
};

export type MetaConversionResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  status?: number;
};

export type MetaLeadEventInput = {
  orderCode?: string;
  studentName?: string;
  email?: string;
  phone?: string;
  courseSlug?: string;
  courseTitle?: string;
  amount?: number;
  currency?: string;
  status?: string;
  pageUrl?: string;
  referrer?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmId?: string;
  utmTerm?: string;
  campaignId?: string;
  campaignName?: string;
  adsetId?: string;
  adId?: string;
  adName?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  leadId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export type MetaPurchaseEventInput = MetaLeadEventInput & {
  paidAt?: string | null;
  orderItems?: Array<{ slug?: string; title?: string; price?: number }>;
};

const DEFAULT_API_VERSION = "v25.0";
const MAX_LOG_BODY_LENGTH = 800;
const PRIMARY_META_PIXEL_ID = "1315653423712065";

function cleanString(value?: string | null, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanUrl(value?: string | null) {
  const url = cleanString(value, 800);

  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function hashMetaValue(value?: string | null) {
  const normalized = cleanString(value).toLowerCase();

  if (!normalized) {
    return "";
  }

  return createHash("sha256").update(normalized).digest("hex");
}

export function normalizeMetaPhone(value?: string | null) {
  const digits = cleanString(value, 40).replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  if (digits.startsWith("0")) {
    return `84${digits.slice(1)}`;
  }

  return digits;
}

function normalizePixelId(value?: string | null) {
  const id = cleanString(value, 40);
  return /^\d{6,32}$/.test(id) ? id : "";
}

function numericMetaLeadId(value?: string | null) {
  const id = cleanString(value, 32);
  return /^\d{6,18}$/.test(id) ? Number(id) : undefined;
}

function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

function toUnixSeconds(value?: string | null) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : nowUnixSeconds();
}

function buildExternalId(input: MetaLeadEventInput) {
  const raw = input.orderCode || input.leadId || input.email || input.phone;
  return hashMetaValue(raw);
}

function buildUserData(input: MetaLeadEventInput): MetaUserData {
  const emailHash = hashMetaValue(input.email);
  const phoneHash = hashMetaValue(normalizeMetaPhone(input.phone));
  const externalId = buildExternalId(input);
  const leadId = numericMetaLeadId(input.leadId);

  return {
    ...(emailHash ? { em: [emailHash] } : {}),
    ...(phoneHash ? { ph: [phoneHash] } : {}),
    ...(externalId ? { external_id: externalId } : {}),
    ...(cleanString(input.fbp, 180) ? { fbp: cleanString(input.fbp, 180) } : {}),
    ...(cleanString(input.fbc, 220) ? { fbc: cleanString(input.fbc, 220) } : {}),
    ...(cleanString(input.ipAddress, 80) ? { client_ip_address: cleanString(input.ipAddress, 80) } : {}),
    ...(cleanString(input.userAgent, 500) ? { client_user_agent: cleanString(input.userAgent, 500) } : {}),
    ...(leadId ? { lead_id: leadId } : {}),
  };
}

function buildBaseCustomData(input: MetaLeadEventInput): MetaCustomData {
  return {
    event_source: "crm",
    lead_event_source: "The Anh Marketing CRM",
    content_name: cleanString(input.courseTitle, 200) || undefined,
    content_ids: input.courseSlug ? [cleanString(input.courseSlug, 120)] : undefined,
    order_id: cleanString(input.orderCode, 80) || undefined,
    status: cleanString(input.status, 40) || undefined,
    value: typeof input.amount === "number" && Number.isFinite(input.amount) ? input.amount : undefined,
    currency: cleanString(input.currency, 10) || "VND",
    content_type: "product",
    landing_page: cleanString(input.landingPage, 160) || undefined,
    utm_source: cleanString(input.utmSource, 120) || undefined,
    utm_medium: cleanString(input.utmMedium, 120) || undefined,
    utm_campaign: cleanString(input.utmCampaign, 160) || undefined,
    utm_content: cleanString(input.utmContent, 160) || undefined,
    utm_id: cleanString(input.utmId, 160) || undefined,
    utm_term: cleanString(input.utmTerm, 160) || undefined,
    campaign_id: cleanString(input.campaignId, 120) || undefined,
    campaign_name: cleanString(input.campaignName, 200) || undefined,
    adset_id: cleanString(input.adsetId, 120) || undefined,
    ad_id: cleanString(input.adId, 120) || undefined,
    ad_name: cleanString(input.adName, 200) || undefined,
    fbclid: cleanString(input.fbclid, 220) || undefined,
  };
}

export function buildMetaLeadEvent(input: MetaLeadEventInput, eventTime = nowUnixSeconds()): MetaServerEvent {
  const pageUrl = cleanUrl(input.pageUrl);

  return {
    event_name: "Lead",
    event_time: eventTime,
    action_source: "website",
    event_id: cleanString(input.leadId, 120) || cleanString(input.orderCode, 80) || undefined,
    event_source_url: pageUrl || undefined,
    user_data: buildUserData(input),
    custom_data: buildBaseCustomData(input),
  };
}

export function buildMetaPurchaseEvent(input: MetaPurchaseEventInput, eventTime = toUnixSeconds(input.paidAt)): MetaServerEvent {
  const pageUrl = cleanUrl(input.pageUrl);
  const itemSlugs = (input.orderItems ?? [])
    .map((item) => cleanString(item.slug, 120))
    .filter(Boolean);

  return {
    event_name: "Purchase",
    event_time: eventTime,
    action_source: "website",
    event_id: cleanString(input.orderCode, 80) || undefined,
    event_source_url: pageUrl || undefined,
    user_data: buildUserData(input),
    custom_data: {
      ...buildBaseCustomData(input),
      content_ids: itemSlugs.length > 0 ? itemSlugs : input.courseSlug ? [cleanString(input.courseSlug, 120)] : undefined,
      num_items: itemSlugs.length || undefined,
      payment_status: "paid",
      paid_at: cleanString(input.paidAt, 80) || undefined,
    },
  };
}

function getMetaConfig() {
  const accessToken = cleanString(process.env.META_CAPI_ACCESS_TOKEN, 2000);
  const datasetId = normalizePixelId(PRIMARY_META_PIXEL_ID);
  const apiVersion = /^v\d+\.\d+$/.test(cleanString(process.env.META_CAPI_API_VERSION, 20))
    ? cleanString(process.env.META_CAPI_API_VERSION, 20)
    : DEFAULT_API_VERSION;
  const testEventCode = cleanString(process.env.META_CAPI_TEST_EVENT_CODE, 120);

  return {
    accessToken,
    datasetId,
    apiVersion,
    testEventCode,
  };
}

function sanitizeMetaError(body: string) {
  return body.replace(/access_token=[^&"'\s]+/gi, "access_token=[redacted]").slice(0, MAX_LOG_BODY_LENGTH);
}

export async function sendMetaConversionEvent(event: MetaServerEvent): Promise<MetaConversionResult> {
  const config = getMetaConfig();

  if (!config.accessToken || !config.datasetId) {
    return { ok: true, skipped: true, reason: "Missing Meta CAPI config" };
  }

  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.datasetId}/events?access_token=${encodeURIComponent(
    config.accessToken,
  )}`;
  const payload = {
    data: [event],
    ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = sanitizeMetaError(await response.text());
      console.warn("[meta] Conversion API request failed:", {
        status: response.status,
        body,
      });
      return { ok: false, skipped: false, status: response.status, reason: "Meta CAPI request failed" };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "Meta CAPI request failed",
    };
  }
}

export function sendMetaLeadEvent(input: MetaLeadEventInput) {
  return sendMetaConversionEvent(buildMetaLeadEvent(input));
}

export function sendMetaPurchaseEvent(input: MetaPurchaseEventInput) {
  return sendMetaConversionEvent(buildMetaPurchaseEvent(input));
}
