import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "../supabase/admin";
import { listAdminMembers } from "../admin/admin-members";
import { isCrmV2Enabled, shouldUseCrmV2DemoData } from "./feature-flag";
import {
  demoAutomationWorkflows,
  demoContacts,
  demoDashboard,
  demoEmailKpis,
  demoEmailCampaigns,
  demoEvents,
  demoIntegrations,
  demoLeads,
  demoOrders,
  demoSegments,
  demoStudents,
  demoTeamMembers,
} from "./mock-data";
import { normalizeEmail, normalizePhone } from "./normalize";
import { buildCrmLeadSearchOrFilter, getCrmDateRange, normalizeCrmListQuery, normalizeCrmSearchTerm } from "./query";
import { createWorkflowStepRunsForRun } from "./workflow-runner";
export { buildCrmLeadSearchOrFilter, getCrmDateRange, normalizeCrmListQuery, normalizeCrmSearchTerm };
import type {
  CrmContact,
  CrmDashboardData,
  CrmEvent,
  CrmAutomationWorkflowRow,
  CrmEmailCampaignRow,
  CrmCourseOption,
  CrmIntegrationRow,
  CrmLeadRow,
  CrmUnifiedCustomerRow,
  CrmLeadProfile,
  CrmProfileAutomationRun,
  CrmProfileEmailHistory,
  CrmProfileNote,
  CrmProfileTask,
  KpiMetric,
  CrmLeadBulkAction,
  CrmLeadBulkActionPayload,
  CrmLeadBulkActionResult,
  CrmLeadBulkActionResultItem,
  CrmLeadExportResult,
  CrmListQuery,
  CrmListResult,
  CrmOrderRow,
  CrmStage,
  CrmSegmentRow,
  CrmReportAttributionRow,
  CrmStudentRow,
  CrmTeamMember,
} from "./types";
import { getEmailProvider } from "./email-provider";
import { canSendMarketingEmail } from "./suppression";
import { buildAdaptiveRevenueSeries } from "./revenue-series";
import { buildCrmOrderSummary, selectCanonicalOrderMetricRows, type CrmOrderSummary } from "./order-summary";

function paginate<T>(rows: T[], query: CrmListQuery): CrmListResult<T> {
  const start = (query.page - 1) * query.pageSize;
  const pageRows = rows.slice(start, start + query.pageSize);
  return {
    rows: pageRows,
    page: query.page,
    pageSize: query.pageSize,
    total: rows.length,
    pageCount: Math.max(1, Math.ceil(rows.length / query.pageSize)),
  };
}

function emptyCrmListResult<T>(query: CrmListQuery): CrmListResult<T> {
  return {
    rows: [],
    page: query.page,
    pageSize: query.pageSize,
    total: 0,
    pageCount: 1,
  };
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map((item) => asRecord(item)) : [];
}

function numericValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function rpcListResult<T>(query: CrmListQuery, raw: unknown, rows: T[]): CrmListResult<T> {
  const payload = asRecord(raw);
  const total = numericValue(payload.total) || rows.length;
  return {
    rows,
    page: query.page,
    pageSize: query.pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

function filterDemoLeads(rows: CrmLeadRow[], query: CrmListQuery) {
  const search = query.search?.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (query.filters?.stage && row.stage !== query.filters.stage) return false;
      if (query.filters?.source && row.source !== query.filters.source) return false;
      if (search) {
        return [row.name, row.email, row.phone, row.course, row.source].some((value) => value?.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      const direction = query.sortDirection === "asc" ? 1 : -1;
      const key = query.sortBy ?? "createdAt";
      const aValue = String((a as Record<string, unknown>)[key] ?? "");
      const bValue = String((b as Record<string, unknown>)[key] ?? "");
      return aValue.localeCompare(bValue) * direction;
    });
}

function filterDemoOrders(rows: CrmOrderRow[], query: CrmListQuery) {
  const search = query.search?.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (query.filters?.status && row.status !== query.filters.status) return false;
      if (query.filters?.source && row.source !== query.filters.source) return false;
      if (search) {
        return [row.orderCode, row.customer, row.product, row.payment, row.status, row.source].some((value) => value?.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      const direction = query.sortDirection === "asc" ? 1 : -1;
      const key = query.sortBy ?? "created";
      const aValue = String((a as Record<string, unknown>)[key] ?? "");
      const bValue = String((b as Record<string, unknown>)[key] ?? "");
      return aValue.localeCompare(bValue) * direction;
    });
}

function filterDemoStudents(rows: CrmStudentRow[], query: CrmListQuery) {
  const search = query.search?.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (query.filters?.status && row.status !== query.filters.status) return false;
      if (query.filters?.course && row.course !== query.filters.course) return false;
      if (search) {
        return [row.student, row.course, row.status, row.engagement, row.emailCare].some((value) => value?.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      const direction = query.sortDirection === "asc" ? 1 : -1;
      const key = query.sortBy ?? "lastLearned";
      const aValue = String((a as Record<string, unknown>)[key] ?? "");
      const bValue = String((b as Record<string, unknown>)[key] ?? "");
      return aValue.localeCompare(bValue) * direction;
    });
}

function filterDemoTeamMembers(rows: CrmTeamMember[], query: CrmListQuery) {
  const search = query.search?.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (query.filters?.status && row.status !== query.filters.status) return false;
      if (query.filters?.role && row.role !== query.filters.role) return false;
      if (search) {
        return [row.member, row.role, row.pipeline, row.status].some((value) => value?.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      const direction = query.sortDirection === "asc" ? 1 : -1;
      const key = query.sortBy ?? "member";
      const aValue = String((a as Record<string, unknown>)[key] ?? "");
      const bValue = String((b as Record<string, unknown>)[key] ?? "");
      return aValue.localeCompare(bValue) * direction;
    });
}

function filterDemoIntegrations(rows: CrmIntegrationRow[], query: CrmListQuery) {
  const search = query.search?.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (query.filters?.status && row.status !== query.filters.status) return false;
      if (search) {
        return [row.provider, row.type, row.status, row.health, row.lastSync].some((value) => value.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      const direction = query.sortDirection === "asc" ? 1 : -1;
      const key = query.sortBy === "lastSync" ? "lastSync" : query.sortBy ?? "provider";
      const aValue = String((a as Record<string, unknown>)[key] ?? "");
      const bValue = String((b as Record<string, unknown>)[key] ?? "");
      return aValue.localeCompare(bValue) * direction;
    });
}

function filterDemoSegments(rows: CrmSegmentRow[], query: CrmListQuery) {
  const search = query.search?.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (query.filters?.status && row.status !== query.filters.status) return false;
      if (query.filters?.source && row.channel !== query.filters.source) return false;
      if (search) {
        return [row.name, row.condition, row.channel, row.goal, row.status].some((value) => value.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      const direction = query.sortDirection === "asc" ? 1 : -1;
      const key = query.sortBy === "name" ? "name" : query.sortBy === "size" ? "size" : query.sortBy ?? "updated";
      const aValue = String((a as Record<string, unknown>)[key] ?? "");
      const bValue = String((b as Record<string, unknown>)[key] ?? "");
      return aValue.localeCompare(bValue) * direction;
    });
}

function filterDemoAutomationWorkflows(rows: CrmAutomationWorkflowRow[], query: CrmListQuery) {
  const search = query.search?.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (query.filters?.status && row.status !== query.filters.status) return false;
      if (search) {
        return [row.name, row.status, row.runs, row.updated].some((value) => value.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      const direction = query.sortDirection === "asc" ? 1 : -1;
      const key = query.sortBy === "runs" || query.sortBy === "runsNumeric" ? "runsNumeric" : query.sortBy ?? "updated";
      const aValue = Number((a as Record<string, unknown>)[key] ?? 0);
      const bValue = Number((b as Record<string, unknown>)[key] ?? 0);
      if (!Number.isNaN(aValue) && !Number.isNaN(bValue)) return (aValue - bValue) * direction;
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
}

function filterDemoEmailCampaigns(rows: CrmEmailCampaignRow[], query: CrmListQuery) {
  const search = query.search?.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (query.filters?.status && row.status !== query.filters.status) return false;
      if (query.filters?.source && row.type !== query.filters.source) return false;
      if (search) {
        return [row.name, row.segment, row.type, row.status, row.owner].some((value) => value.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      const direction = query.sortDirection === "asc" ? 1 : -1;
      const key =
        query.sortBy === "openRate" ? "openRate" : query.sortBy === "clickRate" ? "clickRate" : query.sortBy === "conversion" ? "conversion" : query.sortBy ?? "sendTime";
      const aValue = String((a as Record<string, unknown>)[key] ?? "");
      const bValue = String((b as Record<string, unknown>)[key] ?? "");
      return aValue.localeCompare(bValue) * direction;
    });
}

function filterDemoReportAttributionRows(rows: CrmReportAttributionRow[], query: CrmListQuery) {
  const search = query.search?.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (search) {
        return [row.channel, row.note, row.cr, row.cac, row.roi].some((value) => value.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      const direction = query.sortDirection === "asc" ? 1 : -1;
      const key = query.sortBy === "mql" ? "mql" : query.sortBy === "paid" ? "paid" : query.sortBy ?? "revenue";
      const aValue = String((a as Record<string, unknown>)[key] ?? "");
      const bValue = String((b as Record<string, unknown>)[key] ?? "");
      return aValue.localeCompare(bValue) * direction;
    });
}

function mapIntegrationHealth(status: string, lastSyncAt: string | null | undefined) {
  const statusValue = (status || "").toLowerCase();
  if (statusValue.includes("error")) return "error";
  if (statusValue === "ready" || statusValue === "active" || statusValue === "enabled") return "ready";
  if (statusValue === "mock" || statusValue.includes("placeholder")) return "mock";
  if (!lastSyncAt) return "unknown";
  return "unknown";
}

function canQueryLiveCrmV2() {
  return isCrmV2Enabled() && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function buildCrmOrderSearchOrFilter(search?: string, contactIds: string[] = []) {
  const term = normalizeCrmSearchTerm(search);
  const filters: string[] = [];
  if (term) {
    filters.push(`order_code.ilike.%${term}%`, `product_name.ilike.%${term}%`, `status.ilike.%${term}%`, `source.ilike.%${term}%`, `course_slug.ilike.%${term}%`);
  }

  const safeContactIds = contactIds.filter(isUuid);
  if (safeContactIds.length > 0) filters.push(`contact_id.in.(${safeContactIds.join(",")})`);
  return filters.join(",");
}

function buildCrmStudentSearchOrFilter(search?: string, contactIds: string[] = []) {
  const term = normalizeCrmSearchTerm(search);
  const filters: string[] = [];
  if (term) filters.push(`status.ilike.%${term}%`, `course_slug.ilike.%${term}%`);

  const safeContactIds = contactIds.filter(isUuid);
  if (safeContactIds.length > 0) filters.push(`contact_id.in.(${safeContactIds.join(",")})`);
  return filters.join(",");
}

const CRM_STAGE_ORDER: CrmStage[] = ["new", "not_contacted", "consulting", "high_intent", "pending_payment", "paid", "disqualified"];

function normalizeCrmStage(value: unknown): CrmStage {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "not_contacted" || normalized.includes("chua lien he")) return "not_contacted";
  if (normalized === "consulting" || normalized.includes("da lien he") || normalized.includes("dang tu van")) return "consulting";
  if (normalized === "high_intent" || normalized.includes("quan tam cao")) return "high_intent";
  if (normalized === "pending_payment" || normalized === "checkout" || normalized.includes("cho thanh toan") || normalized.includes("pending")) return "pending_payment";
  if (normalized === "paid" || normalized === "won" || normalized.includes("da thanh toan")) return "paid";
  if (normalized === "disqualified" || normalized === "lost" || normalized.includes("khong") || normalized.includes("k nhu cau") || normalized.includes("expired")) return "disqualified";
  return "new";
}

function isOrderDerivedLead(metadata: Record<string, unknown>) {
  return metadataText(metadata, "source_table") === "public.orders";
}

function countBy<T>(items: T[], keyOf: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item) || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function isPaidStatus(status: string) {
  return ["paid", "success", "completed"].includes(status.toLowerCase());
}

function dedupeLeadsByContact(rows: CrmLeadRow[]) {
  const merged = new Map<string, CrmLeadRow>();

  const leadKey = (row: CrmLeadRow) => {
    if (row.contactId) return `contact:${row.contactId}`;
    if (row.email) return `email:${normalizeEmail(row.email)}`;
    if (row.phone) return `phone:${normalizePhone(row.phone)}`;
    return `row:${row.id}`;
  };

  const parseTime = (value?: string) => {
    const time = Date.parse(value || "");
    return Number.isFinite(time) ? time : 0;
  };

  const winnerScore = (row: CrmLeadRow) => {
    const stageWeight = CRM_STAGE_ORDER.indexOf(row.stage);
    return (row.potentialValue || 0) + stageWeight * 100_000 + (parseTime(row.createdAt) > 0 ? parseTime(row.createdAt) / 1000 : 0);
  };

  for (const row of rows) {
    const key = leadKey(row);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, row);
      continue;
    }

    const shouldReplace = winnerScore(row) > winnerScore(existing);
    if (shouldReplace) {
      merged.set(key, row);
      continue;
    }

    // Keep best phone/email available so row preview không bị thiếu thông tin.
    const mergedRow = merged.get(key);
    if (!mergedRow) continue;
    if (!mergedRow.phone && row.phone) mergedRow.phone = row.phone;
    if (!mergedRow.email && row.email) mergedRow.email = row.email;
    merged.set(key, mergedRow);
  }

  return Array.from(merged.values()).sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));
}

function dateLowerBound(date: string) {
  return `${date}T00:00:00+07:00`;
}

function dateUpperBoundExclusive(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return `${date}T23:59:59+07:00`;
  return `${new Date(Date.UTC(year, month - 1, day) + 86_400_000).toISOString().slice(0, 10)}T00:00:00+07:00`;
}

function formatCrmLeadDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

async function countPublicLeadsForRange(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, range: ReturnType<typeof getCrmDateRange>) {
  const { count, error } = await client
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", dateLowerBound(range.from))
    .lt("created_at", dateUpperBoundExclusive(range.to));
  return error ? 0 : count ?? 0;
}

async function listPublicOrdersForRange(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, range: ReturnType<typeof getCrmDateRange>) {
  const lower = dateLowerBound(range.from);
  const { data, error } = await client
    .from("orders")
    .select("id,order_code,student_name,email,phone,course_slug,course_title,status,payment_status,amount,paid_at,created_at,utm_source,fbclid,utm_campaign,utm_content,adset_id,ad_id")
    .or(`paid_at.gte.${lower},created_at.gte.${lower}`)
    .limit(5000);
  if (error || !data) return [];
  return recordArray(data).filter((row) => {
    const status = String(row.status ?? row.payment_status ?? "");
    const orderDate = isPaidStatus(status) ? String(row.paid_at ?? row.created_at ?? "") : String(row.created_at ?? "");
    const ymd = timestampToCrmDateKey(orderDate);
    return ymd >= range.from && ymd <= range.to;
  });
}

async function listPublicLeadRowsForRange(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, range: ReturnType<typeof getCrmDateRange>) {
  const { data, error } = await client
    .from("leads")
    .select("id,name,phone,email,message,source,status,sale_status,deleted_at,created_at,updated_at,utm_source,utm_medium,utm_campaign,utm_content,fbclid,landing_page")
    .gte("created_at", dateLowerBound(range.from))
    .lt("created_at", dateUpperBoundExclusive(range.to))
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error || !data) return [];
  return recordArray(data);
}

function normalizeFacebookSource(value: unknown, metadata: Record<string, unknown> = {}) {
  const raw = `${String(value ?? "")} ${String(metadata.utm_source ?? "")} ${String(metadata.utm_campaign ?? "")} ${String(metadata.utm_adset ?? "")} ${String(metadata.utm_ad ?? "")} ${String(metadata.fbclid ?? "")} ${String(metadata.source ?? "")}`.toLowerCase();
  if (/facebook|facebook_ads|fb\b|fbclid|meta/.test(raw)) return "Facebook Ads";
  if (/google|gclid/.test(raw)) return "Google";
  if (/email|resend/.test(raw)) return "Email";
  if (/admin|manual/.test(raw)) return "Admin";
  return String(value || metadata.utm_source || "Khác");
}

function inferCourseFromPublicLead(row: Record<string, unknown>) {
  const text = [row.message, row.source, row.utm_source, row.utm_campaign, row.utm_content, row.landing_page]
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();

  if (/ebook/.test(text) && /facebook|fb/.test(text)) return { title: "Ebook Facebook Ads 2026", slug: "ebook-facebook-ads-2026" };
  if (/facebook|fb/.test(text)) return { title: "Facebook Ads 2026", slug: "facebook-ads-2026" };
  if (/growth|x10/.test(text)) return { title: "AI Growth Master X10", slug: "ai-growth-master-x10" };
  return { title: "Chưa map khóa học", slug: undefined };
}

function publicLeadStage(row: Record<string, unknown>): CrmStage {
  const raw = `${String(row.sale_status ?? "")} ${String(row.status ?? "")}`.toLowerCase();
  if (/zalo|nhan zalo/.test(raw)) return "consulting";
  if (/paid|success|đã thanh toán|da thanh toan/.test(raw)) return "paid";
  if (/pending|chờ thanh toán|cho thanh toan/.test(raw)) return "pending_payment";
  if (/tư vấn|tu van|liên hệ|lien he/.test(raw)) return "consulting";
  if (/không phù hợp|khong phu hop|lost|disqualified/.test(raw)) return "disqualified";
  return "not_contacted";
}

function publicLeadToUnifiedCustomerRow(row: Record<string, unknown>): CrmUnifiedCustomerRow {
  const course = inferCourseFromPublicLead(row);
  const createdAt = String(row.created_at ?? row.updated_at ?? "");
  const sourceValue = String(row.utm_source ?? row.source ?? row.landing_page ?? "public.leads");
  const normalizedSource = normalizeFacebookSource(sourceValue, row);
  const stage = publicLeadStage(row);

  return {
    id: `public-lead:${String(row.id ?? createdAt)}`,
    contactId: "",
    date: formatCrmLeadDateTime(createdAt),
    name: String(row.name || row.email || row.phone || "Chưa rõ tên"),
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    courseShort: courseShortName(course.title),
    course: course.title,
    courseSlug: course.slug,
    paymentStatus: stage === "paid" ? "paid" : stage === "pending_payment" ? "pending" : "not_paid",
    latestActivity: "Khách đăng ký",
    latestActivityAt: createdAt,
    source: normalizedSource,
    sourceDetail: sourceValue,
    normalizedSource,
    owner: "Chưa gán",
    leadScore: stage === "consulting" ? 50 : 20,
    stage,
    amount: 0,
    emailStatus: String(row.status ?? "lead"),
    tags: ["public.leads"],
  };
}

function publicOrderToUnifiedCustomerRow(row: Record<string, unknown>): CrmUnifiedCustomerRow {
  const status = String(row.status ?? row.payment_status ?? "pending");
  const activityAt = String(isPaidStatus(status) ? row.paid_at ?? row.created_at ?? "" : row.created_at ?? row.paid_at ?? "");
  const courseTitle = String(row.course_title || row.course_slug || "Chưa map khóa học");
  const sourceValue = String(row.utm_source ?? row.utm_campaign ?? (row.fbclid ? "facebook_ads" : "public.orders"));
  const normalizedSource = normalizeFacebookSource(sourceValue, row);

  return {
    id: `public-order:${String(row.id ?? row.order_code ?? activityAt)}`,
    contactId: "",
    date: formatCrmLeadDateTime(activityAt),
    name: String(row.student_name || row.email || row.phone || "Chưa rõ khách"),
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    courseShort: courseShortName(courseTitle),
    course: courseTitle,
    courseSlug: row.course_slug ? String(row.course_slug) : undefined,
    paymentStatus: status,
    latestActivity: isPaidStatus(status) ? "Thanh toán thành công" : "Chờ thanh toán",
    latestActivityAt: activityAt,
    source: normalizedSource,
    sourceDetail: sourceValue,
    normalizedSource,
    owner: "Chưa gán",
    leadScore: isPaidStatus(status) ? 100 : 70,
    stage: isPaidStatus(status) ? "paid" : "pending_payment",
    orderCode: row.order_code ? String(row.order_code) : undefined,
    amount: numericValue(row.amount),
    emailStatus: status,
    tags: ["public.orders"],
  };
}

async function listFreshUnifiedCustomerRows(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, range: ReturnType<typeof getCrmDateRange>) {
  const [publicLeads, publicOrders] = await Promise.all([listPublicLeadRowsForRange(client, range), listPublicOrdersForRange(client, range)]);
  return [...publicLeads.map(publicLeadToUnifiedCustomerRow), ...publicOrders.map(publicOrderToUnifiedCustomerRow)];
}

function filterUnifiedCustomerRows(rows: CrmUnifiedCustomerRow[], query: CrmListQuery) {
  const search = normalizeCrmSearchTerm(query.search).toLowerCase();
  const filters = query.filters ?? {};

  return rows.filter((row) => {
    if (filters.stage && row.stage !== filters.stage) return false;
    if (filters.status && row.paymentStatus !== filters.status && row.emailStatus !== filters.status) return false;
    if (filters.owner && row.ownerId !== filters.owner && row.owner !== filters.owner) return false;
    if (filters.course && row.courseSlug !== filters.course && row.course !== filters.course && row.courseShort !== filters.course) return false;
    if (filters.source && row.source !== filters.source && row.normalizedSource !== filters.source && row.sourceDetail !== filters.source) return false;
    if (!search) return true;

    const haystack = [row.name, row.email, row.phone, row.orderCode, row.course, row.courseSlug, row.paymentStatus, row.source, row.sourceDetail, row.normalizedSource, row.owner]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });
}

