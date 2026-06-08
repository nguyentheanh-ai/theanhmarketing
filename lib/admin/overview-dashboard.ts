import type { Course } from "@/data/courses";
import type { LeadItem } from "@/services/leadService";
import type { PaymentOrder } from "@/services/orderService";

export type DailyOverviewRow = {
  date: string;
  revenue: number;
  previousRevenue: number;
  revenueChangePercent: number | null;
  paidOrders: number;
  leads: number;
};

export type CourseOverviewRow = {
  courseKey: string;
  courseTitle: string;
  revenue: number;
  paidOrders: number;
  leads: number;
};

export type RecentLeadActivity = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  kind: "lead" | "registered" | "contacted" | "mail";
  isDone: boolean;
};

export type AdminOverviewModel = {
  totalRevenue: number;
  todayRevenue: number;
  todayRevenueChangePercent: number | null;
  paidOrderCount: number;
  todayLeadCount: number;
  dailyRows: DailyOverviewRow[];
  courseRows: CourseOverviewRow[];
  recentLeadActivities: RecentLeadActivity[];
};

function normalizeVietnamese(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function toVietnamDateKey(value: string | Date | null | undefined) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = parts.reduce<Record<string, string>>((current, part) => {
    current[part.type] = part.value;
    return current;
  }, {});

  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function getCourseKey(input: { courseSlug?: string; courseTitle?: string; title?: string; slug?: string }) {
  const slug = input.courseSlug || input.slug;
  if (slug) return slug;

  const title = input.courseTitle || input.title || "unknown";
  return (
    normalizeVietnamese(title)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "unknown"
  );
}

function getCourseTitle(input: { courseTitle?: string; title?: string; courseSlug?: string; slug?: string }, courses: Course[]) {
  const key = getCourseKey(input);
  const matched = courses.find((course) => getCourseKey(course) === key || course.slug === key);
  return input.courseTitle || input.title || matched?.title || key;
}

function compareNewest(a?: string | null, b?: string | null) {
  return Date.parse(b ?? "") - Date.parse(a ?? "");
}

function getDaySequence(now: Date, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - 1 - index));
    return toVietnamDateKey(date);
  });
}

