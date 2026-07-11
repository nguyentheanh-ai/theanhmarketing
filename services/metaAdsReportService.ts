import { aggregateMetaAdsForVietnam, buildExpandedMetaDateWindow, type MetaHourlyRow } from "@/lib/meta-ads/timezone";

export type MetaAdsReport = {
  available: boolean;
  reason?: string;
  rows: Array<{ label: string; spend: number; impressions: number; clicks: number }>;
  totals: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number };
  quality: { status: "final" | "partial" | "unavailable"; timezone?: string };
};

type ReportRange = { range: string; from: string; to: string };
type MetaError = { code?: number; error_subcode?: number; type?: string };
type InsightsPayload = { data?: Array<Record<string, unknown>>; paging?: { next?: string }; error?: MetaError };

function safeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function empty(reason: string): MetaAdsReport {
  return { available: false, reason, rows: [], totals: { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0 }, quality: { status: "unavailable" } };
}

function unavailableFromMeta(error?: MetaError) {
  console.warn("[meta-ads] insights unavailable", { code: error?.code, subcode: error?.error_subcode, type: error?.type });
  if (error?.code === 190) return empty("Token Meta Ads đã hết hạn hoặc không còn hợp lệ.");
  if (error?.code === 200 || error?.code === 10) return empty("Token Meta Ads chưa có quyền ads_read cho tài khoản quảng cáo.");
  return empty("Meta Ads từ chối truy vấn hoặc tài khoản chưa cấp đủ quyền.");
}

async function readJson(url: URL | string, token: string) {
  const response = await fetch(url, { cache: "no-store", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12_000) });
  const payload = (await response.json().catch(() => null)) as InsightsPayload | null;
  return { response, payload };
}

export async function getMetaAdsReport(range: ReportRange): Promise<MetaAdsReport> {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  const rawAccount = process.env.META_ADS_AD_ACCOUNT_ID;
  if (!token || !rawAccount) return empty("Meta Ads chưa được cấu hình cho môi trường này.");

  const account = rawAccount.startsWith("act_") ? rawAccount : `act_${rawAccount.replace(/\D/g, "")}`;
  const version = process.env.META_API_VERSION || "v25.0";

  try {
    const accountUrl = new URL(`https://graph.facebook.com/${version}/${account}`);
    accountUrl.searchParams.set("fields", "name,currency,timezone_name,timezone_offset_hours_utc");
    const accountResult = await readJson(accountUrl, token);
    const accountPayload = accountResult.payload as (InsightsPayload & { timezone_name?: string }) | null;
    if (!accountResult.response.ok || !accountPayload) return unavailableFromMeta(accountPayload?.error);
    const advertiserTimezone = String(accountPayload.timezone_name ?? "");
    if (!advertiserTimezone) return empty("Tài khoản Meta Ads chưa trả về múi giờ để đối soát theo ngày Việt Nam.");

    const window = buildExpandedMetaDateWindow(range);
    const insightsUrl = new URL(`https://graph.facebook.com/${version}/${account}/insights`);
    insightsUrl.searchParams.set("fields", "spend,impressions,clicks,date_start,date_stop");
    insightsUrl.searchParams.set("time_range", JSON.stringify(window));
    insightsUrl.searchParams.set("breakdowns", "hourly_stats_aggregated_by_advertiser_time_zone");
    insightsUrl.searchParams.set("limit", "500");

    const hourlyRows: MetaHourlyRow[] = [];
    let next: string | undefined = insightsUrl.toString();
    for (let page = 0; next && page < 10; page += 1) {
      const result = await readJson(next, token);
      if (!result.response.ok || !result.payload?.data) return unavailableFromMeta(result.payload?.error);
      for (const row of result.payload.data) {
        const hourly = String(row.hourly_stats_aggregated_by_advertiser_time_zone ?? "");
        const metaHour = Number.parseInt(hourly.slice(0, 2), 10);
        if (!/^\d{2}:/.test(hourly) || !Number.isInteger(metaHour)) continue;
        hourlyRows.push({ metaDate: String(row.date_start ?? ""), metaHour, spend: safeNumber(row.spend), impressions: safeNumber(row.impressions), clicks: safeNumber(row.clicks) });
      }
      next = result.payload.paging?.next;
    }

    const report = aggregateMetaAdsForVietnam(hourlyRows, range, advertiserTimezone);
    return { available: true, ...report };
  } catch {
    return empty("Meta Ads không phản hồi trong thời gian cho phép.");
  }
}