function courseShortName(value: string) {
  const text = value || "Chưa rõ";
  if (/ebook/i.test(text)) return "Ebook";
  if (/facebook/i.test(text)) return "FB Ads";
  if (/growth|x10/i.test(text)) return "AI Growth";
  return text.split(/\s+/).slice(0, 3).join(" ");
}

function toActivityTitle(eventType: string) {
  const type = eventType.toLowerCase();
  if (type.includes("email") && type.includes("open")) return "Mở email";
  if (type.includes("email") && type.includes("click")) return "Click email";
  if (type.includes("email") && type.includes("delivered")) return "Email đã giao";
  if (type.includes("email") && (type.includes("failed") || type.includes("bounced") || type.includes("complained"))) return "Email lỗi";
  if (type.includes("email") && (type.includes("sent") || type.includes("send"))) return "Đã gửi email";
  if (type.includes("payment_success") || type.includes("paid") || type.includes("purchase")) return "Thanh toán thành công";
  if (type.includes("payment_reminder") || type.includes("pending_payment")) return "Nhắc thanh toán";
  if (type.includes("student_entered_learning")) return "Khách đã vào học";
  if (type.includes("student_login") || type.includes("login")) return "Đăng nhập vào học";
  if (type.includes("stage")) return "Cập nhật stage";
  if (type.includes("lead") || type.includes("form") || type.includes("registration")) return "Khách đăng ký";
  return toTimelineTitle(eventType);
}

function formatCrmActivityTime(value: string) {
  return value ? formatCrmLeadDateTime(value) : "N/A";
}

function buildCrmEvent(input: {
  id: string;
  type: string;
  title?: string;
  description?: string;
  occurredAtIso?: string;
  source?: string;
}): CrmEvent {
  const occurredAtIso = input.occurredAtIso || "";
  return {
    id: input.id,
    type: input.type,
    title: input.title || toActivityTitle(input.type),
    description: input.description,
    occurredAt: formatCrmActivityTime(occurredAtIso),
    occurredAtIso,
    source: input.source,
    tone: getCrmEventTone(input.type),
  };
}

function getEmailLogActivityTimestamp(row: Record<string, unknown>) {
  return String(row.clicked_at ?? row.opened_at ?? row.delivered_at ?? row.sent_at ?? row.updated_at ?? row.created_at ?? "");
}

function emailLogDescription(row: Record<string, unknown>) {
  const email = String(row.email ?? "khách hàng");
  const subject = String(row.subject ?? "Email chưa có tiêu đề");
  const templateKey = String(row.template_key ?? "email");
  const resendId = row.resend_email_id ? `Resend ${String(row.resend_email_id).slice(0, 8)}` : "Resend";
  return `${email} - ${subject} (${templateKey}, ${resendId})`;
}

function activityLogDescription(row: Record<string, unknown>) {
  const metadata = asRecord(row.metadata);
  const studentEmail = String(row.student_email ?? metadata.email ?? metadata.studentEmail ?? "");
  const title = String(row.event_title ?? row.event_description ?? "Hoạt động khách hàng");
  const course = metadataText(metadata, "courseTitle") || metadataText(metadata, "course") || metadataText(metadata, "courseSlug");
  return [studentEmail, title, course].filter(Boolean).join(" - ");
}

export async function listCrmV2ActivityHistory(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  range: ReturnType<typeof getCrmDateRange>,
  options: { limit?: number } = {},
): Promise<CrmEvent[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 100, 200));
  const perSourceLimit = Math.max(20, Math.min(limit, 100));
  const lowerBound = dateLowerBound(range.from);
  const upperBound = dateUpperBoundExclusive(range.to);

  const [crmEvents, emailEvents, emailLogs, activityLogs, leadActivities, publicOrders] = await Promise.all([
    client.schema("crm_v2").from("crm_events").select("id,event_type,event_source,occurred_at,metadata").gte("occurred_at", lowerBound).lt("occurred_at", upperBound).order("occurred_at", { ascending: false }).limit(perSourceLimit),
    client.schema("crm_v2").from("email_events").select("id,event_type,occurred_at,metadata").gte("occurred_at", lowerBound).lt("occurred_at", upperBound).order("occurred_at", { ascending: false }).limit(perSourceLimit),
    client.from("email_logs").select("id,email,subject,template_key,resend_email_id,status,sent_at,delivered_at,opened_at,clicked_at,created_at,updated_at").gte("updated_at", lowerBound).lt("updated_at", upperBound).order("updated_at", { ascending: false }).limit(perSourceLimit),
    client.from("activity_logs").select("id,event_type,event_title,event_description,student_email,student_phone,user_id,created_at,metadata").gte("created_at", lowerBound).lt("created_at", upperBound).order("created_at", { ascending: false }).limit(perSourceLimit),
    client.from("lead_activities").select("id,type,title,description,created_at,metadata").gte("created_at", lowerBound).lt("created_at", upperBound).order("created_at", { ascending: false }).limit(perSourceLimit),
    listPublicOrdersForRange(client, range),
  ]);

  const events: CrmEvent[] = [];
  for (const row of recordArray(crmEvents.data)) {
    const type = String(row.event_type ?? "crm_event");
    events.push(buildCrmEvent({ id: `crm:${row.id}`, type, description: metadataText(asRecord(row.metadata), "detail") || String(row.event_source ?? "CRM v2"), occurredAtIso: String(row.occurred_at ?? ""), source: "CRM" }));
  }
  for (const row of recordArray(emailEvents.data)) {
    const type = `email_${String(row.event_type ?? "event")}`;
    events.push(buildCrmEvent({ id: `email_event:${row.id}`, type, description: metadataText(asRecord(row.metadata), "subject") || "Sự kiện email", occurredAtIso: String(row.occurred_at ?? ""), source: "CRM email event" }));
  }
  for (const row of recordArray(emailLogs.data)) {
    const status = String(row.status ?? "sent");
    events.push(buildCrmEvent({ id: `resend:${row.id}`, type: `email_${status}`, description: emailLogDescription(row), occurredAtIso: getEmailLogActivityTimestamp(row), source: "Resend" }));
  }
  for (const row of recordArray(activityLogs.data)) {
    const type = String(row.event_type ?? "activity_log");
    events.push(buildCrmEvent({ id: `activity:${row.id}`, type, description: activityLogDescription(row), occurredAtIso: String(row.created_at ?? ""), source: "Khu vực học" }));
  }
  for (const row of recordArray(leadActivities.data)) {
    const type = String(row.type ?? "lead_activity");
    events.push(buildCrmEvent({ id: `lead_activity:${row.id}`, type, description: String(row.title ?? row.description ?? "Hoạt động lead"), occurredAtIso: String(row.created_at ?? ""), source: "Lead" }));
  }
  for (const row of publicOrders) {
    const status = String(row.status ?? row.payment_status ?? "");
    const type = isPaidStatus(status) ? "payment_success" : "registration";
    events.push(buildCrmEvent({ id: `order:${row.id}`, type, description: `${row.student_name ?? row.email ?? "Khách hàng"} - ${row.course_title ?? row.course_slug ?? "khóa học"}`, occurredAtIso: String(row.paid_at ?? row.created_at ?? ""), source: "Đơn hàng" }));
  }
  return events
    .filter((event) => event.occurredAtIso && !Number.isNaN(new Date(event.occurredAtIso).getTime()))
    .sort((a, b) => new Date(b.occurredAtIso ?? "").getTime() - new Date(a.occurredAtIso ?? "").getTime())
    .slice(0, limit);
}

async function buildCrmV2RecentActivity(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, range: ReturnType<typeof getCrmDateRange>): Promise<CrmEvent[]> {
  return listCrmV2ActivityHistory(client, range, { limit: 10 });
}

function buildCourseSummaryFromPublicOrders(publicOrders: Array<Record<string, unknown>>, fallbackRows: Array<Record<string, unknown>>) {
  if (!publicOrders.length) {
    return fallbackRows.map((course) => ({
      name: String(course.name ?? "Legacy order"),
      revenue: formatMoney(numericValue(course.revenue)),
      paid: numericValue(course.paid),
    }));
  }
  const summary = new Map<string, { revenue: number; paid: number }>();
  for (const order of publicOrders) {
    const name = String(order.course_title || order.course_slug || "Khóa học chưa map");
    const current = summary.get(name) ?? { revenue: 0, paid: 0 };
    current.paid += 1;
    current.revenue += numericValue(order.amount);
    summary.set(name, current);
  }
  return [...summary.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([name, metric]) => ({ name, revenue: formatMoney(metric.revenue), paid: metric.paid }));
}

function stageLabel(stage: CrmStage) {
  if (stage === "new") return "Mới";
  if (stage === "not_contacted") return "Chưa liên hệ";
  if (stage === "consulting") return "Đang tư vấn";
  if (stage === "high_intent") return "Quan tâm cao";
  if (stage === "pending_payment") return "Chờ thanh toán";
  if (stage === "paid") return "Đã thanh toán";
  return "Không phù hợp";
}

function stageTone(stage: CrmStage): "blue" | "green" | "orange" | "purple" {
  if (stage === "paid") return "green";
  if (stage === "pending_payment") return "orange";
  if (stage === "high_intent" || stage === "consulting") return "purple";
  return "blue";
}

export async function getCrmV2DashboardLegacyAggregate(): Promise<CrmDashboardData> {
  if (!canQueryLiveCrmV2()) return demoDashboard;

  const client = createSupabaseAdminClient();
  if (!client) return demoDashboard;

  const { data, error } = await client.schema("crm_v2").from("crm_daily_metrics").select("*").order("metric_date", { ascending: false }).limit(30);
  if (error || !data?.length) return demoDashboard;

  const revenue = [...data]
    .reverse()
    .slice(-7)
    .map((row) => ({
      label: String(row.metric_date).slice(5),
      value: Number(row.revenue ?? 0) / 1_000_000,
    }));

  return {
    ...demoDashboard,
    revenue,
    kpis: demoDashboard.kpis.map((kpi) => {
      if (kpi.label === "Doanh thu 30 ngày") {
        const totalRevenue = data.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
        return { ...kpi, value: `${Math.round(totalRevenue / 1_000_000)}tr` };
      }
      return kpi;
    }),
  };
}

function buildEmptyLiveDashboard(): CrmDashboardData {
  return {
    kpis: demoDashboard.kpis.map((kpi) => ({ ...kpi, value: "0", delta: undefined, series: [0] })),
    funnel: CRM_STAGE_ORDER.map((stage) => ({ label: stageLabel(stage), value: 0, tone: stageTone(stage) })),
    revenue: demoDashboard.revenue.map((row) => ({ ...row, value: 0 })),
    revenueResolution: "day",
    sources: [],
    emailPerformance: [],
    activity: [],
    tasks: [],
    campaigns: [],
    workflows: [],
    courses: [],
    reportSummary: {
      newLeads: 0,
      mql: 0,
      paidOrders: 0,
      revenue: 0,
      emailRevenue: 0,
      dailyRevenue: [],
    },
  };
}

export async function getCrmV2Dashboard(query = normalizeCrmListQuery()): Promise<CrmDashboardData> {
  if (!canQueryLiveCrmV2()) return buildEmptyLiveDashboard();

  const client = createSupabaseAdminClient();
  if (!client) return buildEmptyLiveDashboard();

  const dateRange = getCrmDateRange(query);
  const { data, error } = await client.rpc("crm_v2_dashboard_raw", {
    p_date_from: dateRange.from,
    p_date_to: dateRange.to,
  });
  if (error || !data) return getCrmV2DashboardDirectDataApi(query);

  const payload = asRecord(data);
  const dailyRows = recordArray(payload.daily).sort((a, b) => String(a.metric_date).localeCompare(String(b.metric_date)));
  const stageRows = recordArray(payload.lead_stages);
  const sourceRows = recordArray(payload.lead_sources);
  const emailRows = recordArray(payload.email_events);
  const eventRows = recordArray(payload.recent_events);
  const workflowRows = recordArray(payload.workflows);
  const taskRows = recordArray(payload.tasks);
  const courseRows = recordArray(payload.courses);
  const counts = asRecord(payload.counts);
  const orderSummary = asRecord(payload.orders);
  const [publicLeadCount, publicOrders, recentActivity] = await Promise.all([
    countPublicLeadsForRange(client, dateRange),
    listPublicOrdersForRange(client, dateRange),
    buildCrmV2RecentActivity(client, dateRange),
  ]);

  const newLeadsInRange = publicLeadCount || numericValue(counts.new_leads_today);
  const mqlCount = numericValue(counts.mql);
  const paidPublicOrders = publicOrders.filter((row) => isPaidStatus(String(row.status ?? row.payment_status ?? "")));
  const paidOrders = paidPublicOrders.length || numericValue(orderSummary.paid_orders);
  const revenue30 = paidPublicOrders.reduce((sum, row) => sum + numericValue(row.amount), 0) || numericValue(orderSummary.revenue);
  const emailRevenue30 = dailyRows.reduce((sum, row) => sum + numericValue(row.email_revenue), 0);
  const activeAutomation = workflowRows.length;
  const stageCounts = new Map<string, number>(stageRows.map((row) => [String(row.stage ?? "new"), numericValue(row.count)]));
  const sourceTones = ["blue", "green", "purple", "orange"] as const;
  const emailEventCounts = new Map<string, number>(emailRows.map((row) => [String(row.event_type ?? "unknown").toLowerCase(), numericValue(row.count)]));
  const opened = (emailEventCounts.get("opened") ?? 0) + (emailEventCounts.get("open") ?? 0);
  const clicked = (emailEventCounts.get("clicked") ?? 0) + (emailEventCounts.get("click") ?? 0);
  const delivered = Math.max(1, emailEventCounts.get("delivered") ?? emailEventCounts.get("sent") ?? opened + clicked);
  const dailySeries = dailyRows.slice(-7);
  const dashboardRevenue = buildDashboardRevenueSeries(paidPublicOrders, dateRange);

  return {
    ...buildEmptyLiveDashboard(),
    kpis: [
      { label: query.range === "today" ? "Lead mới hôm nay" : "Lead mới trong kỳ", value: formatIntWithDot(newLeadsInRange), tone: "blue", series: dailySeries.map((row) => numericValue(row.new_leads)) },
      { label: "MQL", value: formatIntWithDot(mqlCount), tone: "purple", series: dailySeries.map((row) => numericValue(row.mql)) },
      { label: "Đã thanh toán", value: formatIntWithDot(paidOrders), tone: "green", series: dailySeries.map((row) => numericValue(row.paid_orders)) },
      { label: "Doanh thu đã thanh toán", value: formatMoney(revenue30), tone: "green", series: dashboardRevenue.rows.map((row) => row.value) },
      { label: "Doanh thu từ email", value: formatMoney(emailRevenue30), tone: "orange", series: dailySeries.map((row) => Math.round(numericValue(row.email_revenue) / 1_000_000)) },
      { label: "Automation đang chạy", value: formatIntWithDot(activeAutomation), tone: "purple", series: [activeAutomation] },
    ],
    funnel: CRM_STAGE_ORDER.map((stage) => ({ label: stageLabel(stage), value: stageCounts.get(stage) ?? 0, tone: stageTone(stage) })),
    revenue: dashboardRevenue.rows,
    revenueResolution: dashboardRevenue.resolution,
    sources: sourceRows.slice(0, 4).map((row, index) => ({ label: String(row.source ?? "unknown"), value: numericValue(row.count), tone: sourceTones[index] ?? "blue" })),
    emailPerformance:
      opened || clicked
        ? [{ label: "Email 30 ngày", open: Math.round((opened / delivered) * 100), click: Math.round((clicked / delivered) * 100) }]
        : [],
    reportSummary: {
      newLeads: newLeadsInRange,
      mql: mqlCount,
      paidOrders,
      revenue: revenue30,
      emailRevenue: emailRevenue30,
    },
    activity: recentActivity.length ? recentActivity : eventRows.map((event) => {
      const eventType = String(event.event_type ?? "crm_event");
      const metadata = asRecord(event.metadata);
      return {
        id: String(event.id),
        type: eventType,
        title: toActivityTitle(eventType),
        description: metadataText(metadata, "detail") || String(event.event_source ?? "CRM v2"),
        occurredAt: event.occurred_at ? new Date(String(event.occurred_at)).toLocaleString("vi-VN") : "N/A",
        tone: getCrmEventTone(eventType),
      };
    }),
    tasks: taskRows.map((task) => ({
      title: String(task.title ?? "Task CRM"),
      owner: metadataText(asRecord(task.metadata), "owner_name") || "Team",
      due: task.due_at ? formatShortDate(task.due_at) : "-",
      tone: String(task.status ?? "open"),
    })),
    workflows: workflowRows.map((workflow) => ({
      name: String(workflow.name ?? "Workflow"),
      status: String(workflow.status ?? "active"),
      runs: "Đang bật",
    })),
    courses: buildCourseSummaryFromPublicOrders(paidPublicOrders, courseRows),
  };
}

export async function getCrmV2DashboardDirectDataApi(query = normalizeCrmListQuery()): Promise<CrmDashboardData> {
  if (!canQueryLiveCrmV2()) return buildEmptyLiveDashboard();

  const client = createSupabaseAdminClient();
  if (!client) return buildEmptyLiveDashboard();

  const dateRange = getCrmDateRange(query);
  const lowerBound = dateLowerBound(dateRange.from);
  const upperBound = dateUpperBoundExclusive(dateRange.to);

  const [dailyResult, leadsResult, ordersResult, eventsResult, workflowsResult, emailEventsResult, publicOrders] = await Promise.all([
    client.schema("crm_v2").from("crm_daily_metrics").select("metric_date,new_leads,mql,paid_orders,revenue,email_revenue,active_automation").gte("metric_date", dateRange.from).lte("metric_date", dateRange.to),
    client.schema("crm_v2").from("leads").select("id,stage,status,source,potential_value,created_at,metadata").neq("status", "archived").gte("created_at", lowerBound).lt("created_at", upperBound).limit(5000),
    client.schema("crm_v2").from("orders").select("id,status,net_amount,amount,product_name,created_at,paid_at,metadata,course_slug").gte("created_at", lowerBound).lt("created_at", upperBound).limit(5000),
    client.schema("crm_v2").from("crm_events").select("id,event_type,event_source,occurred_at,metadata").order("occurred_at", { ascending: false }).limit(10),
    client.schema("crm_v2").from("workflows").select("id,name,status").in("status", ["active", "published", "running"]).limit(20),
    client.schema("crm_v2").from("email_events").select("event_type,occurred_at").gte("occurred_at", lowerBound).lt("occurred_at", upperBound).limit(5000),
    listPublicOrdersForRange(client, dateRange),
  ]);

  if (dailyResult.error && leadsResult.error && ordersResult.error && !publicOrders.length) return buildEmptyLiveDashboard();

  const dailyRows = [...(dailyResult.data ?? [])].sort((a, b) => String(a.metric_date).localeCompare(String(b.metric_date)));
  const leadRows = (leadsResult.data ?? []).map((row) => ({
    id: String(row.id),
    stage: normalizeCrmStage(row.stage),
    status: String(row.status ?? ""),
    source: String(row.source ?? "unknown"),
    potentialValue: Number(row.potential_value ?? 0),
    createdAt: String(row.created_at ?? ""),
    metadata: asRecord(row.metadata),
  }));
  const orderRows = (ordersResult.data ?? []).map((row) => ({
    status: String(row.status ?? ""),
    amount: Number(row.net_amount ?? row.amount ?? 0),
    product: String(row.product_name || metadataText(asRecord(row.metadata), "course_title") || row.course_slug || "Khóa học chưa map"),
    createdAt: String(row.paid_at ?? row.created_at ?? ""),
  }));

  const liveLeadsInRange = leadRows.filter((row) => !isOrderDerivedLead(row.metadata)).length;
  const newLeadsInRange = liveLeadsInRange || dailyRows.reduce((sum, row) => sum + Number(row.new_leads ?? 0), 0);
  const mqlCount = leadRows.filter((row) => ["consulting", "high_intent", "pending_payment", "paid"].includes(row.stage)).length;
  const paidPublicOrders = publicOrders.filter((row) => isPaidStatus(String(row.status ?? row.payment_status ?? "")));
  const paidOrders = orderRows.filter((row) => isPaidStatus(row.status));
  const effectivePaidOrders = paidPublicOrders.length ? paidPublicOrders : paidOrders;
  const revenue30 = effectivePaidOrders.reduce((sum, row) => sum + numericValue(row.amount), 0);
  const emailRevenue30 = dailyRows.reduce((sum, row) => sum + Number(row.email_revenue ?? 0), 0);
  const activeAutomation = workflowsResult.data?.length ?? Number(dailyRows.at(-1)?.active_automation ?? 0);

  const adaptiveRevenue = buildDashboardRevenueSeries(paidPublicOrders, dateRange);

  const stageCounts = countBy(leadRows, (row) => row.stage);
  const sourceCounts = countBy(leadRows, (row) => row.source);
  const sourceTones = ["blue", "green", "purple", "orange"] as const;
  const emailEventCounts = countBy(emailEventsResult.data ?? [], (row) => String(row.event_type ?? "unknown").toLowerCase());
  const opened = (emailEventCounts.get("opened") ?? 0) + (emailEventCounts.get("open") ?? 0);
  const clicked = (emailEventCounts.get("clicked") ?? 0) + (emailEventCounts.get("click") ?? 0);
  const delivered = Math.max(1, emailEventCounts.get("delivered") ?? emailEventCounts.get("sent") ?? opened + clicked);
  const courseCounts = new Map<string, { paid: number; revenue: number }>();
  for (const order of paidOrders) {
    const current = courseCounts.get(order.product) ?? { paid: 0, revenue: 0 };
    current.paid += 1;
    current.revenue += order.amount;
    courseCounts.set(order.product, current);
  }

  return {
    ...demoDashboard,
    kpis: [
      { label: query.range === "today" ? "Lead mới hôm nay" : "Lead mới trong kỳ", value: formatIntWithDot(newLeadsInRange), tone: "blue", series: dailyRows.slice(-7).map((row) => Number(row.new_leads ?? 0)) },
      { label: "MQL", value: formatIntWithDot(mqlCount), tone: "purple", series: dailyRows.slice(-7).map((row) => Number(row.mql ?? 0)) },
      { label: "Đã thanh toán", value: formatIntWithDot(effectivePaidOrders.length), tone: "green", series: dailyRows.slice(-7).map((row) => Number(row.paid_orders ?? 0)) },
      { label: "Doanh thu đã thanh toán", value: formatMoney(revenue30), tone: "green", series: dailyRows.slice(-7).map((row) => Math.round(Number(row.revenue ?? 0) / 1_000_000)) },
      { label: "Doanh thu từ email", value: formatMoney(emailRevenue30), tone: "orange", series: dailyRows.slice(-7).map((row) => Math.round(Number(row.email_revenue ?? 0) / 1_000_000)) },
      { label: "Automation đang chạy", value: formatIntWithDot(activeAutomation), tone: "purple", series: [activeAutomation] },
    ],
    funnel: CRM_STAGE_ORDER.map((stage) => ({
      label: stageLabel(stage),
      value: stageCounts.get(stage) ?? 0,
      tone: stageTone(stage),
    })),
    revenue: adaptiveRevenue.rows,
    revenueResolution: adaptiveRevenue.resolution,
    sources: [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, value], index) => ({ label, value, tone: sourceTones[index] ?? "blue" })),
    emailPerformance: [
      {
        label: "Email 30 ngày",
        open: Math.round((opened / delivered) * 100),
        click: Math.round((clicked / delivered) * 100),
      },
    ],
    activity: (eventsResult.data ?? []).map((event) => {
      const eventType = String(event.event_type ?? "crm_event");
      const metadata = asRecord(event.metadata);
      return {
        id: String(event.id),
        type: eventType,
        title: toTimelineTitle(eventType),
        description: metadataText(metadata, "detail") || String(event.event_source ?? "CRM v2"),
        occurredAt: event.occurred_at ? new Date(String(event.occurred_at)).toLocaleString("vi-VN") : "N/A",
        tone: getCrmEventTone(eventType),
      };
    }),
    workflows: (workflowsResult.data ?? []).slice(0, 5).map((workflow) => ({
      name: String(workflow.name ?? "Workflow"),
      status: String(workflow.status ?? "active"),
      runs: "Đang bật",
    })),
    courses: paidPublicOrders.length ? buildCourseSummaryFromPublicOrders(paidPublicOrders, []) : [...courseCounts.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, metric]) => ({ name, revenue: formatMoney(metric.revenue), paid: metric.paid })),
    reportSummary: {
      newLeads: newLeadsInRange,
      mql: mqlCount,
      paidOrders: effectivePaidOrders.length,
      revenue: revenue30,
      emailRevenue: emailRevenue30,
    },
  };
}

