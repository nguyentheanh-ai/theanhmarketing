import type { StudentAccessRecord } from "@/services/studentAccessService";

export type SalesCustomer = Pick<StudentAccessRecord, "id" | "name" | "email" | "phone" | "source" | "note" | "registeredAt" | "updatedAt" | "courseSlugs" | "courseTitles" | "paidOrderCodes" | "pendingOrderCodes">;
export type SalesFilters = {
  q: string; from: string; to: string; dateField: "registeredAt" | "updatedAt";
  status: "all" | "paid" | "unpaid";
  course: string; source: string; contact: "all" | "email" | "phone" | "missing";
  sort: "newest" | "oldest" | "name";
};
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" });
export function vietnamDay(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dayFormatter.format(date);
}
export function datePreset(preset: string, today: string) {
  const shift = (days: number) => new Date(Date.parse(`${today}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  if (preset === "all") return { from: "", to: "" };
  if (preset === "yesterday") return { from: shift(-1), to: shift(-1) };
  return { from: preset === "7d" ? shift(-6) : preset === "30d" ? shift(-29) : today, to: today };
}
function validDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function initialSalesFilters(params: Record<string, string | string[] | undefined>, today: string): SalesFilters {
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const range = value("range") === "all" ? { from: "", to: "" } : datePreset("today", today);
  return {
    q: value("q"), from: validDay(value("from")) ? value("from") : range.from, to: validDay(value("to")) ? value("to") : range.to,
    dateField: value("dateField") === "updatedAt" ? "updatedAt" : "registeredAt",
    status: ["paid", "unpaid"].includes(value("status")) ? value("status") as SalesFilters["status"] : "all",
    course: value("course"), source: value("source"), contact: ["email", "phone", "missing"].includes(value("contact")) ? value("contact") as SalesFilters["contact"] : "all",
    sort: ["oldest", "name"].includes(value("sort")) ? value("sort") as SalesFilters["sort"] : "newest",
  };
}
export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
}
export function normalizeSalesPhone(value: string) {
  return value.replace(/\D/g, "").replace(/^84(?=\d{9}$)/, "0");
}
export function filterSalesCustomers(rows: SalesCustomer[], filters: SalesFilters) {
  if (filters.from && filters.to && filters.from > filters.to) return [];
  const term = normalizeSearch(filters.q);
  const phoneTerm = /^[+\d\s().-]+$/.test(term) ? normalizeSalesPhone(term) : "";
  return rows.filter((row) => {
    const day = vietnamDay(row[filters.dateField]);
    if ((filters.from && (!day || day < filters.from)) || (filters.to && (!day || day > filters.to))) return false;
    if (term && !normalizeSearch([row.name, row.email, row.phone, ...row.paidOrderCodes, ...row.pendingOrderCodes].join(" ")).includes(term) && !(phoneTerm && normalizeSalesPhone(row.phone).includes(phoneTerm))) return false;
    if (filters.status === "paid" && !row.paidOrderCodes.length) return false;
    if (filters.status === "unpaid" && row.paidOrderCodes.length > 0) return false;
    if (filters.course && !row.courseSlugs.includes(filters.course)) return false;
    if (filters.source && row.source !== filters.source) return false;
    if (filters.contact === "email" && !row.email.trim()) return false;
    if (filters.contact === "phone" && !row.phone.trim()) return false;
    if (filters.contact === "missing" && row.email.trim() && row.phone.trim()) return false;
    return true;
  }).sort((a, b) => {
    if (filters.sort === "name") return a.name.localeCompare(b.name, "vi") || a.id.localeCompare(b.id);
    const aDate = Date.parse(a[filters.dateField]); const bDate = Date.parse(b[filters.dateField]);
    if (Number.isNaN(aDate)) return Number.isNaN(bDate) ? a.id.localeCompare(b.id) : 1;
    if (Number.isNaN(bDate)) return -1;
    return (filters.sort === "oldest" ? aDate - bDate : bDate - aDate) || a.id.localeCompare(b.id);
  });
}
export function salesContacts(rows: SalesCustomer[], field: "email" | "phone") {
  const result = new Map<string, string>();
  for (const row of rows) {
    const value = row[field].trim();
    const key = field === "email" ? value.toLowerCase() : normalizeSalesPhone(value);
    if (key && !result.has(key)) result.set(key, value);
  }
  return [...result.values()];
}
export function salesPaymentStatus(row: SalesCustomer) {
  return row.paidOrderCodes.length > 0 ? "Paid" : "Unpaid";
}
const productShortNames: Record<string, string> = {
  "facebook-ads-2026": "FB Ads",
  "ebook-facebook-ads-2026": "Ebook FB",
  "tao-ai-agent-ca-nhan-x10-hieu-suat": "AI Agent X10",
  "ai-marketing-x5-hieu-suat-cong-viec": "AI MKT X5",
  "ai-agent-master-2026": "Agent Master",
  "performance-marketing-with-ai": "Perf. MKT AI",
  "bo-agent-kit-x10-hieu-suat-cong-viec": "Agent Kit",
  "bien-tri-thuc-thanh-tien": "Tri thức → Tiền",
  "ai-master-x10-hieu-suat": "AI Master X10",
  "marketing-gioi-phai-kiem-duoc-tien": "MKT kiếm tiền",
};
export function shortSalesProduct(slug: string, title: string) {
  if (productShortNames[slug]) return productShortNames[slug];
  const value = (title || slug).trim();
  if (value.length <= 20) return value;
  return value.split(/[\s-]+/).filter(Boolean).slice(0, 6).map((word) => /^\d+$/.test(word) ? word : word[0].toLocaleUpperCase("vi-VN")).join(" ");
}
export function salesProductLabels(row: SalesCustomer, catalog: { slug: string; title: string }[] = []) {
  const titles = new Map(catalog.map((course) => [course.slug, course.title]));
  return row.courseSlugs.length
    ? row.courseSlugs.map((slug) => shortSalesProduct(slug, titles.get(slug) || slug))
    : row.courseTitles.map((title) => shortSalesProduct("", title));
}
export function salesCsv(rows: SalesCustomer[], catalog: { slug: string; title: string }[] = [], dateField: SalesFilters["dateField"] = "registeredAt") {
  const cell = (value: string) => `"${(/^[\s]*[=+@\-\t\r\n]/.test(value) || /^0\d/.test(value) ? "'" : "") + value.replace(/"/g, '\"\"')}"`;
  const data = rows.map((r) => [vietnamDay(r[dateField]), r.name, r.phone, salesPaymentStatus(r), salesProductLabels(r, catalog).join("; "), r.email]);
  return "\uFEFF" + [["Ngày", "Tên", "SĐT", "Tình trạng", "Sản phẩm", "Email"], ...data].map((row) => row.map(cell).join(",")).join("\r\n");
}
