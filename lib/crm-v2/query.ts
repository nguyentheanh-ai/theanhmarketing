import type { CrmListQuery } from "./types";

const REPORT_TZ = "Asia/Ho_Chi_Minh";
const DATE_ONLY_UTC = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const DATE_ONLY_REPORT_TZ = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type CrmDateRange = {
  range: CrmListQuery["range"];
  days?: number;
  from: string;
  to: string;
};

type QueryValue = string | string[] | undefined;

export function normalizeCrmListQuery(searchParams?: Record<string, QueryValue>): CrmListQuery {
  const rawPage = Number(getFirst(searchParams?.page) ?? 1);
  const rawPageSize = Number(getFirst(searchParams?.pageSize) ?? 20);
  const allowedPageSize = rawPageSize === 10 || rawPageSize === 50 ? rawPageSize : 20;
  const range = normalizeCrmRange(getFirst(searchParams?.range));
  const dateFrom = range === "custom" ? normalizeDateInput(getFirst(searchParams?.dateFrom)) : undefined;
  const dateTo = range === "custom" ? normalizeDateInput(getFirst(searchParams?.dateTo)) : undefined;

  return {
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
    pageSize: allowedPageSize as 10 | 20 | 50,
    search: getFirst(searchParams?.q) ?? getFirst(searchParams?.search),
    sortBy: getFirst(searchParams?.sortBy),
    sortDirection: getFirst(searchParams?.sortDirection) === "asc" ? "asc" : "desc",
    range: normalizeCrmRange(range),
    dateFrom,
    dateTo,
    filters: {
      stage: getFirst(searchParams?.stage),
      source: getFirst(searchParams?.source),
      owner: getFirst(searchParams?.owner),
      course: getFirst(searchParams?.course),
      status: getFirst(searchParams?.status),
      role: getFirst(searchParams?.role),
    },
  };
}

export function getCrmDateRange(query: Pick<CrmListQuery, "range" | "dateFrom" | "dateTo">, now = new Date()): CrmDateRange {
  const range = normalizeCrmRange(query.range);
  if (range === "custom" && query.dateFrom && query.dateTo) {
    const from = normalizeDateInput(query.dateFrom);
    const to = normalizeDateInput(query.dateTo);
    if (from && to) {
      const [rangeFrom, rangeTo] = from <= to ? [from, to] : [to, from];
      return { range, from: rangeFrom, to: rangeTo };
    }
  }

  if (range === "today") {
    const today = formatDateInTimezone(now);
    return { range, days: 1, from: today, to: today };
  }

  if (range === "yesterday") {
    const today = formatDateInTimezone(now);
    const yesterday = shiftDateYmd(today, -1);
    return { range, days: 1, from: yesterday, to: yesterday };
  }

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const to = formatDateInTimezone(now);
  const from = shiftDateYmd(to, -(days - 1));
  return { range: range === "custom" ? "30d" : range, days, from, to };
}

function getFirst(value: QueryValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeCrmRange(value?: string): CrmListQuery["range"] {
  if (value === "today" || value === "yesterday" || value === "7d" || value === "30d" || value === "90d" || value === "custom") return value;
  return "30d";
}

function normalizeDateInput(value?: string) {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function formatDateInTimezone(value: Date) {
  return DATE_ONLY_REPORT_TZ.format(value);
}

function parseYmdToUtcDays(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return 0;
  return Date.UTC(year, month - 1, day);
}

function shiftDateYmd(value: string, offsetDays: number) {
  return DATE_ONLY_UTC.format(new Date(parseYmdToUtcDays(value) + offsetDays * 86_400_000));
}

export function normalizeCrmSearchTerm(search?: string) {
  return (search ?? "")
    .trim()
    .slice(0, 100)
    .replace(/[(),%*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCrmLeadSearchOrFilter(search?: string, contactIds: string[] = []) {
  const term = normalizeCrmSearchTerm(search);
  const filters: string[] = [];

  if (term) {
    filters.push(`source.ilike.%${term}%`, `stage.ilike.%${term}%`, `course_slug.ilike.%${term}%`);
  }

  const safeContactIds = contactIds.filter(isUuid);
  if (safeContactIds.length > 0) {
    filters.push(`contact_id.in.(${safeContactIds.join(",")})`);
  }

  return filters.join(",");
}

function isUuid(value: string) {
  return /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(value);
}
