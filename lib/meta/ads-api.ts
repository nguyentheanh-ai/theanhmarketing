import type { MetaCampaignPerformanceInput } from "@/lib/admin/product-ads-report";

type MetaApiErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type MetaAction = {
  action_type: string;
  value: string | number;
};

type MetaInsightRow = {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string | number;
  clicks?: string | number;
  actions?: MetaAction[];
};

export type MetaAdAccount = {
  id: string;
  account_id?: string;
  name?: string;
  currency?: string;
  timezone_name?: string;
  account_status?: number;
};

const leadActionTypes = new Set(["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"]);

function getMetaApiVersion() {
  return process.env.META_API_VERSION || process.env.META_CAPI_API_VERSION || "v25.0";
}

export function getMetaAdsAccessToken() {
  return process.env.META_ADS_ACCESS_TOKEN || "";
}

export function normalizeMetaAdAccountId(adAccountId: string) {
  return adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function graphUrl(path: string, params?: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${getMetaApiVersion()}/${path.replace(/^\//, "")}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

function classifyMetaError(status: number, payload: MetaApiErrorPayload) {
  const rawMessage = payload.error?.message || "Meta API trả về lỗi không xác định.";
  const lowerMessage = rawMessage.toLowerCase();

  if (payload.error?.code === 190 || lowerMessage.includes("access token") || lowerMessage.includes("invalid oauth")) {
    return new Error("Token Meta Ads không hợp lệ hoặc đã hết hạn.");
  }

  if (lowerMessage.includes("ads_read")) {
    return new Error("Token Meta Ads thiếu quyền ads_read để đọc báo cáo.");
  }

  if (status === 429 || lowerMessage.includes("rate limit")) {
    return new Error("Meta API đang giới hạn tần suất gọi. Hãy thử lại sau ít phút.");
  }

  return new Error(rawMessage);
}

async function metaFetch<T>(path: string, params: Record<string, string>, accessToken = getMetaAdsAccessToken()) {
  if (!accessToken) {
    return null;
  }

  const response = await fetch(graphUrl(path, params), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T & MetaApiErrorPayload;

  if (!response.ok) {
    throw classifyMetaError(response.status, payload);
  }

  return payload as T;
}

function sumLeadActions(actions?: MetaAction[]) {
  return (actions ?? [])
    .filter((action) => leadActionTypes.has(action.action_type))
    .reduce((sum, action) => sum + toNumber(action.value), 0);
}

export async function getMetaAdAccounts(accessToken = getMetaAdsAccessToken()) {
  const payload = await metaFetch<{ data?: MetaAdAccount[] }>(
    "me/adaccounts",
    {
      fields: "id,account_id,name,currency,timezone_name,account_status",
      limit: "100",
    },
    accessToken,
  );

  return payload?.data ?? [];
}

export async function getMetaCampaignPerformance({
  adAccountId,
  startDate,
  endDate,
  accessToken = getMetaAdsAccessToken(),
}: {
  adAccountId: string;
  startDate: string;
  endDate: string;
  accessToken?: string;
}): Promise<MetaCampaignPerformanceInput[]> {
  const normalizedAdAccountId = normalizeMetaAdAccountId(adAccountId);
  const payload = await metaFetch<{ data?: MetaInsightRow[] }>(
    `${normalizedAdAccountId}/insights`,
    {
      level: "campaign",
      fields: "campaign_id,campaign_name,spend,clicks,actions",
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      limit: "500",
    },
    accessToken,
  );

  return (payload?.data ?? []).map((row, index) => ({
    campaignId: row.campaign_id || `campaign-${index}`,
    campaignName: row.campaign_name || "Campaign không tên",
    spend: toNumber(row.spend),
    clicks: toNumber(row.clicks),
    leads: sumLeadActions(row.actions),
  }));
}