export async function getCrmV2LeadStageSummary(): Promise<Array<{ label: string; value: number; tone: "blue" | "green" | "orange" | "purple" }>> {
  if (!canQueryLiveCrmV2()) {
    const counts = countBy(demoLeads, (lead) => lead.stage);
    return CRM_STAGE_ORDER.map((stage) => ({ label: stageLabel(stage), value: counts.get(stage) ?? 0, tone: stageTone(stage) }));
  }

  const client = createSupabaseAdminClient();
  if (!client) return CRM_STAGE_ORDER.map((stage) => ({ label: stageLabel(stage), value: 0, tone: stageTone(stage) }));

  const { data, error } = await client.rpc("crm_v2_stage_counts_raw");
  if (error || !data) return CRM_STAGE_ORDER.map((stage) => ({ label: stageLabel(stage), value: 0, tone: stageTone(stage) }));

  const counts = new Map(recordArray(data).map((row) => [normalizeCrmStage(row.stage), numericValue(row.count)]));
  return CRM_STAGE_ORDER.map((stage) => ({ label: stageLabel(stage), value: counts.get(stage) ?? 0, tone: stageTone(stage) }));
}

export async function getCrmV2LeadStageSummaryDirectDataApi(): Promise<Array<{ label: string; value: number; tone: "blue" | "green" | "orange" | "purple" }>> {
  if (!canQueryLiveCrmV2()) {
    const counts = countBy(demoLeads, (lead) => lead.stage);
    return CRM_STAGE_ORDER.map((stage) => ({ label: stageLabel(stage), value: counts.get(stage) ?? 0, tone: stageTone(stage) }));
  }

  const client = createSupabaseAdminClient();
  if (!client) {
    const counts = countBy(demoLeads, (lead) => lead.stage);
    return CRM_STAGE_ORDER.map((stage) => ({ label: stageLabel(stage), value: counts.get(stage) ?? 0, tone: stageTone(stage) }));
  }

  const { data, error } = await client.schema("crm_v2").from("leads").select("stage,status").neq("status", "archived").limit(10000);
  if (error || !data) {
    const counts = countBy(demoLeads, (lead) => lead.stage);
    return CRM_STAGE_ORDER.map((stage) => ({ label: stageLabel(stage), value: counts.get(stage) ?? 0, tone: stageTone(stage) }));
  }

  const counts = countBy(data, (row) => normalizeCrmStage(row.stage));
  return CRM_STAGE_ORDER.map((stage) => ({ label: stageLabel(stage), value: counts.get(stage) ?? 0, tone: stageTone(stage) }));
}

export async function getCrmV2SegmentPreviewRows(limit = 1000): Promise<Array<Record<string, unknown>>> {
  if (!canQueryLiveCrmV2()) return getDemoSegmentPreviewRows();

  const client = createSupabaseAdminClient();
  if (!client) return getDemoSegmentPreviewRows();

  const safeLimit = Math.max(1, Math.min(limit, 1000));
  const { data, error } = await client
    .schema("crm_v2")
    .from("leads")
    .select("stage,status,source,lead_score,email_status,potential_value,created_at,contacts(lifecycle_stage,source,marketing_consent,bounce_status,unsubscribed_at,complained_at)")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error || !data) return getDemoSegmentPreviewRows();

  return data.map((row) => {
    const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
    return {
      stage: row.stage,
      status: row.status,
      source: row.source ?? contact?.source,
      lead_score: Number(row.lead_score ?? 0),
      email_status: row.email_status,
      potential_value: Number(row.potential_value ?? 0),
      lifecycle_stage: contact?.lifecycle_stage,
      marketing_consent: contact?.marketing_consent,
      bounce_status: contact?.bounce_status,
      unsubscribed_at: contact?.unsubscribed_at,
      complained_at: contact?.complained_at,
      tags: [],
      created_at: row.created_at,
    };
  });
}

export async function listCrmV2Leads(query: CrmListQuery): Promise<CrmListResult<CrmLeadRow>> {
  if (!canQueryLiveCrmV2()) return paginate(filterDemoLeads(demoLeads, query), query);

  const client = createSupabaseAdminClient();
  if (!client) return emptyCrmListResult(query);

  const dateRange = getCrmDateRange(query);
  const { data, error } = await client.rpc("crm_v2_leads_list_raw", {
    p_page: query.page,
    p_page_size: query.pageSize,
    p_search: query.search ?? "",
    p_sort_by: query.sortBy ?? "createdAt",
    p_sort_direction: query.sortDirection ?? "desc",
    p_filters: query.filters ?? {},
    p_date_from: dateRange.from,
    p_date_to: dateRange.to,
  });
  if (error || !data) return emptyCrmListResult(query);

  const payload = asRecord(data);
  const rows: CrmLeadRow[] = recordArray(payload.rows).map((row) => {
    const contact = asRecord(row.contact);
    const metadata = asRecord(row.metadata);
    const contactMeta = asRecord(contact.metadata);
    const owner = metadataText(metadata, "owner_name") || "Không gán";
    const course =
      metadataText(metadata, "course_title") ||
      metadataText(metadata, "course") ||
      metadataText(contactMeta, "course") ||
      String(row.course_slug ?? "") ||
      "Chưa map khóa học";

    return {
      id: String(row.id),
      contactId: row.contact_id ? String(row.contact_id) : "",
      name: String(contact.full_name ?? "Chưa rõ tên"),
      email: contact.email ? String(contact.email) : undefined,
      phone: contact.phone ? String(contact.phone) : undefined,
      source: String(row.source ?? "unknown"),
      course,
      courseSlug: row.course_slug ? String(row.course_slug) : undefined,
      leadScore: numericValue(row.lead_score),
      owner,
      ownerId: row.owner_id ? String(row.owner_id) : undefined,
      stage: normalizeCrmStage(row.stage),
      emailStatus: String(row.email_status ?? "unknown"),
      lastTouch: row.last_touch_at ? new Date(String(row.last_touch_at)).toLocaleString("vi-VN") : "Chưa có",
      nextAction: String(row.next_action ?? "Cập nhật bước tiếp theo"),
      potentialValue: numericValue(row.potential_value),
      createdAt: String(row.created_at ?? ""),
      tags: [],
    };
  });

  return rpcListResult(query, data, rows);
}

export async function listCrmV2UnifiedCustomers(query: CrmListQuery): Promise<CrmListResult<CrmUnifiedCustomerRow>> {
  const dateRange = getCrmDateRange(query);
  const client = canQueryLiveCrmV2() ? createSupabaseAdminClient() : null;
  const [leadsResult, ordersResult, freshRows] = await Promise.all([
    listCrmV2Leads({ ...query, page: 1, pageSize: 50 }),
    listCrmV2Orders({ ...query, page: 1, pageSize: 50 }),
    client ? listFreshUnifiedCustomerRows(client, dateRange) : Promise.resolve([]),
  ]);

  const rowsByKey = new Map<string, CrmUnifiedCustomerRow>();
  const upsert = (row: CrmUnifiedCustomerRow) => {
    const key = row.contactId || (row.email ? `email:${normalizeEmail(row.email)}` : "") || (row.phone ? `phone:${normalizePhone(row.phone)}` : "") || row.id;
    const existing = rowsByKey.get(key);
    if (!existing) {
      rowsByKey.set(key, row);
      return;
    }
    rowsByKey.set(key, {
      ...existing,
      ...row,
      id: existing.id || row.id,
      contactId: existing.contactId || row.contactId,
      phone: existing.phone || row.phone,
      email: existing.email || row.email,
      amount: Math.max(existing.amount, row.amount),
      leadScore: Math.max(existing.leadScore, row.leadScore),
      tags: Array.from(new Set([...existing.tags, ...row.tags])),
      latestActivity: row.latestActivityAt && (!existing.latestActivityAt || row.latestActivityAt > existing.latestActivityAt) ? row.latestActivity : existing.latestActivity,
      latestActivityAt: [existing.latestActivityAt, row.latestActivityAt].filter(Boolean).sort().at(-1),
      paymentStatus: isPaidStatus(row.paymentStatus) ? row.paymentStatus : existing.paymentStatus || row.paymentStatus,
      orderCode: row.orderCode || existing.orderCode,
      owner: existing.ownerId ? existing.owner : row.owner || existing.owner,
      ownerId: existing.ownerId || row.ownerId,
      stage: isPaidStatus(row.paymentStatus) || row.stage === "pending_payment" ? row.stage : existing.stage || row.stage,
    });
  };

  for (const lead of leadsResult.rows) {
    upsert({
      id: lead.id,
      contactId: lead.contactId,
      date: formatCrmLeadDateTime(lead.createdAt),
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      courseShort: courseShortName(lead.course),
      course: lead.course,
      courseSlug: lead.courseSlug,
      paymentStatus: lead.stage === "paid" ? "paid" : lead.stage === "pending_payment" ? "pending" : "not_paid",
      latestActivity: lead.lastTouch || "Chưa có hoạt động",
      latestActivityAt: lead.createdAt,
      source: normalizeFacebookSource(lead.source),
      sourceDetail: lead.source,
      normalizedSource: normalizeFacebookSource(lead.source),
      owner: lead.owner,
      ownerId: lead.ownerId,
      leadScore: lead.leadScore,
      stage: lead.stage,
      amount: lead.potentialValue,
      emailStatus: lead.emailStatus,
      tags: lead.tags,
    });
  }

  for (const order of ordersResult.rows) {
    upsert({
      id: order.id,
      contactId: order.contactId ?? "",
      date: formatCrmLeadDateTime(order.created),
      name: order.customer,
      phone: undefined,
      email: undefined,
      courseShort: courseShortName(order.product),
      course: order.product,
      courseSlug: order.courseSlug,
      paymentStatus: order.status,
      latestActivity: isPaidStatus(order.status) ? "Thanh toán thành công" : "Chờ thanh toán",
      latestActivityAt: order.created,
      source: normalizeFacebookSource(order.source),
      sourceDetail: order.source,
      normalizedSource: normalizeFacebookSource(order.source),
      owner: order.owner,
      ownerId: order.ownerId,
      leadScore: isPaidStatus(order.status) ? 100 : 70,
      stage: isPaidStatus(order.status) ? "paid" : "pending_payment",
      orderCode: order.orderCode,
      amount: order.value,
      emailStatus: order.payment,
      tags: [],
    });
  }

  for (const row of freshRows) {
    upsert(row);
  }

  const allRows = filterUnifiedCustomerRows([...rowsByKey.values()], query).sort((a, b) => String(b.latestActivityAt ?? b.date).localeCompare(String(a.latestActivityAt ?? a.date)));
  return paginate(allRows, query);
}

export async function listCrmV2LeadsDirectDataApi(query: CrmListQuery): Promise<CrmListResult<CrmLeadRow>> {
  if (!canQueryLiveCrmV2()) return paginate(filterDemoLeads(demoLeads, query), query);

  const client = createSupabaseAdminClient();
  if (!client) return paginate(filterDemoLeads(demoLeads, query), query);

  const start = (query.page - 1) * query.pageSize;
  const end = start + query.pageSize - 1;
  const searchContactIds = query.search ? await findMatchingLeadContactIds(client, query.search) : [];
  const searchFilter = buildCrmLeadSearchOrFilter(query.search, searchContactIds);
  let builder = client
    .schema("crm_v2")
    .from("leads")
    .select(
      "id,contact_id,stage,status,source,lead_score,email_status,potential_value,next_action,last_touch_at,metadata,course_id,course_slug,owner_id,created_at,contacts(id,full_name,email,phone,marketing_consent,unsubscribed_at,bounce_status,complained_at,metadata)",
      { count: "exact" },
    )
    .range(start, end)
    .order(query.sortBy === "leadScore" ? "lead_score" : "created_at", { ascending: query.sortDirection === "asc" });

  if (query.filters?.stage) builder = builder.eq("stage", query.filters.stage);
  if (query.filters?.source) builder = builder.eq("source", query.filters.source);
  if (query.filters?.owner) builder = builder.eq("owner_id", query.filters.owner);
  if (query.filters?.course) builder = builder.eq("course_slug", query.filters.course);
  if (query.filters?.status) {
    builder = builder.eq("status", query.filters.status);
  } else {
    builder = builder.neq("status", "archived");
  }
  if (searchFilter) builder = builder.or(searchFilter);

  const { data, count, error } = await builder;
  if (error || !data) return paginate(filterDemoLeads(demoLeads, query), query);

  const rows: CrmLeadRow[] = data.map((row) => {
    const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
    const metadata = asRecord((row as { metadata?: unknown }).metadata);
    const contactMeta = asRecord(contact?.metadata);
    const contactRecord = asRecord(contact as unknown);
    const owner = metadataText(metadata, "owner_name") || "Không gán";
    const contactId = row.contact_id ? String(row.contact_id) : String(contactRecord.id ?? "");
    const course =
      metadataText(metadata, "course_title") ||
      metadataText(metadata, "course") ||
      metadataText(contactMeta, "course") ||
      String((row as { course_slug?: string | null }).course_slug ?? "") ||
      "Chưa map khóa học";

    return {
      id: String(row.id),
      contactId,
      name: String(contact?.full_name ?? "Chưa rõ tên"),
      email: contact?.email ? String(contact.email) : undefined,
      phone: contact?.phone ? String(contact.phone) : undefined,
      source: String(row.source ?? "unknown"),
      course,
      courseSlug: (row as { course_slug?: string | null }).course_slug ? String((row as { course_slug?: string | null }).course_slug) : undefined,
      leadScore: Number(row.lead_score ?? 0),
      owner,
      ownerId: row.owner_id ? String(row.owner_id) : undefined,
      stage: normalizeCrmStage(row.stage),
      emailStatus: String(row.email_status ?? "unknown"),
      lastTouch: row.last_touch_at ? new Date(String(row.last_touch_at)).toLocaleString("vi-VN") : "Chưa có",
      nextAction: String(row.next_action ?? "Cập nhật bước tiếp theo"),
      potentialValue: Number(row.potential_value ?? 0),
      createdAt: String(row.created_at),
      tags: [],
    };
  });

  const dedupedRows = dedupeLeadsByContact(rows);
  return {
    rows: dedupedRows,
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? dedupedRows.length,
    pageCount: Math.max(1, Math.ceil((count ?? dedupedRows.length) / query.pageSize)),
  };
}

export async function listCrmV2Orders(query: CrmListQuery): Promise<CrmListResult<CrmOrderRow>> {
  if (!canQueryLiveCrmV2()) return paginate(filterDemoOrders(demoOrders, query), query);

  const client = createSupabaseAdminClient();
  if (!client) return emptyCrmListResult(query);

  const dateRange = getCrmDateRange(query);
  const { data, error } = await client.rpc("crm_v2_orders_list_raw", {
    p_page: query.page,
    p_page_size: query.pageSize,
    p_search: query.search ?? "",
    p_sort_by: query.sortBy ?? "created",
    p_sort_direction: query.sortDirection ?? "desc",
    p_filters: query.filters ?? {},
    p_date_from: dateRange.from,
    p_date_to: dateRange.to,
  });
  if (error || !data) return listCrmV2OrdersDirectDataApi(query);

  const payload = asRecord(data);
  const rows: CrmOrderRow[] = recordArray(payload.rows).map((row) => {
    const contact = asRecord(row.contact);
    const metadata = asRecord(row.metadata);
    return {
      id: String(row.id),
      orderCode: String(row.order_code ?? row.id),
      contactId: row.contact_id ? String(row.contact_id) : undefined,
      customer: String(contact.full_name ?? contact.email ?? "Chưa rõ khách"),
      product: String(row.product_name || metadataText(metadata, "course_title") || row.course_slug || "Legacy order"),
      courseSlug: row.course_slug ? String(row.course_slug) : undefined,
      value: numericValue(row.net_amount) || numericValue(row.amount),
      discount: numericValue(row.discount_amount),
      payment: String(row.payment_gateway ?? "unknown"),
      status: String(row.status ?? "pending"),
      source: String(row.source ?? "legacy_order"),
      owner: "Chưa gán",
      ownerId: row.owner_id ? String(row.owner_id) : undefined,
      created: formatShortDate(row.created_at),
      due: row.due_at ? formatShortDate(row.due_at) : "-",
    };
  });

  return rpcListResult(query, data, rows);
}

export async function listCrmV2OrdersDirectDataApi(query: CrmListQuery): Promise<CrmListResult<CrmOrderRow>> {
  if (!canQueryLiveCrmV2()) return paginate(filterDemoOrders(demoOrders, query), query);

  const client = createSupabaseAdminClient();
  if (!client) return paginate(filterDemoOrders(demoOrders, query), query);

  const start = (query.page - 1) * query.pageSize;
  const end = start + query.pageSize - 1;
  const searchContactIds = query.search ? await findMatchingLeadContactIds(client, query.search) : [];
  const searchFilter = buildCrmOrderSearchOrFilter(query.search, searchContactIds);
  const dateRange = getCrmDateRange(query);
  const lowerBound = dateLowerBound(dateRange.from);
  const upperBound = dateUpperBoundExclusive(dateRange.to);
  let builder = client
    .schema("crm_v2")
    .from("orders")
    .select("id,contact_id,order_code,product_name,amount,discount_amount,net_amount,currency,status,payment_gateway,source,owner_id,due_at,created_at,course_slug,metadata,contacts(full_name,email,phone)", { count: "exact" })
    .range(start, end)
    .gte("created_at", lowerBound)
    .lt("created_at", upperBound)
    .order(query.sortBy === "value" ? "net_amount" : "created_at", { ascending: query.sortDirection === "asc" });

  if (query.filters?.status) builder = builder.eq("status", query.filters.status);
  if (query.filters?.source) builder = builder.eq("source", query.filters.source);
  if (query.filters?.owner) builder = builder.eq("owner_id", query.filters.owner);
  if (query.filters?.course) builder = builder.eq("course_slug", query.filters.course);
  if (searchFilter) builder = builder.or(searchFilter);

  const { data, count, error } = await builder;
  if (error || !data) return paginate(filterDemoOrders(demoOrders, query), query);

  const rows: CrmOrderRow[] = data.map((row) => {
    const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
    return {
      id: String(row.id),
      orderCode: String(row.order_code ?? row.id),
      contactId: row.contact_id ? String(row.contact_id) : undefined,
      customer: String(contact?.full_name ?? contact?.email ?? "Chưa rõ khách"),
      product: String(row.product_name || metadataText(asRecord((row as { metadata?: unknown }).metadata), "course_title") || (row as { course_slug?: string | null }).course_slug || "Legacy order"),
      courseSlug: (row as { course_slug?: string | null }).course_slug ? String((row as { course_slug?: string | null }).course_slug) : undefined,
      value: Number(row.net_amount ?? row.amount ?? 0),
      discount: Number(row.discount_amount ?? 0),
      payment: String(row.payment_gateway ?? "unknown"),
      status: String(row.status ?? "pending"),
      source: String(row.source ?? "legacy_order"),
      owner: "Chưa gán",
      ownerId: row.owner_id ? String(row.owner_id) : undefined,
      created: formatShortDate(row.created_at),
      due: row.due_at ? formatShortDate(row.due_at) : "-",
    };
  });

  return {
    rows,
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? rows.length,
    pageCount: Math.max(1, Math.ceil((count ?? rows.length) / query.pageSize)),
  };
}

