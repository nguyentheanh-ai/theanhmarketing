import type {
  ActivityLog,
  AdminDataset,
  AutomationFlow,
  CampaignPoint,
  ClickEvent,
  Course,
  Lead,
  Order,
  PaymentStatus,
  RevenuePoint,
} from "./types";
import { emptyAdminDataset } from "./empty-dataset";

export type LegacyCourseRow = {
  id: string;
  slug: string | null;
  title: string | null;
  price: string | number | null;
  status: string | null;
  lesson_count?: number | null;
  course_modules?: Array<{ lessons?: unknown[] | null }> | null;
};

export type LegacyLeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  source: string | null;
  created_at: string | null;
};

export type LegacyOrderItem = {
  slug?: string;
  title?: string;
  price?: number;
};

export type LegacyOrderRow = {
  id: string;
  order_code: string | null;
  student_name: string | null;
  email: string | null;
  phone: string | null;
  course_slug: string | null;
  course_title: string | null;
  amount: string | number | null;
  paid_amount?: string | number | null;
  status: string | null;
  payment_method: string | null;
  created_at: string | null;
  paid_at: string | null;
  order_items?: LegacyOrderItem[] | null;
};

export type LegacyClickEventRow = {
  id: string;
  lead_id?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  course_id?: string | null;
  landing_page_id?: string | null;
  event_name: string | null;
  event_type: string | null;
  button_name?: string | null;
  page_url: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  device_type?: string | null;
  browser?: string | null;
  ip_address?: string | null;
  country?: string | null;
  city?: string | null;
  created_at: string | null;
};

export type LegacyActivityLogRow = {
  id: string;
  actor_name?: string | null;
  actor?: string | null;
  action: string | null;
  module: string | null;
  target_table?: string | null;
  target_id?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string | null;
  created_at: string | null;
};

export type LegacyAutomationFlowRow = {
  id: string;
  name: string | null;
  trigger_type: string | null;
  status: string | null;
  audience_count?: number | null;
  open_rate?: number | null;
  click_rate?: number | null;
  revenue_vnd?: number | null;
};

type BuildInput = {
  courses?: LegacyCourseRow[];
  leads?: LegacyLeadRow[];
  orders?: LegacyOrderRow[];
  clickEvents?: LegacyClickEventRow[];
  activityLogs?: LegacyActivityLogRow[];
  automationFlows?: LegacyAutomationFlowRow[];
};

function parseVndAmount(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const numeric = String(value ?? "").replace(/[^\d]/g, "");
  return numeric ? Number(numeric) : 0;
}

function normalizePaymentStatus(status: string | null | undefined): PaymentStatus {
  if (status === "paid" || status === "partial" || status === "failed" || status === "refunded") {
    return status;
  }

  return "unpaid";
}

function normalizeClickEventType(eventType: string | null | undefined): ClickEvent["eventType"] {
  if (
    eventType === "phone_click" ||
    eventType === "zalo_click" ||
    eventType === "messenger_click" ||
    eventType === "cta_click" ||
    eventType === "form_submit" ||
    eventType === "scroll_depth" ||
    eventType === "pricing_view" ||
    eventType === "add_to_cart" ||
    eventType === "checkout_start" ||
    eventType === "payment_success" ||
    eventType === "payment_failed"
  ) {
    return eventType;
  }

  if (eventType === "view_pricing") {
    return "pricing_view";
  }

  if (eventType === "start_checkout") {
    return "checkout_start";
  }

  return "cta_click";
}

function getPaidAmount(order: LegacyOrderRow) {
  const status = normalizePaymentStatus(order.status);

  if (status === "paid") {
    return parseVndAmount(order.paid_amount ?? order.amount);
  }

  if (status === "partial") {
    return parseVndAmount(order.paid_amount);
  }

  return 0;
}

function getOrderItems(order: LegacyOrderRow): LegacyOrderItem[] {
  if (Array.isArray(order.order_items) && order.order_items.length > 0) {
    return order.order_items;
  }

  const slugs = (order.course_slug ?? "").split(",").map((slug) => slug.trim()).filter(Boolean);
  const titles = (order.course_title ?? "").split("|").map((title) => title.trim()).filter(Boolean);

  return slugs.map((slug, index) => ({
    slug,
    title: titles[index] ?? slug,
    price: parseVndAmount(order.amount),
  }));
}

function getLessonCount(course: LegacyCourseRow) {
  if (typeof course.lesson_count === "number") {
    return course.lesson_count;
  }

  return (course.course_modules ?? []).reduce((sum, module) => sum + (module.lessons?.length ?? 0), 0);
}

