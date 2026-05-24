import type { AdminDataset, Course, Lead, Order } from "./types";

export type CreateLeadInput = {
  name: string;
  email?: string;
  phone: string;
  notes?: string;
  source?: string;
  owner?: string;
  campaign?: string;
  landingPage?: string;
};

export type CreateStudentInput = CreateLeadInput & {
  courseId: string;
};

export type StudentEnrollment = {
  lead: Lead;
  order: Order;
};

function compactId(now: Date) {
  const entropy = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${now.getTime().toString(36).toUpperCase()}${entropy}`;
}

function normalizeText(value: string | undefined, fallback = "") {
  return value?.trim() || fallback;
}

function toLeadCode(now: Date) {
  return `LEAD-${now.getTime().toString().slice(-8)}`;
}

function toOrderCode(now: Date) {
  return `MANUAL-${now.getTime().toString().slice(-8)}`;
}

export function isStudentLead(lead: Lead) {
  return (
    lead.paymentStatus === "paid" ||
    lead.careStatus === "access_granted" ||
    lead.tags.some((tag) => tag.startsWith("admin-student:"))
  );
}

export function getStudentLeads(leads: Lead[]) {
  return leads.filter(isStudentLead);
}

export function getLeadRecordKey(leadId: string) {
  return leadId.replace(/^(lead|order):/, "");
}

export function formatLeadRowCode(lead: Lead, index: number) {
  const displayCode = lead.orderCode || lead.code || getLeadRecordKey(lead.id);
  return `${index + 1} - ${displayCode}`;
}

export function buildLocalLeadRecord(input: CreateLeadInput, now = new Date()): Lead {
  const id = `lead:local-${compactId(now)}`;
  const source = normalizeText(input.source, "admin-crm");

  return {
    id,
    code: toLeadCode(now),
    orderCode: "",
    name: normalizeText(input.name, "Chua co ten"),
    email: normalizeText(input.email),
    phone: normalizeText(input.phone),
    courseId: "",
    courseName: "",
    landingPage: normalizeText(input.landingPage),
    campaign: normalizeText(input.campaign),
    utmSource: source,
    paymentStatus: "unpaid",
    careStatus: "new",
    owner: normalizeText(input.owner, "Admin"),
    price: 0,
    paidAmount: 0,
    registeredAt: now.toISOString(),
    tags: [source],
    notes: normalizeText(input.notes),
  };
}

export function buildLocalStudentEnrollment(
  input: CreateStudentInput,
  course: Course,
  now = new Date(),
): StudentEnrollment {
  const orderId = `local-${compactId(now)}`;
  const orderCode = toOrderCode(now);
  const owner = normalizeText(input.owner, "Admin");
  const notes = normalizeText(input.notes);

  const lead: Lead = {
    id: `order:${orderId}`,
    code: toLeadCode(now),
    orderCode,
    name: normalizeText(input.name, "Chua co ten"),
    email: normalizeText(input.email),
    phone: normalizeText(input.phone),
    courseId: course.id,
    courseName: course.title,
    landingPage: course.title,
    campaign: normalizeText(input.campaign),
    utmSource: "manual-admin",
    paymentStatus: "paid",
    careStatus: "access_granted",
    owner,
    price: course.price,
    paidAmount: course.price,
    registeredAt: now.toISOString(),
    paidAt: now.toISOString(),
    tags: ["paid", `admin-student:${course.id}`],
    notes,
  };

  return {
    lead,
    order: {
      id: orderId,
      leadId: orderId,
      transactionId: orderCode,
      gateway: "Manual",
      amount: course.price,
      paidAmount: course.price,
      status: "paid",
      createdAt: now.toISOString(),
    },
  };
}

export function addLeadRecord(dataset: AdminDataset, lead: Lead): AdminDataset {
  return {
    ...dataset,
    leads: [lead, ...dataset.leads],
  };
}

export function addStudentEnrollment(dataset: AdminDataset, lead: Lead, order: Order): AdminDataset {
  return {
    ...dataset,
    leads: [lead, ...dataset.leads],
    orders: [order, ...dataset.orders],
    courses: dataset.courses.map((course) =>
      course.id === lead.courseId
        ? {
            ...course,
            students: course.students + 1,
            revenue: course.revenue + lead.paidAmount,
          }
        : course,
    ),
  };
}

export function deleteRecordFromDataset(dataset: AdminDataset, leadId: string): AdminDataset {
  const lead = dataset.leads.find((item) => item.id === leadId);
  const recordKey = getLeadRecordKey(leadId);
  const shouldRemoveOrder = leadId.startsWith("order:");

  return {
    ...dataset,
    leads: dataset.leads.filter((item) => item.id !== leadId),
    orders: shouldRemoveOrder
      ? dataset.orders.filter((order) => order.id !== recordKey && order.leadId !== recordKey && `order:${order.id}` !== leadId)
      : dataset.orders,
    courses:
      lead && shouldRemoveOrder && lead.courseId
        ? dataset.courses.map((course) =>
            course.id === lead.courseId
              ? {
                  ...course,
                  students: Math.max(course.students - 1, 0),
                  revenue: Math.max(course.revenue - lead.paidAmount, 0),
                }
              : course,
          )
        : dataset.courses,
  };
}