export async function getCrmV2OrderSummary(query: CrmListQuery): Promise<CrmOrderSummary> {
  const dateRange = getCrmDateRange(query);
  const empty = () => buildCrmOrderSummary([], dateRange);
  if (!canQueryLiveCrmV2()) return empty();

  const client = createSupabaseAdminClient();
  if (!client) return empty();

  const searchContactIds = query.search ? await findMatchingLeadContactIds(client, query.search) : [];
  const searchFilter = buildCrmOrderSearchOrFilter(query.search, searchContactIds);
  let builder = client
    .schema("crm_v2")
    .from("orders")
    .select("status,net_amount,amount,created_at,source,owner_id,course_slug,contact_id,order_code,product_name")
    .gte("created_at", dateLowerBound(dateRange.from))
    .lt("created_at", dateUpperBoundExclusive(dateRange.to))
    .limit(10000);

  if (query.filters?.status) builder = builder.eq("status", query.filters.status);
  if (query.filters?.source) builder = builder.eq("source", query.filters.source);
  if (query.filters?.owner) builder = builder.eq("owner_id", query.filters.owner);
  if (query.filters?.course) builder = builder.eq("course_slug", query.filters.course);
  if (searchFilter) builder = builder.or(searchFilter);

  const { data, error } = await builder;
  const crmRows = error || !data ? [] : data.map((row) => ({
    status: String(row.status ?? "pending"),
    amount: numericValue(row.net_amount) || numericValue(row.amount),
    createdAt: String(row.created_at ?? ""),
  }));
  const hasScopedFilters = Boolean(query.search || Object.values(query.filters ?? {}).some(Boolean));
  const publicRows = hasScopedFilters ? [] : (await listPublicOrdersForRange(client, dateRange)).map((row) => {
    const status = String(row.status ?? row.payment_status ?? "pending");
    return {
      status,
      amount: numericValue(row.amount),
      createdAt: String(isPaidStatus(status) ? row.paid_at ?? row.created_at ?? "" : row.created_at ?? ""),
    };
  });
  return buildCrmOrderSummary(selectCanonicalOrderMetricRows(crmRows, publicRows), dateRange);
}

export async function listCrmV2Students(query: CrmListQuery): Promise<CrmListResult<CrmStudentRow>> {
  if (!canQueryLiveCrmV2()) return paginate(filterDemoStudents(demoStudents, query), query);

  const client = createSupabaseAdminClient();
  if (!client) return emptyCrmListResult(query);

  const dateRange = getCrmDateRange(query);
  const { data, error } = await client.rpc("crm_v2_students_list_raw", {
    p_page: query.page,
    p_page_size: query.pageSize,
    p_search: query.search ?? "",
    p_sort_by: query.sortBy ?? "lastLearned",
    p_sort_direction: query.sortDirection ?? "desc",
    p_filters: query.filters ?? {},
    p_date_from: dateRange.from,
    p_date_to: dateRange.to,
  });
  if (error || !data) return emptyCrmListResult(query);

  const payload = asRecord(data);
  const rows: CrmStudentRow[] = recordArray(payload.rows).map((row) => {
    const contact = asRecord(row.contact);
    const order = asRecord(row.order);
    const metadata = asRecord(row.metadata);
    const lastSeen = row.last_seen_at ? String(row.last_seen_at) : "";
    return {
      id: String(row.id),
      contactId: row.contact_id ? String(row.contact_id) : undefined,
      student: String(contact.full_name ?? contact.email ?? "Chưa rõ học viên"),
      course: metadataText(metadata, "course_title") || metadataText(metadata, "course_slug") || String(row.course_slug ?? "") || String(order.product_name ?? "Chưa map khóa học"),
      courseSlug: row.course_slug ? String(row.course_slug) : undefined,
      status: String(row.status ?? "active"),
      progress: `${numericValue(metadata.progress_percent)}%`,
      lastLearned: lastSeen ? formatRelativeActivity(lastSeen) : "-",
      engagement: getEngagementLabel(lastSeen),
      upsell: metadataText(metadata, "upsell") || "-",
      owner: "CSKH",
      ownerId: row.owner_id ? String(row.owner_id) : undefined,
      emailCare: metadataText(metadata, "email_status") || "unknown",
    };
  });

  return rpcListResult(query, data, rows);
}

export async function listCrmV2StudentsDirectDataApi(query: CrmListQuery): Promise<CrmListResult<CrmStudentRow>> {
  if (!canQueryLiveCrmV2()) return paginate(filterDemoStudents(demoStudents, query), query);

  const client = createSupabaseAdminClient();
  if (!client) return paginate(filterDemoStudents(demoStudents, query), query);

  const start = (query.page - 1) * query.pageSize;
  const end = start + query.pageSize - 1;
  const searchContactIds = query.search ? await findMatchingLeadContactIds(client, query.search) : [];
  const searchFilter = buildCrmStudentSearchOrFilter(query.search, searchContactIds);
  let builder = client
    .schema("crm_v2")
    .from("enrollments")
    .select("id,contact_id,course_id,course_slug,order_id,status,activated_at,last_seen_at,owner_id,metadata,created_at,contacts(full_name,email,phone),orders(product_name,order_code)", { count: "exact" })
    .range(start, end)
    .order("created_at", { ascending: query.sortDirection === "asc" });

  if (query.filters?.status) builder = builder.eq("status", query.filters.status);
  if (query.filters?.owner) builder = builder.eq("owner_id", query.filters.owner);
  if (query.filters?.course) builder = builder.eq("course_slug", query.filters.course);
  if (searchFilter) builder = builder.or(searchFilter);

  const { data, count, error } = await builder;
  if (error || !data) return paginate(filterDemoStudents(demoStudents, query), query);

  const rows: CrmStudentRow[] = data.map((row) => {
    const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    const metadata = asRecord(row.metadata);
    const lastSeen = row.last_seen_at ? String(row.last_seen_at) : "";
    return {
      id: String(row.id),
      contactId: row.contact_id ? String(row.contact_id) : undefined,
      student: String(contact?.full_name ?? contact?.email ?? "Chưa rõ học viên"),
      course: metadataText(metadata, "course_title") || metadataText(metadata, "course_slug") || String((row as { course_slug?: string | null }).course_slug ?? "") || String(order?.product_name ?? "Chưa map khóa học"),
      courseSlug: (row as { course_slug?: string | null }).course_slug ? String((row as { course_slug?: string | null }).course_slug) : undefined,
      status: String(row.status ?? "active"),
      progress: `${Number(metadata.progress_percent ?? 0)}%`,
      lastLearned: lastSeen ? formatRelativeActivity(lastSeen) : "-",
      engagement: getEngagementLabel(lastSeen),
      upsell: metadataText(metadata, "upsell") || "-",
      owner: "CSKH",
      ownerId: row.owner_id ? String(row.owner_id) : undefined,
      emailCare: metadataText(metadata, "email_status") || "unknown",
    };
  });

  return {
    rows,
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? rows.length,
    pageCount: Math.max(1, Math.ceil((count ?? rows.length) / query.pageSize)),
  };
}

export async function listCrmV2TeamMembers(query: CrmListQuery): Promise<CrmListResult<CrmTeamMember>> {
  const fallback = paginate(filterDemoTeamMembers(demoTeamMembers, query), query);
  if (!canQueryLiveCrmV2()) return fallback;

  const client = createSupabaseAdminClient();
  if (!client) return fallback;

  const adminMembers = await listAdminMembers();
  const ownerIds = adminMembers.members.map((member) => member.id).filter(isUuid);

  const [taskRows, leadRows, studentRows] = await Promise.all([
    ownerIds.length > 0
      ? client.schema("crm_v2").from("tasks").select("owner_id,status").in("owner_id", ownerIds).in("status", ["open", "in_progress"])
      : { data: [] },
    ownerIds.length > 0 ? client.schema("crm_v2").from("leads").select("owner_id,id").in("owner_id", ownerIds) : { data: [] },
    ownerIds.length > 0
      ? client.schema("crm_v2").from("enrollments").select("owner_id,id").in("owner_id", ownerIds)
      : { data: [] },
  ]);

  const rows = adminMembers.members.map((member) => {
    const ownerId = member.id;
    const tasks = (taskRows.data || []).filter((row) => String((row as { owner_id?: string | null }).owner_id ?? "") === ownerId).length;
    const leadCount = (leadRows.data || []).filter((row) => String((row as { owner_id?: string | null }).owner_id ?? "") === ownerId).length;
    const studentCount = (studentRows.data || []).filter((row) => String((row as { owner_id?: string | null }).owner_id ?? "") === ownerId).length;
    const mappedRole = member.role === "owner" ? "owner" : member.role === "editor" ? "sales" : "support";

    return {
      id: ownerId,
      member: member.name || member.email,
      role: mappedRole,
      pipeline: `${leadCount} leads, ${studentCount} students`,
      tasks: `${tasks}`,
      sla: `${Math.max(0, 99 - Math.min(tasks, 99))}%`,
      status: "active",
    };
  });

  if (!rows.length) return fallback;
  const filteredRows = filterDemoTeamMembers(rows, query);
  return paginate(filteredRows, query);
}

export async function listCrmV2SegmentsRows(query: CrmListQuery): Promise<CrmListResult<CrmSegmentRow>> {
  const fallback = paginate(filterDemoSegments(demoSegments, query), query);
  if (!canQueryLiveCrmV2()) return fallback;

  const client = createSupabaseAdminClient();
  if (!client) return fallback;

  const start = (query.page - 1) * query.pageSize;
  const end = start + query.pageSize - 1;
  const safeSearch = query.search ? normalizeCrmSearchTerm(query.search) : "";
  let builder = client
    .schema("crm_v2")
    .from("segments")
    .select("id,name,description,audience_goal,channel,current_size,status,updated_at", { count: "exact" })
    .range(start, end)
    .order(query.sortBy === "name" ? "name" : "updated_at", { ascending: query.sortDirection === "asc" });
  if (query.filters?.status) builder = builder.eq("status", query.filters.status);
  if (query.filters?.source) builder = builder.eq("channel", query.filters.source);
  if (safeSearch) builder = builder.or(`name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,audience_goal.ilike.%${safeSearch}%,channel.ilike.%${safeSearch}%`);

  const { data, count, error } = await builder;
  if (error || !data) return fallback;

  const ruleMap = await fetchLatestSegmentRules(client, data.map((row) => String(row.id)));
  const rows: CrmSegmentRow[] = data.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    condition: row.id ? ruleMap.get(String(row.id)) || String(row.description ?? "No rule loaded") : String(row.description ?? ""),
    size: Number(row.current_size ?? 0),
    goal: String(row.audience_goal ?? "N/A"),
    channel: String(row.channel ?? ""),
    updated: formatShortDate(row.updated_at),
    status: String(row.status ?? "draft"),
  }));

  return {
    rows,
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? rows.length,
    pageCount: Math.max(1, Math.ceil((count ?? rows.length) / query.pageSize)),
  };
}

export async function listCrmV2AutomationWorkflows(query: CrmListQuery): Promise<CrmListResult<CrmAutomationWorkflowRow>> {
  const fallback = paginate(filterDemoAutomationWorkflows(demoAutomationWorkflows, query), query);
  if (!canQueryLiveCrmV2()) return fallback;

  const client = createSupabaseAdminClient();
  if (!client) return fallback;

  const start = (query.page - 1) * query.pageSize;
  const end = start + query.pageSize - 1;
  let builder = client
    .schema("crm_v2")
    .from("workflows")
    .select("id,name,status,updated_at")
    .range(start, end)
    .order(query.sortBy === "name" ? "name" : "updated_at", { ascending: query.sortDirection === "asc" });

  if (query.filters?.status) builder = builder.eq("status", query.filters.status);
  if (query.filters?.source) builder = builder.eq("campaign_type", query.filters.source);
  if (query.search) {
    const safeSearch = normalizeCrmSearchTerm(query.search);
    if (safeSearch) builder = builder.ilike("name", `%${safeSearch}%`);
  }

  const { data, count, error } = await builder;
  if (error || !data) return fallback;

  const runCounts = await countWorkflowRuns(client, data.map((row) => String(row.id)));
  const rows = data.map((row) => {
    const workflowId = String(row.id);
    const runsNumeric = runCounts.get(workflowId) ?? 0;
    return {
      id: workflowId,
      name: String(row.name ?? ""),
      status: normalizeWorkflowStatus(String(row.status ?? "draft")),
      runs: `${runsNumeric}`,
      runsNumeric,
      updated: formatShortDate(row.updated_at),
    };
  });

  return {
    rows,
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? rows.length,
    pageCount: Math.max(1, Math.ceil((count ?? rows.length) / query.pageSize)),
  };
}

export async function listCrmV2EmailCampaigns(query: CrmListQuery): Promise<CrmListResult<CrmEmailCampaignRow>> {
  const fallback = paginate(filterDemoEmailCampaigns(demoEmailCampaigns, query), query);
  if (!canQueryLiveCrmV2()) return fallback;

  const client = createSupabaseAdminClient();
  if (!client) return fallback;

  const start = (query.page - 1) * query.pageSize;
  const end = start + query.pageSize - 1;
  let builder = client
    .schema("crm_v2")
    .from("email_campaigns")
    .select("id,name,campaign_type,status,segment_id,template_id,owner_id,scheduled_at,sent_at,metrics,metadata,updated_at,email_templates(subject,preheader)", { count: "exact" })
    .range(start, end)
    .order(query.sortBy === "name" ? "name" : "updated_at", { ascending: query.sortDirection === "asc" });

  if (query.filters?.status) builder = builder.eq("status", query.filters.status);
  if (query.search) {
    const safeSearch = normalizeCrmSearchTerm(query.search);
    if (safeSearch) builder = builder.ilike("name", `%${safeSearch}%`);
  }

  const { data, count, error } = await builder;
  if (error || !data) return fallback;

  const segmentNameById = await fetchSegmentNameMap(client, data.map((row) => String((row as { segment_id?: string | null }).segment_id ?? "")));
  const ownerNameById = await fetchOwnerNameMap(client, data.map((row) => String((row as { owner_id?: string | null }).owner_id ?? "")));

  const rows = data.map((row) => {
    const owner = ownerNameById.get(String((row as { owner_id?: string | null }).owner_id ?? "")) || "Không gán";
    const segment = segmentNameById.get(String((row as { segment_id?: string | null }).segment_id ?? "")) || "Không gán segment";
    const metrics = asRecord((row as { metrics?: unknown }).metrics);
    const metadata = asRecord((row as { metadata?: unknown }).metadata);
    const audienceSnapshot = asRecord(metadata.audience_snapshot);
    const template = asRecord(asArrayLike((row as { email_templates?: unknown }).email_templates)[0] ?? (row as { email_templates?: unknown }).email_templates);
    return {
      id: String(row.id),
      name: String(row.name ?? ""),
      segmentId: String((row as { segment_id?: string | null }).segment_id ?? ""),
      templateId: String((row as { template_id?: string | null }).template_id ?? ""),
      subject: String(template.subject ?? ""),
      preheader: String(template.preheader ?? ""),
      segment,
      type: campaignTypeLabel(String(row.campaign_type ?? "broadcast")),
      status: String(row.status ?? "draft"),
      sendTime: formatCampaignSendTime(String((row as { scheduled_at?: string | null }).scheduled_at ?? ""), String((row as { sent_at?: string | null }).sent_at ?? "")),
      scheduledAt: String((row as { scheduled_at?: string | null }).scheduled_at ?? ""),
      audienceTotal: Number(audienceSnapshot.total ?? 0),
      sendable: Number(audienceSnapshot.sendable ?? metrics.sent ?? 0),
      suppressed: Number(audienceSnapshot.suppressed ?? 0),
      missingEmail: Number(audienceSnapshot.missing_email ?? 0),
      openRate: toPercentLabel(metrics.open_rate ?? metrics.openRate ?? metrics.opened_rate) + "%",
      clickRate: toPercentLabel(metrics.click_rate ?? metrics.clickRate ?? metrics.clicked_rate) + "%",
      conversion: toPercentLabel(metrics.conversion ?? metrics.conversionRate ?? 0),
      revenue: Number(metrics.revenue ?? metrics.revenue_amount ?? 0),
      owner,
    };
  });

  return {
    rows,
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? rows.length,
    pageCount: Math.max(1, Math.ceil((count ?? rows.length) / query.pageSize)),
  };
}

export async function getCrmV2EmailCampaignKpis(): Promise<KpiMetric[]> {
  const fallback = demoEmailKpis;
  if (!canQueryLiveCrmV2()) return fallback;
  const client = createSupabaseAdminClient();
  if (!client) return fallback;

  const { data, error } = await client.schema("crm_v2").from("crm_email_metrics").select("sent,opened,clicked,bounced,unsubscribed,complained,revenue");
  if (error || !data) return fallback;

  const sent = data.reduce((total, row) => total + Number(row.sent ?? 0), 0);
  const opened = data.reduce((total, row) => total + Number(row.opened ?? 0), 0);
  const clicked = data.reduce((total, row) => total + Number(row.clicked ?? 0), 0);
  const bounced = data.reduce((total, row) => total + Number(row.bounced ?? 0), 0);
  const unsubscribed = data.reduce((total, row) => total + Number(row.unsubscribed ?? 0), 0);
  const complained = data.reduce((total, row) => total + Number(row.complained ?? 0), 0);
  const revenue = data.reduce((total, row) => total + Number(row.revenue ?? 0), 0);

  const openRate = sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0;
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0;
  const followUp = Math.max(0, sent - opened);
  const abTestRunning = 0;

  return [
    { label: "Email đã gửi", value: formatIntWithDot(sent), tone: "blue", series: [sent] },
    { label: "Open rate", value: `${openRate}%`, tone: "purple", series: [openRate] },
    { label: "Click rate", value: `${clickRate}%`, tone: "green", series: [clickRate] },
    { label: "Doanh thu từ email", value: formatMoney(revenue), tone: "green", series: [Math.round(revenue / 1_000_000)] },
    { label: "Email chưa mở cần follow-up", value: formatIntWithDot(followUp + bounced + unsubscribed + complained), tone: "orange", series: [1000] },
    { label: "A/B test đang chạy", value: `${abTestRunning}`, tone: "purple", series: [abTestRunning] },
  ];
}

export async function listCrmV2CourseOptions(): Promise<CrmCourseOption[]> {
  if (!canQueryLiveCrmV2()) {
    const courseMap = new Map<string, CrmCourseOption>();
    for (const order of demoOrders) {
      const value = order.courseSlug || slugifyTag(order.product || "demo-course");
      const current = courseMap.get(value) ?? {
        label: order.product || value,
        value,
        paidOrders: 0,
        pendingOrders: 0,
        revenue: 0,
      };
      if (isPaidStatus(order.status)) {
        current.paidOrders += 1;
        current.revenue += order.value;
      } else {
        current.pendingOrders += 1;
      }
      courseMap.set(value, current);
    }
    return [...courseMap.values()].sort((a, b) => b.revenue - a.revenue);
  }

  const client = createSupabaseAdminClient();
  if (!client) return [];

  const { data, error } = await client
    .schema("crm_v2")
    .from("orders")
    .select("course_slug,product_name,status,net_amount,amount,metadata")
    .not("course_slug", "is", null)
    .limit(10000);
  if (error || !data) return [];

  const courseMap = new Map<string, CrmCourseOption>();
  for (const row of data) {
    const metadata = asRecord((row as { metadata?: unknown }).metadata);
    const value = String((row as { course_slug?: string | null }).course_slug ?? "").trim();
    if (!value) continue;
    const label =
      String((row as { product_name?: string | null }).product_name ?? "").trim() ||
      metadataText(metadata, "course_title") ||
      value;
    const current = courseMap.get(value) ?? {
      label,
      value,
      paidOrders: 0,
      pendingOrders: 0,
      revenue: 0,
    };
    const amount = Number((row as { net_amount?: number | null; amount?: number | null }).net_amount ?? (row as { amount?: number | null }).amount ?? 0);
    if (isPaidStatus(String((row as { status?: string | null }).status ?? ""))) {
      current.paidOrders += 1;
      current.revenue += Number.isFinite(amount) ? amount : 0;
    } else {
      current.pendingOrders += 1;
    }
    if (label.length > current.label.length) current.label = label;
    courseMap.set(value, current);
  }

  return [...courseMap.values()].sort((a, b) => b.revenue - a.revenue || b.paidOrders - a.paidOrders || a.label.localeCompare(b.label));
}

type CrmDashboardSnapshot = {
  kpis: KpiMetric[];
  attributionRows: CrmListResult<CrmReportAttributionRow>;
  dashboard: CrmDashboardData;
};

