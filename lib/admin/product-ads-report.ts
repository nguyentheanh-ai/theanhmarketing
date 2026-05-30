export const UNMAPPED_PRODUCT_NAME = "Chưa phân loại";

export type ProductAdsMapping = {
  id: string;
  productName: string;
  courseSlug?: string | null;
  campaignKeywords?: string[];
  adsetKeywords?: string[];
  utmCampaignKeywords?: string[];
  utmSourceKeywords?: string[];
  active?: boolean;
};

export type ProductAdsKpi = {
  productName: string;
  kpiLeadsPerDay: number;
  targetCpl: number;
};

export type MetaCampaignPerformanceInput = {
  campaignId: string;
  campaignName: string;
  adsetName?: string;
  spend: number;
  clicks: number;
  leads: number;
  utmCampaign?: string;
  utmSource?: string;
};

export type ProductReportOrderInput = {
  status?: string;
  amount?: number;
  courseSlug?: string;
  courseTitle?: string;
  paidAt?: string | null;
  createdAt?: string;
  orderItems?: Array<{
    slug?: string;
    title?: string;
    price?: number;
  }>;
};

export type ProductReportLeadInput = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  need?: string;
  source?: string;
  status?: string;
  createdAt?: string;
};

export type ProductAdsPerformanceRow = {
  id: string;
  productName: string;
  courseSlug: string;
  adSpend: number;
  funnelRevenue: number;
  meRePercent: number | null;
  leads: number;
  metaLeads: number;
  crmLeads: number;
  averageLeadsPerDay: number;
  kpiLeadsPerDay: number;
  targetCpl: number;
  actualCostPerLead: number | null;
  clicks: number;
  cvrLpPercent: number | null;
  campaignCount: number;
  orderCount: number;
};

type ReportAccumulator = {
  mapping: ProductAdsMapping;
  adSpend: number;
  funnelRevenue: number;
  metaLeads: number;
  crmLeads: number;
  clicks: number;
  campaignIds: Set<string>;
  orderCount: number;
};

