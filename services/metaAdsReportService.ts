export type MetaAdsReport = {
  available: boolean;
  reason?: string;
  rows: Array<{ label: string; spend: number; impressions: number; clicks: number }>;
  totals: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number };
};

type ReportRange = { range: string; from: string; to: string };

function safeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function empty(reason: string): MetaAdsReport {
  return { available: false, reason, rows: [], totals: { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0 } };
}

export async function getMetaAdsReport(range: ReportRange): Promise<MetaAdsReport> {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  const rawAccount = process.env.META_ADS_AD_ACCOUNT_ID;
  if (!token || !rawAccount) return empty("Meta Ads chưa được cấu hình cho môi trường này.");

  const account = rawAccount.startsWith("act_") ? rawAccount : `act_${rawAccount.replace(/\D/g, "")}`;
  const version = process.env.META_API_VERSION || "v25.0";
  const url = new URL(`https://graph.facebook.com/${version}/${account}/insights`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("fields", "spend,impressions,clicks,ctr,cpc,date_start,date_stop");
  url.searchParams.set("time_range", JSON.stringify({ since: range.from, until: range.to }));
  url.searchParams.set("limit", "500");
  if (range.range === "today") url.searchParams.set("breakdowns", "hourly_stats_aggregated_by_advertiser_time_zone");
  else url.searchParams.set("time_increment", "1");

  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    const payload = (await response.json().catch(() => null)) as {
      data?: Array<Record<string, unknown>>;
      error?: { code?: number; error_subcode?: number; type?: string };
    } | null;
    if (!response.ok || !payload?.data) {
      const code = payload?.error?.code;
      console.warn("[meta-ads] insights unavailable", { code, subcode: payload?.error?.error_subcode, type: payload?.error?.type });
      if (code === 190) return empty("Token Meta Ads đã hết hạn hoặc không còn hợp lệ.");
      if (code === 200 || code === 10) return empty("Token Meta Ads chưa có quyền ads_read cho tài khoản quảng cáo.");
      return empty("Meta Ads từ chối truy vấn hoặc tài khoản chưa cấp đủ quyền.");
    }

    const rows = payload.data.map((row) => {
      const hourly = String(row.hourly_stats_aggregated_by_advertiser_time_zone ?? "");
      return {
        label: hourly ? hourly.slice(0, 5) : String(row.date_start ?? "").slice(5),
        spend: safeNumber(row.spend),
        impressions: safeNumber(row.impressions),
        clicks: safeNumber(row.clicks),
      };
    });
    const totals = rows.reduce((sum, row) => ({ spend: sum.spend + row.spend, impressions: sum.impressions + row.impressions, clicks: sum.clicks + row.clicks }), { spend: 0, impressions: 0, clicks: 0 });
    return {
      available: true,
      rows,
      totals: {
        ...totals,
        ctr: totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0,
        cpc: totals.clicks ? totals.spend / totals.clicks : 0,
      },
    };
  } catch {
    return empty("Meta Ads không phản hồi trong thời gian cho phép.");
  }
}