function getCourseStatus(status: string | null | undefined): Course["status"] {
  if (status === "draft" || status === "archived") {
    return status;
  }

  return "active";
}

function buildCourseStats(orders: LegacyOrderRow[]) {
  const stats = new Map<string, { revenue: number; students: Set<string> }>();

  for (const order of orders) {
    const status = normalizePaymentStatus(order.status);

    if (status !== "paid") {
      continue;
    }

    const contactKey = (order.email || order.phone || order.student_name || order.id).toLowerCase();
    const paidAmount = getPaidAmount(order);

    for (const item of getOrderItems(order)) {
      const slug = item.slug;

      if (!slug) {
        continue;
      }

      const current = stats.get(slug) ?? { revenue: 0, students: new Set<string>() };
      current.revenue += paidAmount;
      current.students.add(contactKey);
      stats.set(slug, current);
    }
  }

  return stats;
}

export function mapLegacyOrders(rows: LegacyOrderRow[] = []): Order[] {
  return rows.map((order) => {
    const status = normalizePaymentStatus(order.status);

    return {
      id: order.id,
      leadId: order.id,
      transactionId: order.order_code ?? undefined,
      gateway: order.payment_method === "manual-admin" ? "Manual" : "SePay",
      amount: parseVndAmount(order.amount),
      paidAmount: getPaidAmount(order),
      status,
      createdAt: order.created_at ?? order.paid_at ?? "",
    };
  });
}

export function mapLegacyCourses(rows: LegacyCourseRow[] = [], orders: LegacyOrderRow[] = []): Course[] {
  const stats = buildCourseStats(orders);

  return rows.map((course) => {
    const slug = course.slug ?? course.id;
    const courseStats = stats.get(slug);

    return {
      id: slug,
      title: course.title ?? slug,
      price: parseVndAmount(course.price),
      students: courseStats?.students.size ?? 0,
      lessons: getLessonCount(course),
      completionRate: 0,
      revenue: courseStats?.revenue ?? 0,
      status: getCourseStatus(course.status),
    };
  });
}

export function mapLegacyLeads(leads: LegacyLeadRow[] = [], orders: LegacyOrderRow[] = []): Lead[] {
  const orderLeads: Lead[] = orders.map((order, index) => {
    const status = normalizePaymentStatus(order.status);
    const items = getOrderItems(order);
    const firstItem = items[0];

    return {
      id: `order:${order.id}`,
      code: `ORDER-${String(index + 1).padStart(5, "0")}`,
      orderCode: order.order_code ?? order.id,
      name: order.student_name ?? "Chưa có tên",
      email: order.email ?? "",
      phone: order.phone ?? "",
      courseId: firstItem?.slug ?? order.course_slug ?? "",
      courseName: firstItem?.title ?? order.course_title ?? "",
      landingPage: firstItem?.title ?? order.course_title ?? "",
      campaign: "",
      utmSource: order.payment_method ?? "checkout",
      paymentStatus: status,
      careStatus: status === "paid" ? "access_granted" : "waiting_payment",
      owner: "Admin",
      price: parseVndAmount(order.amount),
      paidAmount: getPaidAmount(order),
      registeredAt: order.created_at ?? order.paid_at ?? "",
      paidAt: order.paid_at ?? undefined,
      tags: [status],
      notes: "",
    };
  });

  const rawLeads: Lead[] = leads.map((lead, index) => ({
    id: `lead:${lead.id}`,
    code: `LEAD-${String(index + 1).padStart(5, "0")}`,
    orderCode: "",
    name: lead.name ?? "Chưa có tên",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    courseId: "",
    courseName: "",
    landingPage: "",
    campaign: "",
    utmSource: lead.source ?? "Website",
    paymentStatus: "unpaid",
    careStatus: lead.source?.startsWith("admin-student:") ? "waiting_payment" : "new",
    owner: "Admin",
    price: 0,
    paidAmount: 0,
    registeredAt: lead.created_at ?? "",
    tags: [lead.source ?? "Website"],
    notes: lead.message ?? "",
  }));

  return [...orderLeads, ...rawLeads].sort((a, b) => Date.parse(b.registeredAt) - Date.parse(a.registeredAt));
}