export type BuildProductAdsPerformanceRowsInput = {
  campaigns: MetaCampaignPerformanceInput[];
  orders: ProductReportOrderInput[];
  leads: ProductReportLeadInput[];
  mappings: ProductAdsMapping[];
  kpis: ProductAdsKpi[];
  startDate: string;
  endDate: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function normalizeList(values: Array<string | null | undefined> = []) {
  return values.map((value) => normalizeText(String(value ?? ""))).filter(Boolean);
}

function includesAny(text: string, keywords: Array<string | null | undefined> = []) {
  const normalizedText = normalizeText(text);
  const normalizedKeywords = normalizeList(keywords);

  return normalizedKeywords.some((keyword) => normalizedText.includes(keyword));
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function parseDate(value?: string | null) {
  const timestamp = Date.parse(value ?? "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function dateBoundaries(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T23:59:59.999Z`);
  const safeEnd = Number.isNaN(end) ? Date.now() : end;
  const safeStart = Number.isNaN(start) ? safeEnd : start;

  return {
    start: Math.min(safeStart, safeEnd),
    end: Math.max(safeStart, safeEnd),
  };
}

function isInDateRange(value: string | null | undefined, start: number, end: number) {
  const timestamp = parseDate(value);
  return typeof timestamp === "number" && timestamp >= start && timestamp <= end;
}

export function countInclusiveDays(startDate: string, endDate: string) {
  const { start, end } = dateBoundaries(startDate, endDate);
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

function productKey(productName: string) {
  return normalizeText(productName) || normalizeText(UNMAPPED_PRODUCT_NAME);
}

function isUnmappedProduct(mapping: ProductAdsMapping) {
  return mapping.productName === UNMAPPED_PRODUCT_NAME;
}

function ensureUnmappedMapping(mappings: ProductAdsMapping[]) {
  if (mappings.some((mapping) => isUnmappedProduct(mapping))) {
    return mappings;
  }

  return [
    ...mappings,
    {
      id: "unmapped",
      productName: UNMAPPED_PRODUCT_NAME,
      courseSlug: "",
      campaignKeywords: [],
      adsetKeywords: [],
      utmCampaignKeywords: [],
      utmSourceKeywords: [],
      active: true,
    },
  ];
}

function createAccumulators(mappings: ProductAdsMapping[]) {
  const accumulators = new Map<string, ReportAccumulator>();

  for (const mapping of ensureUnmappedMapping(mappings.filter((item) => item.active !== false))) {
    accumulators.set(productKey(mapping.productName), {
      mapping,
      adSpend: 0,
      funnelRevenue: 0,
      metaLeads: 0,
      crmLeads: 0,
      clicks: 0,
      campaignIds: new Set(),
      orderCount: 0,
    });
  }

  return accumulators;
}

function getAccumulator(accumulators: Map<string, ReportAccumulator>, productName: string) {
  const key = productKey(productName);
  const existing = accumulators.get(key);

  if (existing) {
    return existing;
  }

  const mapping = {
    id: key,
    productName,
    courseSlug: "",
    active: true,
  };
  const created: ReportAccumulator = {
    mapping,
    adSpend: 0,
    funnelRevenue: 0,
    metaLeads: 0,
    crmLeads: 0,
    clicks: 0,
    campaignIds: new Set(),
    orderCount: 0,
  };

  accumulators.set(key, created);
  return created;
}

function getUnmappedAccumulator(accumulators: Map<string, ReportAccumulator>) {
  return getAccumulator(accumulators, UNMAPPED_PRODUCT_NAME);
}

function mappingMatchesCourse(mapping: ProductAdsMapping, slug?: string, title?: string) {
  const courseSlug = normalizeText(mapping.courseSlug ?? "");
  const slugText = normalizeText(slug ?? "");
  const titleText = title ?? "";

  return (
    Boolean(courseSlug && slugText && courseSlug === slugText) ||
    includesAny(titleText, [mapping.productName]) ||
    includesAny(titleText, [mapping.courseSlug ?? ""])
  );
}

function findMappingByCourse(mappings: ProductAdsMapping[], slug?: string, title?: string) {
  return mappings.find((mapping) => !isUnmappedProduct(mapping) && mappingMatchesCourse(mapping, slug, title));
}

function findMappingByCampaign(mappings: ProductAdsMapping[], campaign: MetaCampaignPerformanceInput) {
  return mappings.find((mapping) => {
    if (isUnmappedProduct(mapping)) {
      return false;
    }

    const campaignText = [campaign.campaignName, campaign.utmCampaign].filter(Boolean).join(" ");
    const adsetText = [campaign.adsetName].filter(Boolean).join(" ");
    const sourceText = [campaign.utmSource].filter(Boolean).join(" ");

    return (
      includesAny(campaignText, [mapping.productName, mapping.courseSlug ?? "", ...(mapping.campaignKeywords ?? [])]) ||
      includesAny(adsetText, [mapping.productName, mapping.courseSlug ?? "", ...(mapping.adsetKeywords ?? [])]) ||
      includesAny(campaignText, mapping.utmCampaignKeywords) ||
      includesAny(sourceText, mapping.utmSourceKeywords)
    );
  });
}

function getNoteField(note: string, label: string) {
  const normalizedLabel = normalizeText(label);
  const line = note.split(/\r?\n/).find((item) => {
    const [rawKey] = item.split(":");
    return normalizeText(rawKey ?? "") === normalizedLabel;
  });

  return line?.slice(line.indexOf(":") + 1).trim() ?? "";
}

function findMappingByLead(mappings: ProductAdsMapping[], lead: ProductReportLeadInput) {
  const note = lead.need ?? "";
  const courseText = getNoteField(note, "Khóa") || getNoteField(note, "Khoa");
  const utmSource = getNoteField(note, "UTM source") || lead.source || "";
  const utmCampaign = getNoteField(note, "UTM campaign");
  const combined = [courseText, note, lead.source].filter(Boolean).join(" ");

  return mappings.find((mapping) => {
    if (isUnmappedProduct(mapping)) {
      return false;
    }

    return (
      mappingMatchesCourse(mapping, mapping.courseSlug ?? "", courseText) ||
      includesAny(combined, [mapping.productName, mapping.courseSlug ?? ""]) ||
      includesAny(utmCampaign, mapping.utmCampaignKeywords) ||
      includesAny(utmSource, mapping.utmSourceKeywords)
    );
  });
}

function orderRevenueEntries(order: ProductReportOrderInput, mappings: ProductAdsMapping[]) {
  const orderItems = order.orderItems ?? [];

  if (orderItems.length > 0) {
    return orderItems.map((item) => {
      const mapping = findMappingByCourse(mappings, item.slug, item.title);
      return {
        mapping,
        amount: toNumber(item.price),
      };
    });
  }

  return [
    {
      mapping: findMappingByCourse(mappings, order.courseSlug, order.courseTitle),
      amount: toNumber(order.amount),
    },
  ];
}

function hasReportData(accumulator: ReportAccumulator, kpi: ProductAdsKpi | undefined) {
  return (
    accumulator.adSpend > 0 ||
    accumulator.funnelRevenue > 0 ||
    accumulator.metaLeads > 0 ||
    accumulator.crmLeads > 0 ||
    accumulator.clicks > 0 ||
    accumulator.orderCount > 0 ||
    Boolean(kpi && (kpi.kpiLeadsPerDay > 0 || kpi.targetCpl > 0))
  );
}

export function buildProductAdsPerformanceRows({
  campaigns,
  orders,
  leads,
  mappings,
  kpis,
  startDate,
  endDate,
}: BuildProductAdsPerformanceRowsInput): ProductAdsPerformanceRow[] {
  const { start, end } = dateBoundaries(startDate, endDate);
  const dayCount = countInclusiveDays(startDate, endDate);
  const accumulators = createAccumulators(mappings);
  const activeMappings = ensureUnmappedMapping(mappings.filter((item) => item.active !== false));

  for (const campaign of campaigns) {
    const accumulator =
      findMappingByCampaign(activeMappings, campaign)
        ? getAccumulator(accumulators, findMappingByCampaign(activeMappings, campaign)?.productName ?? UNMAPPED_PRODUCT_NAME)
        : getUnmappedAccumulator(accumulators);

    accumulator.adSpend += toNumber(campaign.spend);
    accumulator.clicks += toNumber(campaign.clicks);
    accumulator.metaLeads += toNumber(campaign.leads);
    accumulator.campaignIds.add(campaign.campaignId);
  }

  for (const order of orders) {
    const orderDate = order.paidAt || order.createdAt;

    if (order.status !== "paid" || !isInDateRange(orderDate, start, end)) {
      continue;
    }

    for (const entry of orderRevenueEntries(order, activeMappings)) {
      const accumulator = entry.mapping
        ? getAccumulator(accumulators, entry.mapping.productName)
        : getUnmappedAccumulator(accumulators);

      accumulator.funnelRevenue += entry.amount;
      accumulator.orderCount += 1;
    }
  }

  for (const lead of leads) {
    if (!isInDateRange(lead.createdAt, start, end)) {
      continue;
    }

    const mapping = findMappingByLead(activeMappings, lead);
    const accumulator = mapping ? getAccumulator(accumulators, mapping.productName) : getUnmappedAccumulator(accumulators);
    accumulator.crmLeads += 1;
  }

  const kpiByProduct = new Map(kpis.map((kpi) => [productKey(kpi.productName), kpi]));

  return [...accumulators.values()]
    .map<ProductAdsPerformanceRow | null>((accumulator) => {
      const kpi = kpiByProduct.get(productKey(accumulator.mapping.productName));

      if (!hasReportData(accumulator, kpi)) {
        return null;
      }

      const leadCount = Math.max(accumulator.metaLeads, accumulator.crmLeads);

      return {
        id: accumulator.mapping.id || productKey(accumulator.mapping.productName),
        productName: accumulator.mapping.productName,
        courseSlug: accumulator.mapping.courseSlug ?? "",
        adSpend: Math.round(accumulator.adSpend),
        funnelRevenue: Math.round(accumulator.funnelRevenue),
        meRePercent:
          accumulator.funnelRevenue > 0 ? round((accumulator.adSpend / accumulator.funnelRevenue) * 100, 2) : null,
        leads: leadCount,
        metaLeads: accumulator.metaLeads,
        crmLeads: accumulator.crmLeads,
        averageLeadsPerDay: round(leadCount / dayCount, 1),
        kpiLeadsPerDay: kpi?.kpiLeadsPerDay ?? 0,
        targetCpl: kpi?.targetCpl ?? 0,
        actualCostPerLead: leadCount > 0 ? Math.round(accumulator.adSpend / leadCount) : null,
        clicks: Math.round(accumulator.clicks),
        cvrLpPercent: accumulator.clicks > 0 ? round((leadCount / accumulator.clicks) * 100, 2) : null,
        campaignCount: accumulator.campaignIds.size,
        orderCount: accumulator.orderCount,
      };
    })
    .filter((row): row is ProductAdsPerformanceRow => Boolean(row))
    .sort((a, b) => b.adSpend - a.adSpend || b.funnelRevenue - a.funnelRevenue || a.productName.localeCompare(b.productName));
}