type ReportAttributionSnapshot = {
  rows: CrmReportAttributionRow[];
  dailyRevenue: Array<{ label: string; value: number }>;
};

export async function getCrmV2LegacyEmailConfigSnapshot() {
  const configs = [
    {
      key: "registration",
      name: "Email khi khách đăng ký",
      trigger: "form submit / registration",
      subject: "Xác nhận đăng ký The Anh Marketing",
      source: "legacy registration email flow",
      sentCount: 0,
      lastSentAt: "",
    },
    {
      key: "pending_payment",
      name: "Nhắc thanh toán",
      trigger: "order pending_payment",
      subject: "Đơn hàng đang chờ thanh toán",
      source: "legacy pending payment email flow",
      sentCount: 0,
      lastSentAt: "",
    },
    {
      key: "payment_success",
      name: "Thông báo thanh toán",
      trigger: "order paid / student access",
      subject: "Thanh toán thành công và thông tin truy cập khóa học",
      source: "legacy payment success email flow",
      sentCount: 0,
      lastSentAt: "",
    },
  ];

  const client = createSupabaseAdminClient();
  if (!client || shouldUseCrmV2DemoData()) return configs;

  const { data } = await client.from("email_logs").select("template_key,subject,status,created_at").limit(5000);
  const rows = Array.isArray(data) ? data : [];
  return configs.map((config) => {
    const matched = rows.filter((row) => {
      const record = row as { template_key?: string | null; subject?: string | null };
      const key = String(record.template_key ?? "").toLowerCase();
      const subject = String(record.subject ?? "").toLowerCase();
      return key.includes(config.key) || subject.includes(config.key.replace("_", " ")) || subject.includes(config.subject.toLowerCase().slice(0, 12));
    });
    const last = matched
      .map((row) => String((row as { created_at?: string | null }).created_at ?? ""))
      .filter(Boolean)
      .sort()
      .at(-1);
    return {
      ...config,
      subject: String((matched[0] as { subject?: string | null } | undefined)?.subject ?? config.subject),
      sentCount: matched.length,
      lastSentAt: last ?? "",
    };
  });
}

function buildEmptyReportSnapshot(query: CrmListQuery): CrmDashboardSnapshot {
  return {
    kpis: [
      { label: "Tổng doanh thu", value: "0đ", tone: "green", series: [0] },
      { label: "Doanh thu từ email", value: "0đ", tone: "purple", series: [0] },
      { label: "CR lead -> paid", value: "0%", tone: "blue", series: [0] },
      { label: "CAC ước tính", value: "0K", tone: "orange", series: [0] },
      { label: "ROI theo kênh", value: "~0x", tone: "green", series: [0] },
      { label: "LTV trung bình", value: "0đ / KH", tone: "purple", series: [0] },
    ],
    attributionRows: paginate([], query),
    dashboard: buildEmptyLiveDashboard(),
  };
}

export async function getCrmV2ReportSnapshot(query = normalizeCrmListQuery({ page: "1", pageSize: "50" })): Promise<CrmDashboardSnapshot> {
  if (!canQueryLiveCrmV2()) return buildEmptyReportSnapshot(query);
  const client = createSupabaseAdminClient();
  if (!client) return buildEmptyReportSnapshot(query);

  const [dashboard, attributionRowsResult] = await Promise.all([getCrmV2Dashboard(query), buildReportAttributionRows(client, query)]);
  const summary = dashboard.reportSummary ?? {
    newLeads: dashboard.funnel.reduce((sum, row) => sum + row.value, 0),
    mql: dashboard.funnel.filter((row) => ["Đang tư vấn", "Quan tâm cao", "Chờ thanh toán", "Đã thanh toán"].includes(row.label)).reduce((sum, row) => sum + row.value, 0),
      paidOrders: dashboard.funnel.find((row) => row.label === "Đã thanh toán")?.value ?? 0,
      revenue: 0,
      emailRevenue: 0,
      dailyRevenue: [],
    };
  const attributionRows = attributionRowsResult.rows;
  const reportDailyRevenue = (attributionRowsResult.dailyRevenue.length ? attributionRowsResult.dailyRevenue : (summary.dailyRevenue ?? dashboard.revenue)).slice().reverse();
  const attributionTotals = attributionRows.reduce(
    (acc, row) => {
      acc.leads += row.leads;
      acc.mql += row.mql;
      acc.paid += row.paid;
      acc.revenue += row.revenue;
      acc.emailRevenue += row.emailRevenue;
      return acc;
    },
    { leads: 0, mql: 0, paid: 0, revenue: 0, emailRevenue: 0 },
  );
  const totalLeads = attributionTotals.leads || dashboard.funnel.reduce((sum, row) => sum + row.value, 0) || summary.newLeads;
  const totalMql = attributionTotals.mql || summary.mql;
  const totalPaid = attributionTotals.paid || summary.paidOrders;
  const totalRevenue = attributionTotals.revenue || summary.revenue;
  const totalEmailRevenue = attributionTotals.emailRevenue || summary.emailRevenue;
  const revenueFromPaid = totalPaid > 0 ? Math.round(totalRevenue / Math.max(totalPaid, 1)) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((totalPaid / totalLeads) * 1000) / 10 : 0;
  const cacRaw = totalMql > 0 ? Math.round(totalRevenue / totalMql) : 0;
  const cacEstimate = cacRaw > 0 ? `${formatIntWithDot(Math.round(cacRaw / 1_000))}K` : "0K";
  const reportSummary = {
    ...summary,
    revenue: totalRevenue,
    emailRevenue: totalEmailRevenue,
    paidOrders: totalPaid,
    mql: totalMql,
    newLeads: totalLeads,
    dailyRevenue: reportDailyRevenue,
  };
  const reportDashboard = {
    ...dashboard,
    revenue: reportDailyRevenue,
    reportSummary,
  };
  const fallbackAttributionRows = attributionRows.length > 0 ? attributionRows : deriveReportAttributionRowsFromDashboard(reportDashboard, reportSummary);

  return {
    kpis: [
      { label: "Tổng doanh thu", value: formatMoney(totalRevenue), tone: "green", series: [90, 120, 160, 180, 186] },
      { label: "Doanh thu từ email", value: formatMoney(totalEmailRevenue), tone: "purple", series: [30, 36, 42, 50, 52] },
      { label: "CR lead -> paid", value: `${conversionRate}%`, tone: "blue", series: [9.8, 10.6, 11, 11.8, conversionRate] },
      { label: "CAC ước tính", value: cacEstimate, tone: "orange", series: [130, 120, 110, 100, 96] },
      { label: "ROI theo kênh", value: `~${totalRevenue > 0 && totalLeads > 0 ? (totalRevenue / Math.max(totalLeads, 1)).toFixed(1) : 0}x`, tone: "green", series: [2.2, 2.8, 3.4, 3.8, 4.1] },
      { label: "LTV trung bình", value: `${formatMoney(revenueFromPaid)} / KH`, tone: "purple", series: [0.9, 1.0, 1.2, 1.35, 1.42] },
    ],
    attributionRows: paginate(filterDemoReportAttributionRows(fallbackAttributionRows.sort((a, b) => b.revenue - a.revenue), query), query),
    dashboard: reportDashboard,
  };
}

export async function listCrmV2Integrations(query: CrmListQuery): Promise<CrmListResult<CrmIntegrationRow>> {
  if (!canQueryLiveCrmV2()) return paginate(filterDemoIntegrations(demoIntegrations, query), query);

  const client = createSupabaseAdminClient();
  if (!client) return paginate(filterDemoIntegrations(demoIntegrations, query), query);

  const start = (query.page - 1) * query.pageSize;
  const end = start + query.pageSize - 1;
  const { data, count, error } = await client
    .schema("crm_v2")
    .from("integration_accounts")
    .select("id,provider,status,last_sync_at,account_name,config", { count: "exact" })
    .order(query.sortBy ?? "provider", { ascending: query.sortDirection === "asc" })
    .range(start, end);

  if (error || !data) return paginate(filterDemoIntegrations(demoIntegrations, query), query);

  const rows: CrmIntegrationRow[] = data.map((row) => {
    const provider = String(row.provider ?? "");
    const lastSync = row.last_sync_at ? formatShortDate(row.last_sync_at) : "Chưa bật";
    return {
      id: String(row.id),
      provider,
      type: String(row.account_name ? `Email` : "Ads event"),
      status: String(row.status ?? "mock"),
      lastSync,
      health: mapIntegrationHealth(String(row.status ?? ""), row.last_sync_at),
    };
  });

  return {
    rows: rows
      .filter((row) => {
        if (query.filters?.status && row.status !== query.filters.status) return false;
        return true;
      })
      .filter((row) => {
        if (!query.search) return true;
        const term = query.search?.trim().toLowerCase();
        return term ? [row.provider, row.type, row.status, row.lastSync].some((value) => value.toLowerCase().includes(term)) : true;
      }),
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? rows.length,
    pageCount: Math.max(1, Math.ceil((count ?? rows.length) / query.pageSize)),
  };
}

