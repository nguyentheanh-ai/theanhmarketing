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
  paymentStatus: "Đã thanh toán" | "Chờ thanh toán";
  courseTitles: string[];
  courseSlugs: string[];
  paidOrderCodes: string[];
  pendingOrderCodes: string[];
  source: string;
  note: string;
  updatedAt: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function getStudentKey(input: { email?: string; phone?: string; name?: string }) {
  const email = normalizeEmail(input.email ?? "");
  const phone = normalizePhone(input.phone ?? "");

  if (email) {
    return `email:${email}`;
  }

  if (phone) {
    return `phone:${phone}`;
  }

  return `name:${(input.name ?? "hoc-vien").trim().toLowerCase()}`;
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
  record.updatedAt = order.paidAt ?? order.createdAt ?? record.updatedAt;

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
  record.updatedAt = record.updatedAt || lead.createdAt || "";
}

export async function getStudentAccessRecords() {
  const [orders, leads] = await Promise.all([
    getPaymentOrders({ includeFallback: false }),
    getLeads({ includeFallback: false }),
  ]);
  const records = new Map<string, StudentAccessRecord>();

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

  for (const lead of leads.filter((item) => item.source.startsWith("admin-student"))) {
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

  return Array.from(records.values()).sort((a, b) => {
    if (a.accessStatus !== b.accessStatus) {
      return a.accessStatus === "Có quyền học" ? -1 : 1;
    }

    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
}
