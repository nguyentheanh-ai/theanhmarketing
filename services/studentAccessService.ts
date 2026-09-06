import { listAdminLmsCourses, isEnrollmentCurrentlyActive } from "@/services/lmsService";
import { getCourseAccessSlugs, getConfiguredAdminEmails, parseAccessOverrideSource } from "@/lib/course-access";
import { getActiveDeletedStudentKeys } from "@/services/adminDeletionService";
import type { LeadItem } from "@/services/leadService";
import { getLeads } from "@/services/leadService";
import type { PaymentOrder } from "@/services/orderService";
import { getPaymentOrders } from "@/services/orderService";

export type StudentAccessRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Học viên" | "Lead";
  accessStatus: "Có quyền học" | "Chưa cấp quyền";
  paymentStatus: "Đã thanh toán" | "Chờ thanh toán" | "Không có đơn thanh toán";
  accessibleCourseSlugs?: string[];
  courseTitles: string[];
  courseSlugs: string[];
  paidOrderCodes: string[];
  pendingOrderCodes: string[];
  source: string;
  note: string;
  registeredAt: string;
  progressPercent: number;
  progressNote: string;
  updatedAt: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function getStudentKey(input: { email?: string; phone?: string; name?: string; id?: string }) {
  const email = normalizeEmail(input.email ?? "");
  const phone = normalizePhone(input.phone ?? "");

  if (email) {
    return `email:${email}`;
  }

  if (phone) {
    return `phone:${phone}`;
  }

  return `record:${input.id ?? "unknown"}`;
}

function getOrderCourseSlugs(order: PaymentOrder) {
  if (order.orderItems.length > 0) {
    return order.orderItems.map((item) => item.slug).filter(Boolean);
  }

  return order.courseSlug.split(",").map((slug) => slug.trim()).filter(Boolean);
}

function getOrderCourseTitles(order: PaymentOrder) {
  if (order.orderItems.length > 0) {
    return order.orderItems.map((item) => item.title).filter(Boolean);
  }

  return order.courseTitle.split("|").map((title) => title.trim()).filter(Boolean);
}

function getEarlierDate(current: string, next: string) {
  if (!current) {
    return next;
  }

  if (!next) {
    return current;
  }

  return next.localeCompare(current) < 0 ? next : current;
}

function emptyRecord(seed: {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  note?: string;
  updatedAt?: string;
}): StudentAccessRecord {
  return {
    id: seed.id,
    name: seed.name,
    email: seed.email,
    phone: seed.phone,
    role: "Lead",
    accessStatus: "Chưa cấp quyền",
    paymentStatus: "Chờ thanh toán",
    courseTitles: [],
    courseSlugs: [],
    paidOrderCodes: [],
    pendingOrderCodes: [],
    source: seed.source,
    note: seed.note ?? "",
    registeredAt: seed.updatedAt ?? "",
    progressPercent: 0,
    progressNote: "Chưa có log học tập",
    updatedAt: seed.updatedAt ?? "",
  };
}

function mergeUnique(current: string[], next: string[]) {
  return Array.from(new Set([...current, ...next].filter(Boolean)));
}

function applyOrder(record: StudentAccessRecord, order: PaymentOrder) {
  record.name = record.name || order.studentName;
  record.email = record.email || order.email;
  record.phone = record.phone || order.phone;
  record.courseTitles = mergeUnique(record.courseTitles, getOrderCourseTitles(order));
  record.courseSlugs = mergeUnique(record.courseSlugs, getOrderCourseSlugs(order));
  record.registeredAt = getEarlierDate(record.registeredAt, order.createdAt ?? "");
  const orderUpdatedAt = order.paidAt ?? order.createdAt ?? "";
  if (orderUpdatedAt > record.updatedAt) record.updatedAt = orderUpdatedAt;

  if (order.status === "paid") {
    record.role = "Học viên";
    record.accessStatus = "Có quyền học";
    record.paymentStatus = "Đã thanh toán";
    record.paidOrderCodes = mergeUnique(record.paidOrderCodes, [order.orderCode]);
    return;
  }

  record.pendingOrderCodes = mergeUnique(record.pendingOrderCodes, [order.orderCode]);
}

function applyLead(record: StudentAccessRecord, lead: LeadItem) {
  record.name = record.name || lead.name;
  record.email = record.email || lead.email || "";
  record.phone = record.phone || lead.phone;
  record.source = record.source || lead.source;
  record.note = record.note || lead.need;
  record.registeredAt = getEarlierDate(record.registeredAt, lead.createdAt || "");
  record.updatedAt = record.updatedAt || lead.createdAt || "";
}

function getOverrideCourseTitle(lead: LeadItem) {
  const title = /^Khóa học:\s*(.+)$/im.exec(lead.need)?.[1]?.trim();
  return title || parseAccessOverrideSource(lead.source)?.courseSlug || "";
}