async function findMatchingLeadContactIds(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, search: string) {
  const term = normalizeCrmSearchTerm(search);
  if (!term) return [];

  const filters = [`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `phone.ilike.%${term}%`];
  const normalizedEmail = normalizeEmail(term);
  const normalizedPhone = normalizePhone(term);
  if (normalizedEmail) filters.push(`normalized_email.ilike.%${normalizeCrmSearchTerm(normalizedEmail)}%`);
  if (normalizedPhone) filters.push(`normalized_phone.ilike.%${normalizeCrmSearchTerm(normalizedPhone)}%`);

  const { data, error } = await client.schema("crm_v2").from("contacts").select("id").or(filters.join(",")).limit(200);
  if (error || !data) return [];
  return data.map((row) => String(row.id)).filter(isUuid);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function formatShortDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatRelativeActivity(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return `${days} ngày`;
}

function getEngagementLabel(lastSeenAt: string) {
  if (!lastSeenAt) return "Thap";
  const date = new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) return "Thấp";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 3) return "Cao";
  if (days <= 14) return "Vua";
  return "Thap";
}

function normalizeDateLabel(value: string | null | undefined, fallback = "N/A") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString("vi-VN");
}

function normalizeProfileTaskStatus(status: string): CrmProfileTask["status"] {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "done" || normalized === "closed") return "completed";
  if (normalized === "in_progress" || normalized === "inprogress") return "in_progress";
  if (normalized === "blocked") return "blocked";
  if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
  return "open";
}

function normalizeProfileTaskPriority(priority: string): CrmProfileTask["priority"] {
  const normalized = priority.toLowerCase();
  if (normalized === "urgent" || normalized === "critical") return "urgent";
  if (normalized === "high") return "high";
  if (normalized === "normal") return "normal";
  return "low";
}

function normalizeAutomationStatus(status: string): CrmProfileAutomationRun["status"] {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "success" || normalized === "done") return "success";
  if (normalized === "waiting") return "waiting";
  if (normalized === "running" || normalized === "active") return "running";
  if (normalized === "failed" || normalized === "error") return "failed";
  if (normalized === "skipped") return "skipped";
  return "pending";
}

function resolveOwnerName(ownerId: string | null | undefined, ownerNameMap: Map<string, string>) {
  if (!ownerId) return "Unknown";
  return ownerNameMap.get(ownerId) ?? "Unknown";
}

export async function getCrmV2LeadProfile(id: string): Promise<CrmLeadProfile> {
  const fallback = (() => {
    const lead = demoLeads.find((row) => row.id === id || row.contactId === id) ?? demoLeads[0];
    const contact = demoContacts.find((row) => row.id === lead.contactId) ?? demoContacts[0];
    const fallbackOrders: CrmOrderRow[] = demoOrders
      .filter((order) => order.contactId === contact.id)
      .map((order) => ({
        ...order,
      }));
    const fallbackStudents: CrmStudentRow[] = demoStudents
      .filter((student) => student.contactId === contact.id)
      .map((student) => ({
        ...student,
      }));
    const fallbackNotes: CrmProfileNote[] = [
      {
        id: `note_${id}_1`,
        source: "lead_note",
        author: "CSKH",
        body: `Lead ${lead.name} has profile notes in fallback mode.`,
        createdAt: "Hien tai",
      },
      {
        id: `note_${id}_2`,
        source: "student_note",
        author: "Sale",
        body: "Fallback demo note for task visibility and reminders.",
        createdAt: "Hom truoc",
      },
    ];
    const fallbackEmails: CrmProfileEmailHistory[] = [
      {
        id: `email_${id}_1`,
        campaign: "Remarketing demo",
        subject: "Theo dõi tiêu chuẩn",
        status: "sent",
        sent: "Hôm nay",
        opened: "No click",
        clicked: "No",
        channel: "Resend",
        campaignStatus: "sent",
      },
    ];
    const fallbackAutomations: CrmProfileAutomationRun[] = [
      {
        id: `automation_${id}_1`,
        workflow: "Pending payment rescue",
        status: "running",
        step: "Send reminder",
        started: "Hôm qua",
        finished: "Đang chạy",
      },
    ];
    const fallbackTasks: CrmProfileTask[] = [
      {
        id: `task_${id}_1`,
        title: "Nhắc nhận",
        status: "open",
        priority: "high",
        due: "2 ngày",
        owner: "Sale A",
        leadId: lead.id,
      },
      {
        id: `task_${id}_2`,
        title: "Kiểm tra thanh toán",
        status: "in_progress",
        priority: "normal",
        due: "1 ngày",
        owner: "CSKH",
        leadId: lead.id,
      },
    ];

    return {
      contact,
      lead,
      events: demoEvents,
      orders: fallbackOrders,
      students: fallbackStudents,
      notes: fallbackNotes,
      emailHistory: fallbackEmails,
      automationRuns: fallbackAutomations,
      tasks: fallbackTasks,
    };
  })();

  if (!canQueryLiveCrmV2()) return fallback;

  const client = createSupabaseAdminClient();
  if (!client) return fallback;

  const leadProfileQuery = client
    .schema("crm_v2")
    .from("leads")
    .select(
      `
      id,
      contact_id,
      owner_id,
      stage,
      status,
      source,
      lead_score,
      email_status,
      potential_value,
      next_action,
      last_touch_at,
      metadata,
      contacts (
        id,
        full_name,
        email,
        phone,
        source,
        lifecycle_stage,
        marketing_consent,
        unsubscribed_at,
        bounce_status,
        complained_at,
        metadata
      )
    `,
    )
    .limit(1);

  let leadRows: Record<string, unknown> | null = null;
  let leadError: { message: string } | null = null;

  const leadByIdResult = await leadProfileQuery.eq("id", id).maybeSingle();
  leadRows = (leadByIdResult.data as Record<string, unknown> | null) ?? null;
  leadError = leadByIdResult.error ? { message: leadByIdResult.error.message } : null;

  if (!leadRows && isUuid(id)) {
    const leadByContactResult = await client
      .schema("crm_v2")
      .from("leads")
      .select(
        `
      id,
      contact_id,
      owner_id,
      stage,
      status,
      source,
      lead_score,
      email_status,
      potential_value,
      next_action,
      last_touch_at,
      metadata,
      contacts (
        id,
        full_name,
        email,
        phone,
        source,
        lifecycle_stage,
        marketing_consent,
        unsubscribed_at,
        bounce_status,
        complained_at,
        metadata
      )
    `,
      )
      .eq("contact_id", id)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    leadRows = (leadByContactResult.data as Record<string, unknown> | null) ?? null;
    leadError = leadByContactResult.error ? { message: leadByContactResult.error.message } : leadError;
  }

  if (leadError || !leadRows) return fallback;

  const leadRow = leadRows as {
    id: string;
    contact_id: string | null;
    owner_id: string | null;
    stage: string;
    status: string;
    source: string | null;
    lead_score: number | null;
    email_status: string | null;
    potential_value: number | null;
    next_action: string | null;
    last_touch_at: string | null;
    metadata: Record<string, unknown> | null;
    contacts:
      | {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          source: string | null;
          lifecycle_stage: string | null;
          marketing_consent: boolean | null;
          unsubscribed_at: string | null;
          bounce_status: string | null;
          complained_at: string | null;
          metadata: Record<string, unknown> | null;
        }
      | null
      | Array<{
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          source: string | null;
          lifecycle_stage: string | null;
          marketing_consent: boolean | null;
          unsubscribed_at: string | null;
          bounce_status: string | null;
          complained_at: string | null;
          metadata: Record<string, unknown> | null;
        }>;
  };

  const contactRecord = Array.isArray(leadRow.contacts) ? leadRow.contacts[0] : leadRow.contacts;
  const leadMetadata = asRecord(leadRow.metadata);
  const contactId = leadRow.contact_id ?? contactRecord?.id;
  const cleanContactId = contactId ? String(contactId) : "";

  const { data: eventsRows } = contactId
    ? await client
        .schema("crm_v2")
        .from("crm_events")
        .select("id,event_type,event_source,occurred_at,metadata")
        .eq("contact_id", contactId)
        .order("occurred_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const { data: contactTagRows } = contactId
    ? await client.schema("crm_v2").from("contact_tags").select("tags(name)").eq("contact_id", contactId).limit(20)
    : { data: [] };

  const tags = (contactTagRows ?? [])
    .map((row) => {
      const tag = row.tags;
      if (typeof tag === "object" && tag && "name" in tag) {
        return String((tag as { name?: string }).name ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);

  const adminMembers = await listAdminMembers();
  const ownerNameMap = new Map(adminMembers.members.map((member) => [member.id, member.name || member.email]));

  const contact: CrmContact = {
    id: String(contactRecord?.id ?? cleanContactId),
    fullName: String(contactRecord?.full_name ?? "Không rõ tên"),
    email: contactRecord?.email ? String(contactRecord.email) : undefined,
    phone: contactRecord?.phone ? String(contactRecord.phone) : undefined,
    source: leadRow.source ?? contactRecord?.source ?? "unknown",
    ownerName: leadMetadata.ownerName ? String(leadMetadata.ownerName) : undefined,
    lifecycleStage: String(contactRecord?.lifecycle_stage ?? "lead"),
    leadScore: Number(leadRow.lead_score ?? 0),
    marketingConsent: contactRecord?.marketing_consent ?? true,
    unsubscribedAt: contactRecord?.unsubscribed_at ? String(contactRecord.unsubscribed_at) : undefined,
    bounceStatus: contactRecord?.bounce_status ? String(contactRecord.bounce_status) : undefined,
    complainedAt: contactRecord?.complained_at ? String(contactRecord.complained_at) : undefined,
    tags,
    courses: [metadataCourseTitle(leadMetadata), metadataCourseTitle(asRecord(contactRecord?.metadata))].filter(Boolean),
  };

  const lead: CrmLeadRow = {
    id: String(leadRow.id),
    contactId: cleanContactId,
    name: contact.fullName,
    email: contact.email,
    phone: contact.phone,
    source: String(leadRow.source ?? "unknown"),
    course: metadataCourseTitle(leadMetadata) || metadataCourseTitle(asRecord(contactRecord?.metadata)) || "Chưa map khóa học",
    leadScore: Number(leadRow.lead_score ?? 0),
    owner: resolveOwnerName(String(leadRow.owner_id ?? ""), ownerNameMap),
    stage: (String(leadRow.stage || "new") as CrmStage),
    emailStatus: String(leadRow.email_status ?? "unknown"),
    lastTouch: leadRow.last_touch_at ? new Date(String(leadRow.last_touch_at)).toLocaleString("vi-VN") : "Chưa có",
    nextAction: String(leadRow.next_action ?? "Cập nhật bước tiếp theo"),
    potentialValue: Number(leadRow.potential_value ?? 0),
    createdAt: new Date().toISOString(),
    tags,
  };

  const events: CrmEvent[] = (eventsRows ?? []).map((event) => {
    const eventType = String(event.event_type ?? "crm_event");
    const metadata = asRecord(event.metadata);
    const detail = typeof metadata.detail === "string" && metadata.detail.trim() ? metadata.detail : "";
    const title = toTimelineTitle(eventType);
    return {
      id: String(event.id),
      type: eventType,
      title,
      description: detail,
      occurredAt: event.occurred_at ? new Date(String(event.occurred_at)).toLocaleString("vi-VN") : "N/A",
      tone: getCrmEventTone(eventType),
    };
  });

  const leadId = String(lead.id);

  let taskQuery = cleanContactId || leadId ? client.schema("crm_v2").from("tasks").select("id,title,status,priority,due_at,owner_id,lead_id") : null;
  if (taskQuery) {
    if (cleanContactId && leadId) {
      taskQuery = taskQuery.or(`contact_id.eq.${cleanContactId},lead_id.eq.${leadId}`);
    } else if (cleanContactId) {
      taskQuery = taskQuery.eq("contact_id", cleanContactId);
    } else if (leadId) {
      taskQuery = taskQuery.eq("lead_id", leadId);
    }
    taskQuery = taskQuery.order("created_at", { ascending: false }).limit(15);
  }

  const [orderRows, studentRows, noteRows, studentNoteRows, emailRows, taskRows, workflowRuns] = await Promise.all([
    cleanContactId
      ? client
          .schema("crm_v2")
          .from("orders")
          .select("id,order_code,product_name,amount,discount_amount,net_amount,status,payment_gateway,source,owner_id,due_at,created_at,course_slug,metadata")
          .eq("contact_id", cleanContactId)
          .order("created_at", { ascending: false })
          .limit(20)
      : { data: [], error: null },
    cleanContactId
      ? client
          .schema("crm_v2")
          .from("enrollments")
          .select("id,contact_id,course_id,course_slug,order_id,status,last_seen_at,metadata,owner_id,created_at")
          .eq("contact_id", cleanContactId)
          .order("created_at", { ascending: false })
          .limit(10)
      : { data: [], error: null },
    cleanContactId
      ? client
          .schema("crm_v2")
          .from("notes")
          .select("id,body,owner_id,created_at,metadata")
          .eq("contact_id", cleanContactId)
          .order("created_at", { ascending: false })
          .limit(10)
      : { data: [], error: null },
    cleanContactId
      ? client
          .schema("crm_v2")
          .from("student_notes")
          .select("id,note,owner_id,created_at,metadata")
          .eq("contact_id", cleanContactId)
          .order("created_at", { ascending: false })
          .limit(10)
      : { data: [], error: null },
    cleanContactId
      ? client
          .schema("crm_v2")
          .from("email_sends")
          .select(
            "id,subject,status,recipient_email,provider,provider_message_id,sent_at,opened_at,clicked_at,bounced_at,complained_at,metadata,campaign_id,created_at,campaigns(name,status)",
          )
          .eq("contact_id", cleanContactId)
          .order("created_at", { ascending: false })
          .limit(15)
      : { data: [], error: null },
    taskQuery ? taskQuery : { data: [], error: null },
    leadId
      ? client
          .schema("crm_v2")
          .from("workflow_runs")
          .select("id,workflow_id,status,started_at,finished_at,metadata,lead_id")
          .eq("lead_id", leadId)
          .order("started_at", { ascending: false })
          .limit(20)
      : { data: [], error: null },
  ]);

  const workflowRunsData = workflowRuns.data as Array<{
    id: string;
    workflow_id: string | null;
    status: string;
    started_at: string | null;
    finished_at: string | null;
    metadata: Record<string, unknown> | null;
    lead_id: string | null;
  }>;
  const workflowIds = (workflowRunsData ?? []).map((row) => String(row.workflow_id ?? "")).filter(isUuid);
  const workflowRows = workflowIds.length
    ? await client.schema("crm_v2").from("workflows").select("id,name").in("id", workflowIds)
    : { data: [] as Array<{ id: string; name: string }>, error: null };
  const workflowNameById = new Map<string, string>((workflowRows.data ?? []).map((row: { id: string; name?: string }) => [row.id, String(row.name ?? row.id)]));

  const studentOrderIds = Array.from(
    new Set(
      ((studentRows.data as Array<{ order_id?: string | null }> | null) ?? [])
        .map((row) => String(row.order_id ?? ""))
        .filter(isUuid),
    ),
  );
  const studentOrderRows = studentOrderIds.length
    ? await client.schema("crm_v2").from("orders").select("id,product_name,order_code,course_slug,metadata").in("id", studentOrderIds)
    : { data: [] as Array<{ id: string; product_name?: string; order_code?: string; course_slug?: string | null; metadata?: Record<string, unknown> | null }>, error: null };
  const orderNameById = new Map((studentOrderRows.data ?? []).map((row) => [String(row.id), { product: row.product_name || metadataText(asRecord(row.metadata), "course_title") || row.course_slug || "Chưa map khóa học", orderCode: String(row.order_code ?? row.id) }]));
  const studentContact = cleanContactId || undefined;

  const tasksRowsResult = taskRows as { data: Array<Record<string, unknown>> | null; error: unknown } | undefined;
  const notesRowsResult = noteRows as { data: Array<Record<string, unknown>> | null; error: unknown } | undefined;
  const studentNotesRowsResult = studentNoteRows as { data: Array<Record<string, unknown>> | null; error: unknown } | undefined;
  const orderRowsResult = orderRows as { data: Array<Record<string, unknown>> | null; error: unknown } | undefined;
  const emailRowsResult = emailRows as { data: Array<Record<string, unknown>> | undefined; error: unknown } | undefined;
  const workflowRunsRowsResult = workflowRuns as { data: Array<Record<string, unknown>> | null; error: unknown } | undefined;

  const safeTaskRows = Array.isArray(tasksRowsResult?.data) ? tasksRowsResult.data : [];
  const safeNoteRows = Array.isArray(notesRowsResult?.data) ? notesRowsResult.data : [];
  const safeStudentNoteRows = Array.isArray(studentNotesRowsResult?.data) ? studentNotesRowsResult.data : [];
  const safeOrderRows = Array.isArray(orderRowsResult?.data) ? orderRowsResult.data : [];
  const safeStudentRows = Array.isArray(studentRows.data) ? studentRows.data : [];
  const safeEmailRows = Array.isArray(emailRowsResult?.data) ? (emailRowsResult.data as Array<Record<string, unknown>>) : [];
  const safeWorkflowRows = Array.isArray(workflowRunsRowsResult?.data)
    ? (workflowRunsRowsResult.data as Array<{ id: string; workflow_id: string | null; status: string; started_at: string | null; finished_at: string | null; metadata: Record<string, unknown> | null; lead_id: string | null }>)
    : [];

  const orders: CrmOrderRow[] = (safeOrderRows).map((row) => ({
    id: String(row.id),
    orderCode: String(row.order_code ?? String(row.id)),
    contactId: studentContact,
    customer: contact.fullName,
    product: String(row.product_name || metadataText(asRecord(row.metadata), "course_title") || row.course_slug || "Chưa map khóa học"),
    value: Number(row.net_amount ?? row.amount ?? 0),
    discount: Number(row.discount_amount ?? 0),
    payment: String(row.payment_gateway ?? "unknown"),
    status: String(row.status ?? "pending"),
    source: String(row.source ?? "legacy"),
    owner: resolveOwnerName(String(row.owner_id ?? ""), ownerNameMap),
    created: formatShortDate(row.created_at),
    due: row.due_at ? formatShortDate(row.due_at) : "-",
  }));

  const students: CrmStudentRow[] = (safeStudentRows).map((row) => {
    const studentMetadata = asRecord((row as Record<string, unknown>).metadata as Record<string, unknown> | undefined);
    const lastSeen = row.last_seen_at ? String(row.last_seen_at) : "";
    const orderId = String((row as { order_id?: string | null }).order_id ?? "");
    const orderInfo = orderNameById.get(orderId);

    return {
      id: String(row.id),
      contactId: studentContact,
      student: contact.fullName,
      course: metadataText(studentMetadata, "course_title") || metadataText(studentMetadata, "course_slug") || String((row as { course_slug?: string | null }).course_slug ?? "") || orderInfo?.product || "Chưa map khóa học",
      status: String((row as { status?: string }).status ?? "active"),
      progress: `${Number(studentMetadata.progress_percent ?? 0)}%`,
      lastLearned: lastSeen ? formatRelativeActivity(lastSeen) : "-",
      engagement: getEngagementLabel(lastSeen),
      upsell: metadataText(studentMetadata, "upsell") || "-",
      owner: resolveOwnerName(String((row as { owner_id?: string }).owner_id ?? ""), ownerNameMap),
      emailCare: metadataText(studentMetadata, "email_status") || "unknown",
    };
  });

  const notes: CrmProfileNote[] = [
    ...safeNoteRows.map((row) => ({
      id: String(row.id),
      source: "lead_note" as const,
      author: resolveOwnerName(String((row as { owner_id?: string }).owner_id ?? ""), ownerNameMap),
      body: String((row.body as string) ?? ""),
      createdAt: normalizeDateLabel(row.created_at as string | undefined, "N/A"),
    })),
    ...safeStudentNoteRows.map((row) => ({
      id: String(row.id),
      source: "student_note" as const,
      author: resolveOwnerName(String((row as { owner_id?: string }).owner_id ?? ""), ownerNameMap),
      body: String((row.note as string) ?? ""),
      createdAt: normalizeDateLabel(row.created_at as string | undefined, "N/A"),
    })),
  ];

  const emailHistory: CrmProfileEmailHistory[] = (safeEmailRows).map((row) => {
    const campaigns = row.campaigns;
    const campaignName = Array.isArray(campaigns) ? campaigns[0] : campaigns;
    return {
      id: String(row.id),
      campaign: String((campaignName as { name?: string } | null)?.name ?? "Unknown campaign"),
      subject: String(row.subject ?? row.recipient_email ?? ""),
      status: String(row.bounced_at ? "bounced" : row.complained_at ? "complained" : row.status ?? "unknown"),
      sent: normalizeDateLabel(row.sent_at as string | undefined, "Chưa gửi"),
      opened: row.opened_at ? normalizeDateLabel(row.opened_at as string | undefined, "No") : "No",
      clicked: row.clicked_at ? normalizeDateLabel(row.clicked_at as string | undefined, "No") : "No",
      channel: String(row.provider ?? "crm"),
      campaignStatus: String((campaignName as { status?: string } | null)?.status ?? ""),
    };
  });

  const automationRuns: CrmProfileAutomationRun[] = (safeWorkflowRows).map((row) => {
    const workflowMetadata = asRecord((row as { metadata?: Record<string, unknown> } | undefined)?.metadata);
    return {
      id: String(row.id),
      workflow: workflowNameById.get(String((row as { workflow_id?: string | null }).workflow_id ?? "")) ?? "Unknown workflow",
      status: normalizeAutomationStatus(String((row as { status?: string } | undefined)?.status ?? "pending")),
      step: metadataText(workflowMetadata, "step") || "Trigger + evaluate",
      started: normalizeDateLabel((row as { started_at?: string }).started_at, "Not started"),
      finished: row.finished_at ? normalizeDateLabel((row as { finished_at?: string }).finished_at, "Pending") : "Pending",
    };
  });

  const tasks: CrmProfileTask[] = (safeTaskRows).map((row) => {
    return {
      id: String(row.id),
      title: String((row as { title?: string }).title ?? "Task"),
      status: normalizeProfileTaskStatus(String((row as { status?: string }).status ?? "open")),
      priority: normalizeProfileTaskPriority(String((row as { priority?: string }).priority ?? "normal")),
      due: normalizeDateLabel(row.due_at as string | undefined, "-"),
      owner: resolveOwnerName(String((row as { owner_id?: string }).owner_id ?? ""), ownerNameMap),
      leadId,
    };
  });


  return {
    contact,
    lead,
    events: events.length ? events : demoEvents,
    orders,
    students,
    notes,
    emailHistory,
    automationRuns,
    tasks,
  };
}

export async function recordCrmEmailWebhookEvent(event: {
  provider: string;
  type: string;
  providerEventId?: string;
  providerMessageId?: string;
  recipient?: string;
  occurredAt: string;
  payload: unknown;
}) {
  if (!canQueryLiveCrmV2()) return { ok: true, skipped: true };
  const client = createSupabaseAdminClient();
  if (!client) return { ok: true, skipped: true };

  const { error: webhookError } = await client.schema("crm_v2").from("webhook_events").insert({
    provider: event.provider,
    event_type: event.type,
    event_id: event.providerEventId ?? event.providerMessageId ?? null,
    payload: asJson(event.payload),
    status: "received",
    processed_at: new Date().toISOString(),
  });

  if (webhookError) return { ok: false, skipped: false, error: webhookError.message };

  const emailSend = await findEmailSendForWebhookEvent(client, event.providerMessageId);
  const contactId = await resolveEmailEventContactId(client, emailSend?.contact_id, event.recipient);
  const emailEventResult = await insertEmailEventFromWebhook(client, event, emailSend?.id ?? null, contactId);
  if (!emailEventResult.ok) return { ok: false, skipped: false, error: emailEventResult.error };

  const sendUpdateResult = emailSend?.id ? await updateEmailSendFromWebhook(client, emailSend.id, event) : { ok: true };
  if (!sendUpdateResult.ok) return { ok: false, skipped: false, error: sendUpdateResult.error };

  const suppressionResult = await applyEmailSuppressionFromWebhook(client, event, contactId);
  if (!suppressionResult.ok) return { ok: false, skipped: false, error: suppressionResult.error };

  const crmEventResult = contactId
    ? await insertCrmEventFromWebhook(client, event, contactId, emailEventResult.emailEventId ?? null)
    : { ok: true };

  return { ok: crmEventResult.ok, skipped: false, error: crmEventResult.error };
}

async function findEmailSendForWebhookEvent(client: ReturnType<typeof createSupabaseAdminClient>, providerMessageId?: string) {
  if (!client || !providerMessageId) return null;
  const { data, error } = await client
    .schema("crm_v2")
    .from("email_sends")
    .select("id,contact_id")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: string; contact_id: string | null } | null;
}

async function resolveEmailEventContactId(
  client: ReturnType<typeof createSupabaseAdminClient>,
  emailSendContactId?: string | null,
  recipient?: string,
) {
  if (!client) return null;
  if (emailSendContactId) return emailSendContactId;
  const normalized = normalizeEmail(recipient ?? null);
  if (!normalized) return null;

  const { data, error } = await client
    .schema("crm_v2")
    .from("contacts")
    .select("id")
    .eq("normalized_email", normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ? String(data.id) : null;
}

async function insertEmailEventFromWebhook(
  client: ReturnType<typeof createSupabaseAdminClient>,
  event: {
    provider: string;
    type: string;
    providerEventId?: string;
    providerMessageId?: string;
    occurredAt: string;
    payload: unknown;
  },
  emailSendId: string | null,
  contactId: string | null,
) {
  if (!client) return { ok: true, emailEventId: null };
  if (event.providerEventId) {
    const { data: existing, error: existingError } = await client
      .schema("crm_v2")
      .from("email_events")
      .select("id")
      .eq("provider", event.provider)
      .eq("provider_event_id", event.providerEventId)
      .maybeSingle();

    if (existingError) return { ok: false, error: existingError.message };
    if (existing?.id) return { ok: true, emailEventId: String(existing.id) };
  }

  const { data, error } = await client
    .schema("crm_v2")
    .from("email_events")
    .insert({
      email_send_id: emailSendId,
      contact_id: contactId,
      provider: event.provider,
      provider_event_id: event.providerEventId ?? null,
      event_type: normalizeEmailEventType(event.type),
      occurred_at: event.occurredAt,
      metadata: {
        provider_message_id: event.providerMessageId ?? null,
        raw_type: event.type,
        payload: asJson(event.payload),
      },
    })
    .select("id")
    .single();

  return error ? { ok: false, error: error.message } : { ok: true, emailEventId: String(data.id) };
}

async function updateEmailSendFromWebhook(
  client: ReturnType<typeof createSupabaseAdminClient>,
  emailSendId: string,
  event: { type: string; occurredAt: string },
) {
  if (!client) return { ok: true };
  const type = normalizeEmailEventType(event.type);
  const timestampPatch = getEmailSendTimestampPatch(type, event.occurredAt);
  const patch = {
    ...timestampPatch,
    status: getEmailSendStatus(type),
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.schema("crm_v2").from("email_sends").update(patch).eq("id", emailSendId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

async function applyEmailSuppressionFromWebhook(
  client: ReturnType<typeof createSupabaseAdminClient>,
  event: { type: string; provider: string; recipient?: string; occurredAt: string; payload: unknown },
  contactId: string | null,
) {
  if (!client) return { ok: true };
  const reason = getSuppressionReason(event.type);
  if (!reason) return { ok: true };

  const normalized = normalizeEmail(event.recipient ?? null);
  if (!normalized) return { ok: true };

  const { error: suppressionError } = await client.schema("crm_v2").from("email_suppression_list").upsert({
    contact_id: contactId,
    email: event.recipient ?? null,
    normalized_email: normalized,
    reason,
    provider: event.provider,
    suppressed_at: event.occurredAt,
    metadata: { raw_type: event.type, payload: asJson(event.payload) },
  });
  if (suppressionError) return { ok: false, error: suppressionError.message };

  const contactPatch =
    reason === "unsubscribed"
      ? { unsubscribed_at: event.occurredAt, marketing_consent: false }
      : reason === "complained"
        ? { complained_at: event.occurredAt, marketing_consent: false }
        : { bounce_status: "hard_bounce", marketing_consent: false };

  if (contactId) {
    const { error: contactError } = await client.schema("crm_v2").from("contacts").update(contactPatch).eq("id", contactId);
    if (contactError) return { ok: false, error: contactError.message };
  }

  return { ok: true };
}

async function insertCrmEventFromWebhook(
  client: ReturnType<typeof createSupabaseAdminClient>,
  event: { provider: string; type: string; providerEventId?: string; providerMessageId?: string; occurredAt: string; payload: unknown },
  contactId: string,
  emailEventId: string | null,
) {
  if (!client) return { ok: true };
  const normalizedType = normalizeEmailEventType(event.type);
  const idempotencyKey = `${event.provider}:${event.providerEventId ?? event.providerMessageId ?? normalizedType}:${normalizedType}`;
  const { data: existing, error: existingError } = await client
    .schema("crm_v2")
    .from("crm_events")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingError) return { ok: false, error: existingError.message };
  if (existing?.id) return { ok: true };

  const { error } = await client.schema("crm_v2").from("crm_events").insert({
    contact_id: contactId,
    event_type: `email_${normalizedType}`,
    event_source: event.provider,
    occurred_at: event.occurredAt,
    source_table: "crm_v2.email_events",
    source_id: emailEventId,
    idempotency_key: idempotencyKey,
    metadata: {
      provider_message_id: event.providerMessageId ?? null,
      provider_event_id: event.providerEventId ?? null,
      raw_type: event.type,
      payload: asJson(event.payload),
    },
  });

  return error ? { ok: false, error: error.message } : { ok: true };
}

function normalizeEmailEventType(type: string) {
  const normalized = type.toLowerCase().replace(/^email[._-]/, "");
  if (normalized.includes("delivered")) return "delivered";
  if (normalized.includes("opened") || normalized.includes("open")) return "opened";
  if (normalized.includes("clicked") || normalized.includes("click")) return "clicked";
  if (normalized.includes("bounced") || normalized.includes("bounce")) return "bounced";
  if (normalized.includes("complained") || normalized.includes("complaint")) return "complained";
  if (normalized.includes("unsubscribed") || normalized.includes("unsubscribe")) return "unsubscribed";
  if (normalized.includes("sent")) return "sent";
  return normalized || "unknown";
}

function getEmailSendTimestampPatch(type: string, occurredAt: string) {
  if (type === "sent") return { sent_at: occurredAt };
  if (type === "delivered") return { delivered_at: occurredAt };
  if (type === "opened") return { opened_at: occurredAt };
  if (type === "clicked") return { clicked_at: occurredAt };
  if (type === "bounced") return { bounced_at: occurredAt };
  if (type === "complained") return { complained_at: occurredAt };
  return {};
}

function getEmailSendStatus(type: string) {
  if (["sent", "delivered", "opened", "clicked", "bounced", "complained", "unsubscribed"].includes(type)) return type;
  return "event_received";
}

function getSuppressionReason(type: string) {
  const normalized = normalizeEmailEventType(type);
  if (normalized === "bounced") return "hard_bounce";
  if (normalized === "complained") return "complained";
  if (normalized === "unsubscribed") return "unsubscribed";
  return null;
}

function asJson(payload: unknown) {
  if (payload && typeof payload === "object") return payload;
  return { value: payload ?? null };
}

function toTimelineTitle(eventType: string) {
  return eventType
    .replace(/^email_/i, "Email ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function metadataCourseTitle(metadata: Record<string, unknown>) {
  return (
    (metadata?.course_title as string) ??
    (metadata?.courseName as string) ??
    (metadata?.course_slug as string) ??
    (metadata?.course as string) ??
    ""
  );
}

function getCrmEventTone(eventType: string) {
  const normalized = eventType.toLowerCase();
  if (["opened", "clicked", "payment", "paid", "success", "completed", "consulting"].some((value) => normalized.includes(value))) return "green";
  if (["bounce", "complained", "failed", "disqualified", "churn", "canceled"].some((value) => normalized.includes(value))) return "red";
  if (["queued", "pending", "waiting", "created", "draft"].some((value) => normalized.includes(value))) return "blue";
  if (["call", "note", "task", "abandoned"].some((value) => normalized.includes(value))) return "purple";
  return "blue";
}

type CrmLeadActionRow = {
  id: string;
  contact_id: string | null;
  stage: string | null;
  status: string | null;
  source: string | null;
  lead_score: number | null;
  email_status: string | null;
  potential_value: number | null;
  next_action: string | null;
  last_touch_at: string | null;
  created_at: string | null;
  owner_id: string | null;
  metadata: Record<string, unknown> | null;
  contacts:
    | {
        id?: string;
        full_name?: string | null;
        email?: string | null;
        phone?: string | null;
        marketing_consent?: boolean | null;
        unsubscribed_at?: string | null;
        bounce_status?: string | null;
        complained_at?: string | null;
        metadata?: Record<string, unknown> | null;
      }
    | null
    | Array<{
        id?: string;
        full_name?: string | null;
        email?: string | null;
        phone?: string | null;
        marketing_consent?: boolean | null;
        unsubscribed_at?: string | null;
        bounce_status?: string | null;
        complained_at?: string | null;
        metadata?: Record<string, unknown> | null;
      }>;
};

type ExpandedLeadSelection = {
  selectedRows: CrmLeadActionRow[];
  expandedRows: CrmLeadActionRow[];
};

export async function bulkAssignLeadOwner(payload: Extract<CrmLeadBulkActionPayload, { action: "assign_owner" }>): Promise<CrmLeadBulkActionResult> {
  const requested = normalizeLeadIds(payload.leadIds);
  if (!requested.length) return failedEmptyBulkResult(payload.action, "leadIds is required");

  if (!canQueryLiveCrmV2()) return offlineBulkResult(payload.action, requested, "CRM v2 demo/offline mode");

  const client = createSupabaseAdminClient();
  if (!client) return offlineBulkResult(payload.action, requested, "Supabase admin client not available");

  const selection = await expandLeadRowsByContact(client, requested);
  if (!selection.selectedRows.length) return leadNotFoundBulkResult(payload.action, requested, "leadIds");

  const owner = payload.owner.trim();
  if (!owner) return failedValidationBulkResult(payload.action, requested, "owner is required");

  const results: CrmLeadBulkActionResultItem[] = [];
  const ownerId = isUuid(owner) ? owner : null;

  for (const row of selection.expandedRows) {
    const currentMetadata = asRecord(row.metadata);
    const nextMetadata = {
      ...currentMetadata,
      owner_name: owner,
      owner_updated_at: new Date().toISOString(),
      owner_updated_via: "bulk_action",
    };

    const updatePayload: Record<string, unknown> = {
      metadata: nextMetadata,
      updated_at: new Date().toISOString(),
    };

    if (ownerId) {
      updatePayload.owner_id = ownerId;
    }

    const { error } = await client.schema("crm_v2").from("leads").update(updatePayload).eq("id", row.id);

    if (error) {
      results.push({ leadId: row.id, status: "failed", reason: error.message });
      continue;
    }

    results.push({ leadId: row.id, status: "updated" });
  }

  return buildBulkResult(payload.action, requested.length, results, `Updated owner across ${selection.expandedRows.length} active leads.`);
}

export async function bulkUpdateLeadStage(payload: Extract<CrmLeadBulkActionPayload, { action: "update_stage" }>): Promise<CrmLeadBulkActionResult> {
  const requested = normalizeLeadIds(payload.leadIds);
  if (!requested.length) return failedEmptyBulkResult(payload.action, "leadIds is required");

  if (!canQueryLiveCrmV2()) return offlineBulkResult(payload.action, requested, "CRM v2 demo/offline mode");

  const client = createSupabaseAdminClient();
  if (!client) return offlineBulkResult(payload.action, requested, "Supabase admin client not available");

  const selection = await expandLeadRowsByContact(client, requested);
  if (!selection.selectedRows.length) return leadNotFoundBulkResult(payload.action, requested, "leadIds");

  const results: CrmLeadBulkActionResultItem[] = [];
  const now = new Date().toISOString();

  for (const row of selection.expandedRows) {
    const currentMetadata = asRecord(row.metadata);
    const nextMetadata = {
      ...currentMetadata,
      stage_updated_at: now,
      stage_updated_via: "bulk_action",
      stage_updated_by: "crm_v2_bulk",
    };

    const updatePayload: Record<string, unknown> = {
      stage: payload.stage,
      metadata: nextMetadata,
      updated_at: now,
    };

    if (payload.stage === "paid") {
      updatePayload.status = "won";
      updatePayload.paid_at = now;
    } else {
      updatePayload.status = "open";
    }

    const { error } = await client.schema("crm_v2").from("leads").update(updatePayload).eq("id", row.id);
    if (error) {
      results.push({ leadId: row.id, status: "failed", reason: error.message });
      continue;
    }

    results.push({ leadId: row.id, status: "updated" });
  }

  return buildBulkResult(payload.action, requested.length, results, `Updated stage across ${selection.expandedRows.length} active leads.`);
}

export async function bulkAddLeadTags(payload: Extract<CrmLeadBulkActionPayload, { action: "add_tag" }>): Promise<CrmLeadBulkActionResult> {
  const requested = normalizeLeadIds(payload.leadIds);
  if (!requested.length) return failedEmptyBulkResult(payload.action, "leadIds is required");

  const tags = normalizeTagInputs(payload.tags);
  if (!tags.length) {
    return {
      ok: true,
      action: payload.action,
      requested: requested.length,
      affected: 0,
      skipped: requested.length,
      failed: 0,
      results: requested.map((leadId) => ({ leadId, status: "skipped", reason: "tags are empty" })),
      message: "Không có tag hợp lệ.",
    };
  }

  if (!canQueryLiveCrmV2()) return offlineBulkResult(payload.action, requested, "CRM v2 demo/offline mode");

  const client = createSupabaseAdminClient();
  if (!client) return offlineBulkResult(payload.action, requested, "Supabase admin client not available");

  const selection = await expandLeadRowsByContact(client, requested);
  if (!selection.selectedRows.length) return leadNotFoundBulkResult(payload.action, requested, "leadIds");

  const tagUpsertRows = tags.map((tag) => ({ name: tag.name, slug: tag.slug, color: "blue" }));
  const { data: tagRows, error: tagError } = await client.schema("crm_v2").from("tags").upsert(tagUpsertRows, { onConflict: "slug" }).select("id,slug");
  if (tagError) {
    return {
      ok: false,
      action: payload.action,
      requested: requested.length,
      affected: 0,
      skipped: 0,
      failed: requested.length,
      results: requested.map((leadId) => ({ leadId, status: "failed", reason: tagError.message })),
      message: "Cannot upsert tags.",
    };
  }

  const tagIdMap = new Map<string, string>((tagRows ?? []).map((tag) => [tag.slug, String(tag.id)]));
  const contactTagRows: Array<{ contact_id: string; tag_id: string; added_by: null }> = [];

  for (const row of selection.expandedRows) {
    if (!row.contact_id) {
      continue;
    }

    for (const tag of tags) {
      const tagId = tagIdMap.get(tag.slug);
      if (tagId) {
        contactTagRows.push({ contact_id: row.contact_id, tag_id: tagId, added_by: null });
      }
    }
  }

  const uniqueContactTagRows = dedupeByKeys(contactTagRows, (entry) => `${entry.contact_id}|${entry.tag_id}`);
  const { error: tagLinkError } = await client
    .schema("crm_v2")
    .from("contact_tags")
    .upsert(uniqueContactTagRows, { onConflict: "contact_id,tag_id", ignoreDuplicates: true });

  if (tagLinkError) {
    return {
      ok: false,
      action: payload.action,
      requested: requested.length,
      affected: 0,
      skipped: 0,
      failed: requested.length,
      results: requested.map((leadId) => ({ leadId, status: "failed", reason: tagLinkError.message })),
      message: "Cannot link tags.",
    };
  }

  const expectedLeadSet = new Set(selection.selectedRows.map((row) => row.id));
  const results: CrmLeadBulkActionResultItem[] = requested.map((leadId) => {
    if (!expectedLeadSet.has(leadId)) return { leadId, status: "skipped", reason: "lead not found" };
    if (!selection.selectedRows.find((row) => row.id === leadId)?.contact_id) return { leadId, status: "failed", reason: "missing contact_id" };
    return { leadId, status: "updated" };
  });

  return buildBulkResult(payload.action, requested.length, results, `Linked ${uniqueContactTagRows.length} contact-tag records.`);
}

export async function bulkMarkLeadZaloMessaged(
  payload: Extract<CrmLeadBulkActionPayload, { action: "mark_zalo_messaged" }>,
): Promise<CrmLeadBulkActionResult> {
  const requested = normalizeLeadIds(payload.leadIds);
  if (!requested.length) return failedEmptyBulkResult(payload.action, "leadIds is required");

  if (!canQueryLiveCrmV2()) return offlineBulkResult(payload.action, requested, "CRM v2 demo/offline mode");

  const client = createSupabaseAdminClient();
  if (!client) return offlineBulkResult(payload.action, requested, "Supabase admin client not available");

  const resolved = await resolveZaloLeadIds(client, requested, payload);
  const publicLeadIds = resolved.publicLeadIds;
  const crmLeadIds = resolved.crmLeadIds;
  const selection = crmLeadIds.length ? await expandLeadRowsByContact(client, crmLeadIds) : { selectedRows: [], expandedRows: [] };
  const now = new Date().toISOString();
  const normalizedPhone = normalizePhone(payload.phone);
  const results: CrmLeadBulkActionResultItem[] = [];

  for (const row of selection.expandedRows) {
    const currentMetadata = asRecord(row.metadata);
    const nextMetadata = {
      ...currentMetadata,
      last_zalo_messaged_at: now,
      last_zalo_phone: normalizedPhone,
      last_zalo_action: "mark_zalo_messaged",
    };

    const { error } = await client
      .schema("crm_v2")
      .from("leads")
      .update({
        last_touch_at: now,
        next_action: "Da nhan Zalo",
        metadata: nextMetadata,
        updated_at: now,
      })
      .eq("id", row.id);

    if (error) {
      results.push({ leadId: row.id, status: "failed", reason: error.message });
      continue;
    }

    if (row.contact_id) {
      await client.schema("crm_v2").from("crm_events").insert({
        contact_id: row.contact_id,
        lead_id: row.id,
        event_type: "zalo_message_sent",
        event_source: "crm_v2_leads",
        occurred_at: now,
        idempotency_key: `${payload.idempotencyKey || makeBulkActionIdempotencyKey(payload.action, row.id, now)}:crm_event`,
        metadata: { last_zalo_messaged_at: now, phone: normalizedPhone, email: normalizeEmail(payload.email), order_code: payload.orderCode },
      });
    }

    results.push({ leadId: row.id, status: "updated" });
  }

  if (selection.selectedRows.length) {
    await bulkAddLeadTags({ action: "add_tag", leadIds: selection.selectedRows.map((row) => row.id), tags: ["da-nhan-zalo"], idempotencyKey: payload.idempotencyKey });
  }

  for (const publicLeadId of publicLeadIds) {
    const { data, error } = await client
      .from("leads")
      .update({ sale_status: "Da nhan Zalo", updated_at: now })
      .eq("id", publicLeadId)
      .select("id");
    const updated = recordArray(data).length > 0;
    results.push({ leadId: `public-lead:${publicLeadId}`, status: error ? "failed" : updated ? "updated" : "skipped", reason: error?.message || (updated ? undefined : "public lead not found") });
  }

  const handled = new Set([
    ...selection.selectedRows.map((row) => row.id),
    ...selection.expandedRows.map((row) => row.id),
    ...publicLeadIds.map((leadId) => `public-lead:${leadId}`),
    ...resolved.requestedHandled,
  ]);
  for (const leadId of requested) {
    if (!handled.has(leadId)) {
      results.push({ leadId, status: "skipped", reason: "lead not found" });
    }
  }

  if (!results.some((item) => item.status === "updated") && !results.some((item) => item.status === "failed")) {
    const fallback = await createZaloFallbackPublicLead(client, payload, now);
    if (fallback) {
      results.push(fallback);
    }
  }

  const result = buildBulkResult(payload.action, requested.length, results, `Marked ${results.filter((item) => item.status === "updated").length} lead rows as Zalo messaged.`);
  if (result.affected === 0 && result.failed === 0) {
    return {
      ...result,
      ok: false,
      message: "Khong tim thay lead de cap nhat Zalo.",
    };
  }
  return result;
}

async function createZaloFallbackPublicLead(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  payload: Extract<CrmLeadBulkActionPayload, { action: "mark_zalo_messaged" }>,
  now: string,
): Promise<CrmLeadBulkActionResultItem | null> {
  const phone = String(payload.phone ?? "").trim();
  const email = normalizeEmail(payload.email) || String(payload.email ?? "").trim();
  const orderCode = String(payload.orderCode ?? "").trim();
  if (!phone && !email && !orderCode) return null;

  const { data, error } = await client
    .from("leads")
    .insert({
      name: email || phone || orderCode || "CRM v2 Zalo",
      phone,
      email,
      message: `CRM v2 Zalo follow-up${orderCode ? ` for order ${orderCode}` : ""}`,
      source: "CRM v2 Zalo",
      status: "new",
      sale_status: "Da nhan Zalo",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return { leadId: orderCode ? `public-order:${orderCode}` : phone || email || "zalo-fallback", status: "failed", reason: error?.message || "Cannot create Zalo fallback lead" };
  }

  return { leadId: `public-lead:${String(data.id)}`, status: "updated" };
}

async function resolveZaloLeadIds(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  requested: string[],
  payload: Extract<CrmLeadBulkActionPayload, { action: "mark_zalo_messaged" }>,
) {
  const publicLeadIds = new Set(
    requested
    .filter((leadId) => leadId.startsWith("public-lead:"))
    .map((leadId) => leadId.slice("public-lead:".length))
    .filter(isUuid),
  );
  const crmLeadIds = new Set(requested.filter((leadId) => isUuid(leadId)));
  const requestedHandled = new Set<string>();
  const phones = new Set([payload.phone, normalizePhone(payload.phone)].map((value) => String(value ?? "").trim()).filter(Boolean));
  const emails = new Set<string>();
  const payloadEmail = normalizeEmail(payload.email);
  if (payloadEmail) emails.add(payloadEmail);
  const orderCodes = new Set([payload.orderCode].map((value) => String(value ?? "").trim()).filter(Boolean));
  const publicOrderTokens = requested
    .filter((leadId) => leadId.startsWith("public-order:"))
    .map((leadId) => leadId.slice("public-order:".length))
    .filter(Boolean);
  const publicOrderUuidTokens = publicOrderTokens.filter(isUuid);
  const publicOrderCodeTokens = publicOrderTokens.filter((token) => !isUuid(token));
  publicOrderCodeTokens.forEach((token) => orderCodes.add(token));

  const crmOrderQueries = [];
  if (publicOrderUuidTokens.length) {
    crmOrderQueries.push(client.schema("crm_v2").from("orders").select("id,lead_id,contact_id,order_code").in("id", publicOrderUuidTokens));
  }
  if (orderCodes.size) {
    crmOrderQueries.push(client.schema("crm_v2").from("orders").select("id,lead_id,contact_id,order_code").in("order_code", [...orderCodes]));
  }

  const crmOrderResults = await Promise.all(crmOrderQueries);
  const contactIds = new Set<string>();
  for (const result of crmOrderResults) {
    for (const row of recordArray(result.data)) {
      const leadId = String(row.lead_id ?? "");
      const contactId = String(row.contact_id ?? "");
      if (isUuid(leadId)) crmLeadIds.add(leadId);
      if (isUuid(contactId)) contactIds.add(contactId);
      if (row.order_code) orderCodes.add(String(row.order_code));
    }
  }

  const publicOrderQueries = [];
  if (publicOrderUuidTokens.length) {
    publicOrderQueries.push(client.from("orders").select("id,order_code,phone,email").in("id", publicOrderUuidTokens));
  }
  if (orderCodes.size) {
    publicOrderQueries.push(client.from("orders").select("id,order_code,phone,email").in("order_code", [...orderCodes]));
  }

  const publicOrderResults = await Promise.all(publicOrderQueries);
  for (const result of publicOrderResults) {
    for (const row of recordArray(result.data)) {
      if (row.phone) phones.add(String(row.phone));
      const email = normalizeEmail(String(row.email ?? ""));
      if (email) emails.add(email);
      if (row.order_code) orderCodes.add(String(row.order_code));
    }
  }

  for (const phone of phones) {
    const [{ data: contactByPhone }, { data: contactByNormalizedPhone }, { data: leadByPhone }] = await Promise.all([
      client.schema("crm_v2").from("contacts").select("id").eq("phone", phone).limit(20),
      client.schema("crm_v2").from("contacts").select("id").eq("normalized_phone", normalizePhone(phone)).limit(20),
      client.from("leads").select("id").eq("phone", phone).limit(20),
    ]);
    for (const row of [...recordArray(contactByPhone), ...recordArray(contactByNormalizedPhone)]) {
      const id = String(row.id ?? "");
      if (isUuid(id)) contactIds.add(id);
    }
    for (const row of recordArray(leadByPhone)) {
      const id = String(row.id ?? "");
      if (isUuid(id)) publicLeadIds.add(id);
    }
  }

  for (const email of emails) {
    const [{ data: contactByEmail }, { data: contactByNormalizedEmail }, { data: leadByEmail }] = await Promise.all([
      client.schema("crm_v2").from("contacts").select("id").eq("email", email).limit(20),
      client.schema("crm_v2").from("contacts").select("id").eq("normalized_email", email).limit(20),
      client.from("leads").select("id").ilike("email", email).limit(20),
    ]);
    for (const row of [...recordArray(contactByEmail), ...recordArray(contactByNormalizedEmail)]) {
      const id = String(row.id ?? "");
      if (isUuid(id)) contactIds.add(id);
    }
    for (const row of recordArray(leadByEmail)) {
      const id = String(row.id ?? "");
      if (isUuid(id)) publicLeadIds.add(id);
    }
  }

  if (contactIds.size) {
    const { data } = await client.schema("crm_v2").from("leads").select("id").in("contact_id", [...contactIds]);
    for (const row of recordArray(data)) {
      const id = String(row.id ?? "");
      if (isUuid(id)) crmLeadIds.add(id);
    }
  }

  if (crmLeadIds.size || publicLeadIds.size) {
    for (const leadId of requested) {
      if (leadId.startsWith("public-order:")) requestedHandled.add(leadId);
    }
  }

  return { crmLeadIds: [...crmLeadIds], publicLeadIds: [...publicLeadIds], requestedHandled };
}

export async function bulkQueueMarketingEmails(
  payload: Extract<CrmLeadBulkActionPayload, { action: "send_email" }>,
): Promise<CrmLeadBulkActionResult> {
  const requested = normalizeLeadIds(payload.leadIds);
  if (!requested.length) return failedEmptyBulkResult(payload.action, "leadIds is required");
  if (!canQueryLiveCrmV2()) return offlineBulkResult(payload.action, requested, "CRM v2 demo/offline mode");

  const client = createSupabaseAdminClient();
  if (!client) return offlineBulkResult(payload.action, requested, "Supabase admin client not available");

  const selection = await expandLeadRowsByContact(client, requested);
  if (!selection.selectedRows.length) return leadNotFoundBulkResult(payload.action, requested, "leadIds");

  const subject = payload.subject?.trim() || "CRM V2 follow-up";
  const results: CrmLeadBulkActionResultItem[] = [];
  const now = new Date().toISOString();
  const provider = getEmailProvider();
  const baseKey = payload.idempotencyKey || `crm-v2-send-${subject}-${payload.templateId || "template"}`;
  const providerName = process.env.RESEND_API_KEY ? "resend" : "mock";

  for (const row of selection.expandedRows) {
    const leadId = row.id;
    const contact = asArrayLike(row.contacts)[0];
    if (!contact?.email) {
      results.push({ leadId, status: "skipped", reason: "missing email" });
      continue;
    }

    const contactMeta = {
      email: contact.email,
      marketing_consent: contact.marketing_consent ?? true,
      unsubscribed_at: contact.unsubscribed_at ?? null,
      bounce_status: contact.bounce_status ?? null,
      complained_at: contact.complained_at ?? null,
    };
    if (!canSendMarketingEmail(contactMeta)) {
      results.push({ leadId, status: "skipped", reason: "contact blocked from marketing" });
      continue;
    }

    const idempotencyKey = makeBulkActionIdempotencyKey("send_email", leadId, baseKey);
    const { data: existing, error: existingError } = await client
      .schema("crm_v2")
      .from("email_sends")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingError) {
      results.push({ leadId, status: "failed", reason: existingError.message });
      continue;
    }

    if (existing?.id) {
      results.push({ leadId, status: "skipped", reason: "already queued" });
      continue;
    }

    const { error: insertError } = await client.schema("crm_v2").from("email_sends").insert({
      campaign_id: null,
      template_id: isUuid(payload.templateId || "") ? payload.templateId : null,
      contact_id: row.contact_id,
      provider: providerName,
      recipient_email: contact.email,
      status: "queued",
      subject,
      idempotency_key: idempotencyKey,
      metadata: {
        source: "bulk_action",
        subject,
        template_id: payload.templateId ?? null,
      },
      created_at: now,
      updated_at: now,
    });
    if (insertError) {
      results.push({ leadId, status: "failed", reason: insertError.message });
      continue;
    }

    await provider.sendMarketingEmail({
      to: [{ email: contact.email, name: String(contact.full_name ?? "") }],
      subject,
      html: `<p>CRM V2 bulk follow-up email.</p>`,
      text: "CRM V2 bulk follow-up email.",
      idempotencyKey,
      metadata: { lead_id: leadId, contact_id: row.contact_id, source: "bulk_action" },
    });

    results.push({ leadId, status: "updated" });
  }

  return buildBulkResult(payload.action, requested.length, results, `Queued marketing email across ${selection.expandedRows.length} active leads.`);
}

export async function bulkAddWorkflowRuns(
  payload: Extract<CrmLeadBulkActionPayload, { action: "add_workflow" }>,
): Promise<CrmLeadBulkActionResult> {
  const requested = normalizeLeadIds(payload.leadIds);
  if (!requested.length) return failedEmptyBulkResult(payload.action, "leadIds is required");
  if (!isUuid(payload.workflowId)) return failedValidationBulkResult(payload.action, requested, "workflowId is invalid");

  if (!canQueryLiveCrmV2()) return offlineBulkResult(payload.action, requested, "CRM v2 demo/offline mode");
  const client = createSupabaseAdminClient();
  if (!client) return offlineBulkResult(payload.action, requested, "Supabase admin client not available");

  const { data: workflow, error: workflowError } = await client
    .schema("crm_v2")
    .from("workflows")
    .select("id,active_version_id")
    .eq("id", payload.workflowId)
    .eq("status", "active")
    .maybeSingle();

  if (workflowError || !workflow?.active_version_id) {
    return {
      ok: false,
      action: payload.action,
      requested: requested.length,
      affected: 0,
      skipped: 0,
      failed: requested.length,
      results: requested.map((leadId) => ({ leadId, status: "failed", reason: workflowError?.message || "workflow is missing active version" })),
      message: "Workflow chưa active hoặc chưa có active version.",
    };
  }

  const selection = await expandLeadRowsByContact(client, requested);
  if (!selection.selectedRows.length) return leadNotFoundBulkResult(payload.action, requested, "leadIds");

  const results: CrmLeadBulkActionResultItem[] = [];

  for (const row of selection.expandedRows) {
    const leadId = row.id;
    const idempotencyKey = makeBulkActionIdempotencyKey("add_workflow", leadId, payload.workflowId);
    const { data: existing, error: existsError } = await client
      .schema("crm_v2")
      .from("workflow_runs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existsError) {
      results.push({ leadId, status: "failed", reason: existsError.message });
      continue;
    }

    if (existing?.id) {
      results.push({ leadId, status: "skipped", reason: "workflow run already exists" });
      continue;
    }

    const { data: run, error } = await client
      .schema("crm_v2")
      .from("workflow_runs")
      .insert({
        workflow_id: workflow.id,
        workflow_version_id: workflow.active_version_id,
        contact_id: row.contact_id,
        lead_id: leadId,
        status: "pending",
        idempotency_key: idempotencyKey,
        metadata: {
          source: "bulk_action",
        },
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !run?.id) {
      results.push({ leadId, status: "failed", reason: error?.message ?? "workflow run was not created" });
      continue;
    }

    const stepResult = await createWorkflowStepRunsForRun({
      client,
      workflowRunId: String(run.id),
      workflowVersionId: String(workflow.active_version_id),
    });
    if (!stepResult.ok) {
      results.push({ leadId, status: "failed", reason: stepResult.message });
      continue;
    }

    results.push({ leadId, status: "updated" });
  }

  return buildBulkResult(payload.action, requested.length, results, `Workflow run created across ${selection.expandedRows.length} active leads.`);
}

export async function exportLeadsCsv(payload: Extract<CrmLeadBulkActionPayload, { action: "export_csv" }>): Promise<CrmLeadExportResult> {
  const requested = normalizeLeadIds(payload.leadIds);
  const filename =
    payload.filename?.trim() || `crm-v2-leads-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

  if (!requested.length) {
    return {
      filename,
      rows: 0,
      requested: 0,
      csv: "id,contact_id,name,email,phone,source,course,stage,lead_score,email_status,next_action,potential_value,owner,created_at\n",
    };
  }

  if (!canQueryLiveCrmV2()) {
    return { filename, rows: 0, requested: requested.length, csv: "id,contact_id,name,email,phone,source,course,stage,lead_score,email_status,next_action,potential_value,owner,created_at\n" };
  }

  const client = createSupabaseAdminClient();
  if (!client) {
    return { filename, rows: 0, requested: requested.length, csv: "id,contact_id,name,email,phone,source,course,stage,lead_score,email_status,next_action,potential_value,owner,created_at\n" };
  }

  const rows = (await expandLeadRowsByContact(client, requested)).expandedRows;
  const header = [
    "id",
    "contact_id",
    "name",
    "email",
    "phone",
    "source",
    "course",
    "stage",
    "lead_score",
    "email_status",
    "next_action",
    "potential_value",
    "owner",
    "created_at",
  ];

  const body = rows
    .map((row) => {
      const metadata = asRecord(row.metadata);
      const contact = asArrayLike(row.contacts)[0] as Record<string, unknown> | undefined;
      const owner = metadataText(metadata, "owner_name");
      return [
        escapeCsv(String(row.id)),
        escapeCsv(String(row.contact_id ?? "")),
        escapeCsv(String(contact?.full_name ?? "")),
        escapeCsv(String(contact?.email ?? "")),
        escapeCsv(String(contact?.phone ?? "")),
        escapeCsv(String(row.source ?? "")),
        escapeCsv(metadataText(metadata, "course_title") || metadataText(metadata, "course")),
        escapeCsv(String(row.stage ?? "")),
        escapeCsv(String(row.lead_score ?? 0)),
        escapeCsv(String(row.email_status ?? "")),
        escapeCsv(String(row.next_action ?? "")),
        escapeCsv(String(row.potential_value ?? 0)),
        escapeCsv(owner),
        escapeCsv(String(row.created_at ?? "")),
      ].join(",");
    })
    .join("\n");

  return {
    filename,
    rows: rows.length,
    requested: requested.length,
    csv: `${header.map(escapeCsv).join(",")}\n${body}`,
  };
}

function buildBulkResult(action: CrmLeadBulkAction, requested: number, results: CrmLeadBulkActionResultItem[], message?: string): CrmLeadBulkActionResult {
  const affected = results.filter((result) => result.status === "updated").length;
  const skipped = results.filter((result) => result.status === "skipped").length;
  const failed = results.filter((result) => result.status === "failed").length;
  return {
    ok: requested > 0 && failed === 0,
    action,
    requested,
    affected,
    skipped,
    failed,
    results,
    message,
  };
}

function failedValidationBulkResult(action: CrmLeadBulkAction, requested: string[], reason: string): CrmLeadBulkActionResult {
  return {
    ok: false,
    action,
    requested: requested.length,
    affected: 0,
    skipped: 0,
    failed: requested.length,
    results: requested.map((leadId) => ({ leadId, status: "failed", reason })),
    message: reason,
  };
}

function failedEmptyBulkResult(action: CrmLeadBulkAction, reason: string): CrmLeadBulkActionResult {
  return {
    ok: false,
    action,
    requested: 0,
    affected: 0,
    skipped: 0,
    failed: 1,
    results: [{ leadId: "", status: "failed", reason }],
    message: reason,
  };
}

function leadNotFoundBulkResult(action: CrmLeadBulkAction, requested: string[], reason: string): CrmLeadBulkActionResult {
  return {
    ok: false,
    action,
    requested: requested.length,
    affected: 0,
    skipped: 0,
    failed: requested.length,
    results: requested.map((leadId) => ({ leadId, status: "failed", reason })),
    message: `Không tìm thấy dữ liệu cho ${reason}`,
  };
}

function offlineBulkResult(action: CrmLeadBulkAction, requested: string[], reason: string): CrmLeadBulkActionResult {
  return {
    ok: true,
    action,
    requested: requested.length,
    affected: 0,
    skipped: requested.length,
    failed: 0,
    results: requested.map((leadId) => ({ leadId, status: "skipped", reason })),
    message: reason,
  };
}

function normalizeLeadIds(leadIds: string[]) {
  return [...new Set((leadIds ?? []).map((id) => String(id).trim()).filter(Boolean))];
}

function normalizeTagInputs(tags: string[]) {
  const result = new Map<string, { name: string; slug: string }>();
  for (const tag of tags) {
    const slug = slugifyTag(tag);
    if (!slug) continue;
    result.set(slug, { name: tag.trim().slice(0, 80), slug });
  }
  return [...result.values()];
}

function slugifyTag(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function makeBulkActionIdempotencyKey(action: string, leadId: string, source: string) {
  return createHash("sha256").update(`${action}|${leadId}|${source}`).digest("hex");
}

function dedupeByKeys<T>(items: T[], keyOf: (item: T) => string) {
  const values = new Map<string, T>();
  items.forEach((item) => values.set(keyOf(item), item));
  return [...values.values()];
}

async function findLeadRowsByIds(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, leadIds: string[]) {
  const ids = normalizeLeadIds(leadIds).filter(isUuid);
  if (!ids.length) return [] as CrmLeadActionRow[];

  const { data, error } = await client
    .schema("crm_v2")
    .from("leads")
    .select("id,contact_id,stage,status,source,lead_score,email_status,potential_value,next_action,last_touch_at,metadata,course_id,course_slug,owner_id,created_at,contacts(full_name,email,phone,marketing_consent,unsubscribed_at,bounce_status,complained_at,metadata)")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  return data as CrmLeadActionRow[];
}

async function expandLeadRowsByContact(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, leadIds: string[]): Promise<ExpandedLeadSelection> {
  const selectedRows = await findLeadRowsByIds(client, leadIds);
  if (!selectedRows.length) {
    return { selectedRows: [], expandedRows: [] };
  }

  const contactIds = Array.from(new Set(selectedRows.map((row) => String(row.contact_id ?? "")).filter(isUuid)));
  if (!contactIds.length) {
    return { selectedRows, expandedRows: selectedRows };
  }

  const { data, error } = await client
    .schema("crm_v2")
    .from("leads")
    .select("id,contact_id,stage,status,source,lead_score,email_status,potential_value,next_action,last_touch_at,metadata,course_id,course_slug,owner_id,created_at,contacts(full_name,email,phone,marketing_consent,unsubscribed_at,bounce_status,complained_at,metadata)")
    .in("contact_id", contactIds)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return { selectedRows, expandedRows: selectedRows };
  }

  return {
    selectedRows,
    expandedRows: data as CrmLeadActionRow[],
  };
}

function asArrayLike<T>(value: T | T[] | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function escapeCsv(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

export function getDemoRows() {
  return {
    leads: demoLeads,
    contacts: demoContacts,
    events: demoEvents,
  };
}

function getDemoSegmentPreviewRows() {
  return demoLeads.map((lead) => ({
    lead_score: lead.leadScore,
    tags: lead.tags,
    source: lead.source,
    stage: lead.stage,
    email_status: lead.emailStatus,
    potential_value: lead.potentialValue,
  }));
}

async function fetchLatestSegmentRules(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, segmentIds: string[]) {
  const ids = Array.from(new Set(segmentIds.filter(Boolean)));
  const ruleMap = new Map<string, string>();

  if (!ids.length) {
    return ruleMap;
  }

  const { data, error } = await client
    .schema("crm_v2")
    .from("segment_rules")
    .select("segment_id,version,description,rules,updated_at")
    .in("segment_id", ids)
    .order("version", { ascending: false });

  if (error || !data) {
    return ruleMap;
  }

  for (const row of data) {
    const segmentId = String((row as { segment_id?: string | null }).segment_id ?? "");
    if (!segmentId) continue;
    if (ruleMap.has(segmentId)) continue;

    const rules = asRecord((row as { rules?: unknown }).rules);
    const summary = buildSegmentRuleSummary(rules);
    const fallback = String((row as { description?: string | null }).description ?? "");
    ruleMap.set(segmentId, summary || fallback || "No rule loaded");
  }

  return ruleMap;
}

async function countWorkflowRuns(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, workflowIds: string[]) {
  const ids = Array.from(new Set(workflowIds.filter(isUuid)));
  const countByWorkflow = new Map<string, number>();

  if (!ids.length) {
    return countByWorkflow;
  }

  const { data, error } = await client
    .schema("crm_v2")
    .from("workflow_runs")
    .select("workflow_id")
    .in("workflow_id", ids)
    .not("workflow_id", "is", null);

  if (error || !data) return countByWorkflow;

  for (const row of data) {
    const workflowId = String((row as { workflow_id?: string | null }).workflow_id ?? "");
    if (!workflowId) continue;
    countByWorkflow.set(workflowId, (countByWorkflow.get(workflowId) ?? 0) + 1);
  }

  return countByWorkflow;
}

function normalizeWorkflowStatus(
  status: string,
): "error" | "active" | "draft" | "paused" | "archived" | "success" | "pending" | "open" {
  if (status === "active" || status === "draft" || status === "paused" || status === "archived" || status === "success") return status;
  if (status === "pending" || status === "open") return "pending";
  if (status === "error" || status === "failed") return "error";
  return "draft";
}

async function fetchSegmentNameMap(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, segmentIds: string[]) {
  const ids = Array.from(new Set(segmentIds.filter(Boolean)));
  const segmentNameById = new Map<string, string>();

  if (!ids.length) return segmentNameById;

  const { data, error } = await client
    .schema("crm_v2")
    .from("segments")
    .select("id,name")
    .in("id", ids);

  if (error || !data) return segmentNameById;

  for (const row of data) {
    segmentNameById.set(String((row as { id?: string | null }).id ?? ""), String((row as { name?: string | null }).name ?? ""));
  }

  return segmentNameById;
}

async function fetchOwnerNameMap(_client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, ownerIds: string[]) {
  const ids = Array.from(new Set(ownerIds.filter(Boolean)));
  const ownerNameById = new Map<string, string>();

  if (!ids.length) return ownerNameById;

  const ownerMembers = await listAdminMembers();
  for (const member of ownerMembers.members) {
    ownerNameById.set(member.id, member.name || member.email);
  }

  for (const ownerId of ids) {
    if (!ownerNameById.has(ownerId) && ownerId) ownerNameById.set(ownerId, ownerId);
  }

  return ownerNameById;
}

function campaignTypeLabel(campaignType: string) {
  const normalized = campaignType.toLowerCase().trim();
  if (normalized.includes("ab") && normalized.includes("test")) return "A/B Test";
  if (normalized === "drip") return "Drip";
  if (normalized === "broadcast") return "Broadcast";
  if (normalized.includes("cart")) return "Cart recovery";
  if (normalized.includes("sequence")) return "Sequence";
  if (normalized.includes("remarketing")) return "Remarketing";
  return normalized ? campaignType : "Broadcast";
}

function formatCampaignSendTime(scheduledAt: string, sentAt: string) {
  const dateSource = sentAt || scheduledAt;
  if (!dateSource) return "Chưa đặt";

  const normalized = new Date(dateSource);
  if (Number.isNaN(normalized.getTime())) return dateSource;

  const formatted = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(normalized);
  return sentAt ? `${formatted} (đã gửi)` : formatted;
}

function toPercentLabel(value: unknown) {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return "0";
  const percent = numberValue <= 1 ? numberValue * 100 : numberValue;
  return Number.isInteger(percent) ? `${percent}` : `${Math.round(percent * 10) / 10}`;
}

function formatIntWithDot(value: number | string) {
  const normalized = Number(value ?? 0);
  if (!Number.isFinite(normalized)) return "0";
  return new Intl.NumberFormat("de-DE").format(Math.round(normalized));
}

function formatMoney(value: number) {
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized)) return "0đ";
  if (normalized >= 1_000_000) return `${new Intl.NumberFormat("de-DE").format(Math.round(normalized / 1_000_000))}tr`;
  if (normalized >= 1000) return `${new Intl.NumberFormat("de-DE").format(Math.round(normalized / 1000))}k`;
  return `${new Intl.NumberFormat("de-DE").format(Math.round(normalized))}đ`;
}

function formatExactVnd(value: number) {
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized)) return "0đ";
  return `${new Intl.NumberFormat("de-DE").format(normalized)}đ`;
}