function changePercent(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function getLeadCourseKey(lead: LeadItem) {
  return getCourseKey({
    courseTitle: lead.courseTitle || /^Khóa:\s*(.+)$/im.exec(lead.need)?.[1]?.trim(),
  });
}

function addToMap(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function getPaidOrderDate(order: PaymentOrder) {
  return toVietnamDateKey(order.paidAt || order.createdAt);
}

function getOrderCourseSplits(order: PaymentOrder, courses: Course[]) {
  if (order.orderItems.length > 0) {
    const totalItemPrice = order.orderItems.reduce((sum, item) => sum + item.price, 0);
    const fallbackShare = order.amount / order.orderItems.length;

    return order.orderItems.map((item) => ({
      courseKey: getCourseKey({ courseSlug: item.slug, courseTitle: item.title }),
      courseTitle: getCourseTitle({ courseSlug: item.slug, courseTitle: item.title }, courses),
      revenue: totalItemPrice > 0 ? Math.round((order.amount * item.price) / totalItemPrice) : Math.round(fallbackShare),
    }));
  }

  return [
    {
      courseKey: getCourseKey(order),
      courseTitle: getCourseTitle(order, courses),
      revenue: order.amount,
    },
  ];
}

export function buildAdminOverviewModel({
  orders,
  leads,
  courses,
  now = new Date(),
}: {
  orders: PaymentOrder[];
  leads: LeadItem[];
  courses: Course[];
  now?: Date;
}): AdminOverviewModel {
  const paidOrders = orders.filter((order) => order.status === "paid");
  const dailyRevenue = new Map<string, number>();
  const dailyPaidOrders = new Map<string, number>();
  const dailyLeads = new Map<string, number>();
  const courseRevenue = new Map<string, number>();
  const coursePaidOrders = new Map<string, number>();
  const courseLeads = new Map<string, number>();
  const courseTitles = new Map<string, string>();

  for (const course of courses) {
    courseTitles.set(getCourseKey(course), course.title);
  }

  for (const order of paidOrders) {
    const dateKey = getPaidOrderDate(order);
    addToMap(dailyRevenue, dateKey, order.amount);
    addToMap(dailyPaidOrders, dateKey, 1);

    for (const split of getOrderCourseSplits(order, courses)) {
      courseTitles.set(split.courseKey, split.courseTitle);
      addToMap(courseRevenue, split.courseKey, split.revenue);
      addToMap(coursePaidOrders, split.courseKey, 1);
    }
  }

  for (const lead of leads) {
    const dateKey = toVietnamDateKey(lead.createdAt);
    const courseKey = getLeadCourseKey(lead);
    const courseTitle = lead.courseTitle || /^Khóa:\s*(.+)$/im.exec(lead.need)?.[1]?.trim();

    addToMap(dailyLeads, dateKey, 1);
    addToMap(courseLeads, courseKey, 1);
    if (courseTitle) {
      courseTitles.set(courseKey, courseTitle);
    }
  }

  const dayKeys = getDaySequence(now, 100);
  const dailyRows = dayKeys.map((date, index) => {
    const revenue = dailyRevenue.get(date) ?? 0;
    const previousDate = dayKeys[index - 1];
    const previousRevenue = previousDate ? dailyRevenue.get(previousDate) ?? 0 : 0;

    return {
      date,
      revenue,
      previousRevenue,
      revenueChangePercent: changePercent(revenue, previousRevenue),
      paidOrders: dailyPaidOrders.get(date) ?? 0,
      leads: dailyLeads.get(date) ?? 0,
    };
  });

  const courseKeys = new Set([...courseRevenue.keys(), ...courseLeads.keys()]);
  const courseRows = [...courseKeys]
    .map((courseKey) => ({
      courseKey,
      courseTitle: courseTitles.get(courseKey) || courseKey,
      revenue: courseRevenue.get(courseKey) ?? 0,
      paidOrders: coursePaidOrders.get(courseKey) ?? 0,
      leads: courseLeads.get(courseKey) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.paidOrders - a.paidOrders || a.courseTitle.localeCompare(b.courseTitle, "vi"));

  const todayKey = toVietnamDateKey(now);
  const todayRow = dailyRows.find((row) => row.date === todayKey) ?? dailyRows[dailyRows.length - 1];

  const recentLeadActivities = [...leads]
    .sort((a, b) => compareNewest(a.createdAt, b.createdAt))
    .slice(0, 8)
    .map((lead) => {
      const contacted = lead.saleStatus === "Đã liên hệ";
      const hasMail = lead.resendEmailCount > 0;

      return {
        id: lead.id ?? `${lead.name}-${lead.phone}-${lead.createdAt ?? ""}`,
        title: contacted
          ? `${lead.name || "Lead"} đã được liên hệ`
          : hasMail
            ? `${lead.name || "Lead"} đã được gửi mail`
            : `${lead.name || "Lead"} đã điền form tư vấn`,
        detail: lead.createdAt ?? "",
        createdAt: lead.createdAt ?? "",
        kind: contacted ? ("contacted" as const) : hasMail ? ("mail" as const) : ("lead" as const),
        isDone: contacted || lead.paymentStatus === "paid",
      };
    });

  return {
    totalRevenue: paidOrders.reduce((sum, order) => sum + order.amount, 0),
    todayRevenue: todayRow?.revenue ?? 0,
    todayRevenueChangePercent: todayRow?.revenueChangePercent ?? null,
    paidOrderCount: paidOrders.length,
    todayLeadCount: todayRow?.leads ?? 0,
    dailyRows,
    courseRows,
    recentLeadActivities,
  };
}