function applyAccessOverride(record: StudentAccessRecord, lead: LeadItem) {
  const override = parseAccessOverrideSource(lead.source);

  if (!override) {
    return;
  }

  const title = getOverrideCourseTitle(lead);
  record.name = record.name || lead.name;
  record.email = record.email || lead.email || "";
  record.phone = record.phone || lead.phone;
  record.source = "Admin access";
  record.note = lead.need || record.note;
  record.registeredAt = getEarlierDate(record.registeredAt, lead.createdAt || "");
  record.updatedAt = lead.createdAt || record.updatedAt;

  if (override.action === "grant") {
    record.role = "Học viên";
    record.accessStatus = "Có quyền học";
    record.paymentStatus = "Đã thanh toán";
    record.courseSlugs = mergeUnique(record.courseSlugs, [override.courseSlug]);
    record.courseTitles = mergeUnique(record.courseTitles, [title]);
    return;
  }

  record.courseSlugs = record.courseSlugs.filter((slug) => slug !== override.courseSlug);
  record.courseTitles = record.courseTitles.filter((courseTitle) => courseTitle !== title);

  if (record.courseSlugs.length === 0 && record.paidOrderCodes.length === 0) {
    record.role = "Lead";
    record.accessStatus = "Chưa cấp quyền";
    record.paymentStatus = "Chờ thanh toán";
  }
}

function markAdminRecord(record: StudentAccessRecord) {
  record.role = "Học viên";
  record.accessStatus = "Có quyền học";
  record.source = record.source || "Admin";
  record.note = record.note || "Admin luôn có toàn quyền học.";
}

export async function getStudentAccessRecords(options: { includeAllLeads?: boolean; strict?: boolean; deletedStudentKeys?: Set<string> } = {}) {
  const [orders, leads, activeDeletedStudentKeys, lmsCourses] = await Promise.all([
    getPaymentOrders({ includeFallback: false, strict: options.strict }),
    getLeads({ includeFallback: false, strict: options.strict }),
    options.deletedStudentKeys ? Promise.resolve(options.deletedStudentKeys) : getActiveDeletedStudentKeys({ strict: options.strict }),
    listAdminLmsCourses(),
  ]);
  const records = new Map<string, StudentAccessRecord>();
  const deletedStudentKeys = new Set([
    ...activeDeletedStudentKeys,
    ...leads.filter((item) => item.source === "admin-student-delete").map((lead) => getStudentKey(lead)),
  ]);

  for (const order of orders) {
    const key = getStudentKey(order);
    const record =
      records.get(key) ??
      emptyRecord({
        id: key,
        name: order.studentName,
        email: order.email,
        phone: order.phone,
        source: order.paymentMethod,
        updatedAt: order.createdAt,
      });

    applyOrder(record, order);
    records.set(key, record);
  }

  for (const lead of leads.filter((item) => options.includeAllLeads ? item.source !== "admin-student-delete" && !parseAccessOverrideSource(item.source) : item.source.startsWith("admin-student"))) {
    const key = getStudentKey(lead);
    const record =
      records.get(key) ??
      emptyRecord({
        id: key,
        name: lead.name,
        email: lead.email ?? "",
        phone: lead.phone,
        source: lead.source.replace("admin-student:", ""),
        note: lead.need,
        updatedAt: lead.createdAt,
      });

    applyLead(record, lead);
    records.set(key, record);
  }

  for (const lead of leads.filter((item) => parseAccessOverrideSource(item.source))) {
    const key = getStudentKey(lead);
    const record =
      records.get(key) ??
      emptyRecord({
        id: key,
        name: lead.name,
        email: lead.email ?? "",
        phone: lead.phone,
        source: "Admin access",
        note: lead.need,
        updatedAt: lead.createdAt,
      });

    applyAccessOverride(record, lead);
    const accessibleSlugs = record.email ? getCourseAccessSlugs({
      email: record.email,
      leads,
      orders,
    }) : [];

    if (accessibleSlugs.length === 0) {
      record.accessStatus = "Chưa cấp quyền";
      record.paymentStatus = "Chờ thanh toán";
    }

    records.set(key, record);
  }

  for (const course of lmsCourses) {
    for (const enrollment of course.enrollments) {
      const key = getStudentKey(enrollment);
      if (deletedStudentKeys.has(key)) continue;
      const record = records.get(key) ?? emptyRecord({ id: key, name: enrollment.studentName, email: enrollment.email, phone: enrollment.phone, source: "LMS", updatedAt: enrollment.updatedAt ?? enrollment.createdAt });
      record.courseSlugs = mergeUnique(record.courseSlugs, [course.slug]);
      record.courseTitles = mergeUnique(record.courseTitles, [course.title]);
      record.progressPercent = Math.max(record.progressPercent, enrollment.progressPercent);
      record.progressNote = "Tiến độ cao nhất trong các khóa đã đăng ký";
      if (isEnrollmentCurrentlyActive(enrollment)) record.accessibleCourseSlugs = mergeUnique(record.accessibleCourseSlugs ?? [], [course.slug]);
      records.set(key, record);
    }
  }
  for (const record of records.values()) {
    record.accessibleCourseSlugs = mergeUnique(record.accessibleCourseSlugs ?? [], record.email ? getCourseAccessSlugs({ email: record.email, leads, orders }) : []);
    record.accessStatus = record.accessibleCourseSlugs.length ? "Có quyền học" : "Chưa cấp quyền";
    if (record.accessibleCourseSlugs.length) record.role = "Học viên";
    record.paymentStatus = record.paidOrderCodes.length ? "Đã thanh toán" : record.pendingOrderCodes.length ? "Chờ thanh toán" : "Không có đơn thanh toán";
  }
  const adminEmails = new Set(getConfiguredAdminEmails());
  for (const record of records.values()) {
    if (adminEmails.has(record.email.trim().toLowerCase())) {
      markAdminRecord(record);
    }
  }

  for (const key of deletedStudentKeys) {
    records.delete(key);
  }

  return Array.from(records.values()).sort((a, b) => {
    if (a.accessStatus !== b.accessStatus) {
      return a.accessStatus === "Có quyền học" ? -1 : 1;
    }

    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
}