async function buildReportAttributionRows(client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, query: CrmListQuery): Promise<ReportAttributionSnapshot> {
  const dateRange = getCrmDateRange(query);
  const lowerBound = dateLowerBound(dateRange.from);
  const upperBound = dateUpperBoundExclusive(dateRange.to);

  const [leadRowsResult, orderRowsResult] = await Promise.all([
    client
      .schema("crm_v2")
      .from("leads")
      .select("source,status,stage,created_at")
      .gte("created_at", lowerBound)
      .lt("created_at", upperBound)
      .limit(10000),
    client
      .from("orders")
      .select("utm_source,status,payment_status,amount,created_at,paid_at,course_slug,product_name")
      .or(`paid_at.gte.${lowerBound},created_at.gte.${lowerBound}`)
      .limit(10000),
  ]);

  if (leadRowsResult.error && orderRowsResult.error) return { rows: [], dailyRevenue: [] };

  const aggregate = new Map<
    string,
    {
      leads: number;
      mql: number;
      paid: number;
      revenue: number;
      emailRevenue: number;
    }
  >();

  const leadMqlStatuses = new Set(["high_intent", "consulting", "paid"]);
  const paidStatuses = new Set(["paid", "success", "completed"]);

  for (const row of leadRowsResult.data ?? []) {
    const source = String((row as { source?: string | null }).source ?? "Khác");
    const state = String((row as { stage?: string | null; status?: string | null }).stage || (row as { status?: string | null }).status || "lead");
    const current = aggregate.get(source) ?? { leads: 0, mql: 0, paid: 0, revenue: 0, emailRevenue: 0 };

    current.leads += 1;
    if (leadMqlStatuses.has(state)) current.mql += 1;
    if (state === "paid") current.paid += 1;

    aggregate.set(source, current);
  }

  for (const row of orderRowsResult.data ?? []) {
    const source = String(
      (row as { utm_source?: string | null; course_slug?: string | null; product_name?: string | null }).utm_source ||
        (row as { course_slug?: string | null }).course_slug ||
        (row as { product_name?: string | null }).product_name ||
        "Khác",
    );
    const status = String((row as { status?: string | null; payment_status?: string | null }).status ?? (row as { payment_status?: string | null }).payment_status ?? "").toLowerCase();
    const metricAt = String(
      paidStatuses.has(status)
        ? ((row as { paid_at?: string | null; created_at?: string | null }).paid_at ?? (row as { created_at?: string | null }).created_at ?? "")
        : ((row as { created_at?: string | null }).created_at ?? ""),
    );
    if (!isTimestampInCrmDateRange(metricAt, dateRange)) continue;
    const current = aggregate.get(source) ?? { leads: 0, mql: 0, paid: 0, revenue: 0, emailRevenue: 0 };
    const revenue = Number((row as { amount?: number | null }).amount ?? 0);

    if (paidStatuses.has(status)) {
      current.paid += 1;
      current.revenue += revenue;
    }
    aggregate.set(source, current);
  }

  const rows = Array.from(aggregate.entries())
    .map(([channel, stats]) => ({
      id: channel,
      channel,
      leads: stats.leads,
      mql: stats.mql,
      paid: stats.paid,
      cr: stats.leads > 0 ? `${Math.round((stats.paid / stats.leads) * 1000) / 10}%` : "0%",
      revenue: stats.revenue,
      cac: stats.paid > 0 ? `${formatIntWithDot(stats.revenue / Math.max(stats.paid, 1))}K` : "0",
      roi: stats.paid > 0 ? `${(stats.revenue / Math.max(stats.paid, 1)).toFixed(1)}x` : "n/a",
      emailRevenue: stats.emailRevenue,
      note: "Derived từ leads/orders",
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    rows,
    dailyRevenue: buildReportDailyRevenueSeries(orderRowsResult.data ?? [], dateRange, paidStatuses),
  };
}

function buildDashboardRevenueSeries(
  rows: Array<Record<string, unknown>>,
  dateRange: ReturnType<typeof getCrmDateRange>,
): { resolution: "hour" | "day" | "week"; rows: Array<{ label: string; value: number; displayValue: string }> } {
  const series = buildAdaptiveRevenueSeries(rows, dateRange);
  return { ...series, rows: series.rows.map((row) => ({ ...row, displayValue: formatExactVnd(row.value) })) };
}

function buildReportDailyRevenueSeries(
  rows: unknown[],
  dateRange: ReturnType<typeof getCrmDateRange>,
  paidStatuses: Set<string>,
): Array<{ label: string; value: number }> {
  const revenueByDate = new Map<string, number>();
  for (const date of enumerateCrmDates(dateRange.from, dateRange.to)) {
    revenueByDate.set(date, 0);
  }

  for (const rawRow of rows) {
    const row = asRecord(rawRow);
    const status = String(row.status ?? row.payment_status ?? "").toLowerCase();
    if (!paidStatuses.has(status)) continue;

    const metricAt = String(row.paid_at ?? row.created_at ?? "");
    const dateKey = timestampToCrmDateKey(metricAt);
    if (!dateKey || !revenueByDate.has(dateKey)) continue;

    revenueByDate.set(dateKey, (revenueByDate.get(dateKey) ?? 0) + numericValue(row.amount));
  }

  return [...revenueByDate.entries()].map(([date, value]) => ({ label: date.slice(5), value }));
}

function enumerateCrmDates(from: string, to: string) {
  const dates: string[] = [];
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  let cursor = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const end = Date.UTC(toYear, toMonth - 1, toDay);

  while (Number.isFinite(cursor) && cursor <= end) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }

  return dates;
}

function isTimestampInCrmDateRange(value: string, dateRange: ReturnType<typeof getCrmDateRange>) {
  const dateKey = timestampToCrmDateKey(value);
  return Boolean(dateKey && dateKey >= dateRange.from && dateKey <= dateRange.to);
}

function timestampToCrmDateKey(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

function deriveReportAttributionRowsFromDashboard(
  dashboard: CrmDashboardData,
  summary: NonNullable<CrmDashboardData["reportSummary"]>,
): CrmReportAttributionRow[] {
  const totalSourceLeads = dashboard.sources.reduce((sum, source) => sum + source.value, 0);
  if (totalSourceLeads <= 0) return [];

  return dashboard.sources.map((source, index) => {
    const share = source.value / totalSourceLeads;
    const paid = Math.round(summary.paidOrders * share);
    const revenue = Math.round(summary.revenue * share);
    const emailRevenue = Math.round(summary.emailRevenue * share);
    const mql = Math.round(summary.mql * share);

    return {
      id: `dashboard_source_${index}_${source.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      channel: source.label,
      leads: source.value,
      mql,
      paid,
      cr: source.value > 0 ? `${Math.round((paid / source.value) * 1000) / 10}%` : "0%",
      revenue,
      cac: paid > 0 ? `${formatIntWithDot(Math.round(revenue / Math.max(paid, 1) / 1_000))}K` : "0K",
      roi: paid > 0 ? `${(revenue / Math.max(paid, 1)).toFixed(1)}x` : "0x",
      emailRevenue,
      note: "Tổng hợp từ nguồn lead live",
    };
  });
}

function buildSegmentRuleSummary(rules: Record<string, unknown>) {
  const conditions = Array.isArray(rules.conditions) ? rules.conditions : [];
  const combinator = String(rules.combinator ?? "and").toLowerCase();
  if (!conditions.length) return "";

  const normalized = conditions
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const condition = item as { field?: string; operator?: string; value?: unknown };
      const value = condition.value == null ? "" : String(condition.value);
      return `${condition.field ?? ""} ${condition.operator ?? ""} ${value}`.trim();
    })
    .filter(Boolean)
    .join(` ${combinator.toUpperCase()} `);

  return normalized || "";
}