export function mapLegacyClickEvents(rows: LegacyClickEventRow[] = []): ClickEvent[] {
  return rows.map((event) => ({
    id: event.id,
    leadId: event.lead_id ?? undefined,
    userId: event.user_id ?? undefined,
    sessionId: event.session_id ?? undefined,
    courseId: event.course_id ?? undefined,
    landingPageId: event.landing_page_id ?? undefined,
    eventName: event.event_name ?? event.event_type ?? "Event",
    eventType: normalizeClickEventType(event.event_type),
    buttonName: event.button_name ?? undefined,
    pageUrl: event.page_url ?? "",
    referrer: event.referrer ?? undefined,
    utmSource: event.utm_source ?? undefined,
    utmMedium: event.utm_medium ?? undefined,
    utmCampaign: event.utm_campaign ?? undefined,
    deviceType:
      event.device_type === "desktop" || event.device_type === "tablet" || event.device_type === "mobile"
        ? event.device_type
        : undefined,
    browser: event.browser ?? undefined,
    ipAddress: event.ip_address ?? undefined,
    country: event.country ?? undefined,
    city: event.city ?? undefined,
    createdAt: event.created_at ?? "",
  }));
}

export function mapLegacyActivityLogs(rows: LegacyActivityLogRow[] = []): ActivityLog[] {
  return rows.map((log) => ({
    id: log.id,
    actor: log.actor_name ?? log.actor ?? "System",
    action: log.action ?? "",
    module:
      log.module === "CRM" || log.module === "LMS" || log.module === "Payment" || log.module === "Automation" || log.module === "Settings"
        ? log.module
        : "Settings",
    target: log.target_table ?? log.target_id ?? "",
    before: typeof log.old_value === "string" ? log.old_value : log.old_value ? JSON.stringify(log.old_value) : undefined,
    after: typeof log.new_value === "string" ? log.new_value : log.new_value ? JSON.stringify(log.new_value) : undefined,
    ipAddress: log.ip_address ?? "",
    createdAt: log.created_at ?? "",
  }));
}

export function mapLegacyAutomationFlows(rows: LegacyAutomationFlowRow[] = []): AutomationFlow[] {
  return rows.map((flow) => ({
    id: flow.id,
    name: flow.name ?? "Automation",
    trigger: flow.trigger_type ?? "",
    status: flow.status === "active" || flow.status === "paused" ? flow.status : "draft",
    audience: flow.audience_count ?? 0,
    openRate: flow.open_rate ?? 0,
    clickRate: flow.click_rate ?? 0,
    revenue: flow.revenue_vnd ?? 0,
  }));
}

export function buildRevenueSeries(orders: Order[]): RevenuePoint[] {
  const byDate = new Map<string, number>();

  for (const order of orders) {
    if (!order.createdAt || order.paidAmount <= 0) {
      continue;
    }

    const date = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(order.createdAt));
    byDate.set(date, (byDate.get(date) ?? 0) + order.paidAmount);
  }

  return Array.from(byDate.entries())
    .map(([date, revenue]) => ({ date, revenue, target: 0 }))
    .slice(-30);
}

export function buildCampaignSeries(leads: Lead[], orders: Order[]): CampaignPoint[] {
  const paidLeadIds = new Set(orders.filter((order) => order.status === "paid").map((order) => order.leadId));
  const bySource = new Map<string, { leads: number; payments: number }>();

  for (const lead of leads) {
    const source = lead.utmSource || "direct";
    const current = bySource.get(source) ?? { leads: 0, payments: 0 };
    current.leads += 1;
    current.payments += lead.paymentStatus === "paid" || paidLeadIds.has(lead.id.replace(/^order:/, "")) ? 1 : 0;
    bySource.set(source, current);
  }

  return Array.from(bySource.entries()).map(([source, value]) => ({
    source,
    leads: value.leads,
    payments: value.payments,
    ctr: value.leads > 0 ? Math.round((value.payments / value.leads) * 1000) / 10 : 0,
  }));
}

export function buildAdminDatasetFromLegacy(input: BuildInput): AdminDataset {
  const orders = mapLegacyOrders(input.orders);
  const leads = mapLegacyLeads(input.leads, input.orders);
  const courses = mapLegacyCourses(input.courses, input.orders);
  const clickEvents = mapLegacyClickEvents(input.clickEvents);

  return {
    ...emptyAdminDataset,
    courses,
    leads,
    orders,
    clickEvents,
    activityLogs: mapLegacyActivityLogs(input.activityLogs),
    automationFlows: mapLegacyAutomationFlows(input.automationFlows),
    revenueSeries: buildRevenueSeries(orders),
    campaignSeries: buildCampaignSeries(leads, orders),
  };
}
