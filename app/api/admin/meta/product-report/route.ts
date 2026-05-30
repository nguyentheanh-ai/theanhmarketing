import { NextResponse } from "next/server";
import {
  buildProductAdsPerformanceRows,
  type ProductAdsKpi,
  type ProductAdsMapping,
} from "@/lib/admin/product-ads-report";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import {
  getMetaAdAccounts,
  getMetaAdsAccessToken,
  getMetaCampaignPerformance,
  type MetaAdAccount,
} from "@/lib/meta/ads-api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCourses } from "@/services/courseService";
import { getLeads } from "@/services/leadService";
import { getPaymentOrders } from "@/services/orderService";

type ProductAdsMappingRow = {
  id: string;
  product_name: string;
  course_slug: string | null;
  campaign_keywords: string[] | null;
  adset_keywords: string[] | null;
  utm_campaign_keywords: string[] | null;
  utm_source_keywords: string[] | null;
  active: boolean | null;
};

type ProductAdsKpiRow = {
  product_name: string;
  kpi_leads_per_day: number | string | null;
  target_cpl: number | string | null;
};

function toDateInput(value: string | null, fallback: Date) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return fallback.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  return {
    start,
    end,
  };
}

function isMissingSchemaError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("does not exist");
}

function defaultMappingsFromCourses(courses: Awaited<ReturnType<typeof getCourses>>): ProductAdsMapping[] {
  return courses.map((course) => ({
    id: `course:${course.slug}`,
    productName: course.title,
    courseSlug: course.slug,
    campaignKeywords: [course.slug, course.title],
    adsetKeywords: [course.slug, course.title],
    utmCampaignKeywords: [course.slug],
    utmSourceKeywords: [],
    active: true,
  }));
}

async function loadProductAdsMappings(courses: Awaited<ReturnType<typeof getCourses>>) {
  const fallback = defaultMappingsFromCourses(courses);
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { mappings: fallback, storage: "fallback" as const };
  }

  const { data, error } = await supabase
    .from("product_ads_mappings")
    .select(
      "id,product_name,course_slug,campaign_keywords,adset_keywords,utm_campaign_keywords,utm_source_keywords,active",
    )
    .eq("active", true);

  if (error) {
    return {
      mappings: fallback,
      storage: isMissingSchemaError(error) ? ("missing_schema" as const) : ("fallback" as const),
    };
  }

  if (!data || data.length === 0) {
    return { mappings: fallback, storage: "fallback" as const };
  }

  return {
    mappings: (data as ProductAdsMappingRow[]).map((row) => ({
      id: row.id,
      productName: row.product_name,
      courseSlug: row.course_slug,
      campaignKeywords: row.campaign_keywords ?? [],
      adsetKeywords: row.adset_keywords ?? [],
      utmCampaignKeywords: row.utm_campaign_keywords ?? [],
      utmSourceKeywords: row.utm_source_keywords ?? [],
      active: row.active ?? true,
    })),
    storage: "database" as const,
  };
}

async function loadProductAdsKpis() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { kpis: [] as ProductAdsKpi[], storage: "fallback" as const };
  }

  const { data, error } = await supabase
    .from("product_ads_kpis")
    .select("product_name,kpi_leads_per_day,target_cpl");

  if (error) {
    return {
      kpis: [] as ProductAdsKpi[],
      storage: isMissingSchemaError(error) ? ("missing_schema" as const) : ("fallback" as const),
    };
  }

  return {
    kpis: ((data ?? []) as ProductAdsKpiRow[]).map((row) => ({
      productName: row.product_name,
      kpiLeadsPerDay: Number(row.kpi_leads_per_day ?? 0),
      targetCpl: Number(row.target_cpl ?? 0),
    })),
    storage: "database" as const,
  };
}

function summarizeRows(rows: ReturnType<typeof buildProductAdsPerformanceRows>) {
  const totals = rows.reduce(
    (summary, row) => ({
      adSpend: summary.adSpend + row.adSpend,
      funnelRevenue: summary.funnelRevenue + row.funnelRevenue,
      leads: summary.leads + row.leads,
      clicks: summary.clicks + row.clicks,
    }),
    { adSpend: 0, funnelRevenue: 0, leads: 0, clicks: 0 },
  );

  return {
    ...totals,
    meRePercent: totals.funnelRevenue > 0 ? Number(((totals.adSpend / totals.funnelRevenue) * 100).toFixed(2)) : null,
    actualCostPerLead: totals.leads > 0 ? Math.round(totals.adSpend / totals.leads) : null,
    cvrLpPercent: totals.clicks > 0 ? Number(((totals.leads / totals.clicks) * 100).toFixed(2)) : null,
  };
}

async function loadMetaData({
  adAccountId,
  startDate,
  endDate,
}: {
  adAccountId: string;
  startDate: string;
  endDate: string;
}) {
  const token = getMetaAdsAccessToken();

  if (!token) {
    return {
      accounts: [] as MetaAdAccount[],
      campaigns: [],
      selectedAdAccountId: adAccountId,
      metaConfigured: false,
      metaError: null,
    };
  }

  try {
    const accounts = await getMetaAdAccounts(token);
    const selectedAdAccountId = adAccountId || process.env.META_ADS_AD_ACCOUNT_ID || accounts[0]?.id || "";
    const campaigns = selectedAdAccountId
      ? await getMetaCampaignPerformance({ adAccountId: selectedAdAccountId, startDate, endDate, accessToken: token })
      : [];

    return {
      accounts,
      campaigns,
      selectedAdAccountId,
      metaConfigured: true,
      metaError: null,
    };
  } catch (error) {
    return {
      accounts: [] as MetaAdAccount[],
      campaigns: [],
      selectedAdAccountId: adAccountId,
      metaConfigured: true,
      metaError: error instanceof Error ? error.message : "Không đọc được Meta Ads.",
    };
  }
}

export async function GET(request: Request) {
  const { isAdmin, adminRole } = await getCurrentAuth();

  if (isAuthGuardEnabled() && (!isAdmin || !canAccessAdminRole(adminRole, ["owner"]))) {
    return NextResponse.json({ ok: false, message: "Bạn cần quyền owner để xem báo cáo Facebook Ads." }, { status: 403 });
  }

  const url = new URL(request.url);
  const defaults = defaultDateRange();
  const startDate = toDateInput(url.searchParams.get("start_date"), defaults.start);
  const endDate = toDateInput(url.searchParams.get("end_date"), defaults.end);
  const adAccountId = url.searchParams.get("ad_account_id") ?? "";

  const [courses, orders, leads, meta] = await Promise.all([
    getCourses(),
    getPaymentOrders({ includeFallback: false }),
    getLeads({ includeFallback: false }),
    loadMetaData({ adAccountId, startDate, endDate }),
  ]);
  const [mappingResult, kpiResult] = await Promise.all([loadProductAdsMappings(courses), loadProductAdsKpis()]);
  const rows = buildProductAdsPerformanceRows({
    campaigns: meta.campaigns,
    orders,
    leads,
    mappings: mappingResult.mappings,
    kpis: kpiResult.kpis,
    startDate,
    endDate,
  });

  return NextResponse.json({
    ok: true,
    data: {
      rows,
      summary: summarizeRows(rows),
      accounts: meta.accounts,
      selectedAdAccountId: meta.selectedAdAccountId,
      dateRange: { startDate, endDate },
      metaConfigured: meta.metaConfigured,
      metaError: meta.metaError,
      mappingStorage: mappingResult.storage,
      kpiStorage: kpiResult.storage,
    },
  });
}
