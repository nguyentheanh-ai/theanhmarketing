import {
  buildSoloCommandCenterModel,
  type CommandCenterAccessInput,
  type CommandCenterActivityInput,
  type CommandCenterCourseInput,
  type CommandCenterLeadInput,
  type CommandCenterOrderInput,
  type CommandCenterRange,
  type CommandCenterDataStatus,
  type SoloCommandCenterModel,
} from "@/lib/admin/solo-command-center";
import {
  getAdminCommandCenterLeadsStrict,
  getAdminPaymentOrdersStrict,
} from "@/services/adminDataService";
import { getCourseSummariesStrict, type CourseSummary } from "@/services/courseService";
import {
  getCommandCenterStudentActivities,
  type ActivityLog,
} from "@/services/activityLogService";
import { normalizeEmail, normalizePhone } from "@/lib/crm-v2/normalize";
import { getCommandCenterEnrollmentsStrict, type CommandCenterEnrollment } from "@/services/lmsService";
import type { CommandCenterLeadSummary } from "@/services/leadService";
import type { PaymentOrder } from "@/services/orderService";

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const ZONED_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
export const MAX_COMMAND_CENTER_RANGE_DAYS = 366;

function parseDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function addDateKeyDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  if (!date) throw new RangeError("Invalid command-center date");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toVietnamDateKey(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function resolveCommandCenterRange(
  query: { from?: string; to?: string } = {},
  now = new Date(),
): CommandCenterRange {
  const to = toVietnamDateKey(now);
  const defaultRange = { from: addDateKeyDays(to, -29), to };
  const fromDate = query.from ? parseDateKey(query.from) : null;
  const toDate = query.to ? parseDateKey(query.to) : null;

  const inclusiveDays = fromDate && toDate
    ? Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1
    : 0;

  if (!fromDate || !toDate || fromDate.getTime() > toDate.getTime() || inclusiveDays > MAX_COMMAND_CENTER_RANGE_DAYS) {
    return defaultRange;
  }

  return { from: query.from as string, to: query.to as string };
}

function assertZonedTimestamp(value: string) {
  const match = ZONED_TIMESTAMP.exec(value);
  if (!match) throw new RangeError("Invalid source timestamp");
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw] = match;
  const [year, month, day, hour, minute, second] = [
    yearRaw,
    monthRaw,
    dayRaw,
    hourRaw,
    minuteRaw,
    secondRaw,
  ].map(Number);
  const local = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    local.getUTCFullYear() !== year ||
    local.getUTCMonth() !== month - 1 ||
    local.getUTCDate() !== day ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new RangeError("Invalid source timestamp");
  }
  return value;
}

function requiredTimestamp(value: string | null | undefined) {
  if (!value) throw new RangeError("Missing source timestamp");
  return assertZonedTimestamp(value);
}

function optionalTimestamp(value: string | null | undefined) {
  return value ? assertZonedTimestamp(value) : null;
}

function mapOrder(order: PaymentOrder): CommandCenterOrderInput {
  if (!order.id || !order.orderCode || !Number.isFinite(order.amount)) {
    throw new TypeError("Invalid order source row");
  }
  optionalTimestamp(order.paymentEmailSentAt);
  return {
    id: order.id,
    orderCode: order.orderCode,
    email: order.email,
    phone: order.phone,
    status: order.status,
    amount: order.amount,
    createdAt: requiredTimestamp(order.createdAt),
    paidAt: optionalTimestamp(order.paidAt),
    courseSlug: order.courseSlug,
    courseTitle: order.courseTitle,
    orderItems: order.orderItems.map((item) => ({
      slug: item.slug,
      title: item.title,
      price: item.price,
    })),
    paymentEmailSentAt: order.paymentEmailSentAt,
  };
}

function mapLead(lead: CommandCenterLeadSummary): CommandCenterLeadInput {
  if (!lead.id) throw new TypeError("Invalid lead source row");
  return {
    id: lead.id,
    email: lead.email,
    phone: lead.phone,
    createdAt: requiredTimestamp(lead.createdAt),
  };
}

function mapCourse(course: CourseSummary): CommandCenterCourseInput {
  if (!course.title) throw new TypeError("Invalid course source row");
  return { id: course.id, slug: course.slug, title: course.title };
}

function orderCourseMatchesEnrollment(order: PaymentOrder, enrollment: CommandCenterEnrollment) {
  const courseSlugs = new Set(
    (order.orderItems.length > 0
      ? order.orderItems.map((item) => item.slug).filter(Boolean)
      : order.courseSlug.split(",").map((slug) => slug.trim()).filter(Boolean)),
  );
  return courseSlugs.has(enrollment.courseSlug);
}

function legacyPaidOrderMatchesEnrollment(order: PaymentOrder, enrollment: CommandCenterEnrollment) {
  if (order.status !== "paid" || !orderCourseMatchesEnrollment(order, enrollment)) return false;
  const enrollmentEmail = normalizeEmail(enrollment.email);
  const enrollmentPhone = normalizePhone(enrollment.phone);
  return (Boolean(enrollmentEmail) && normalizeEmail(order.email) === enrollmentEmail) ||
    (Boolean(enrollmentPhone) && normalizePhone(order.phone) === enrollmentPhone);
}

export function mapCommandCenterEnrollment(
  enrollment: CommandCenterEnrollment,
  orders: PaymentOrder[],
): CommandCenterAccessInput {
  if (!enrollment.id || !enrollment.courseSlug) throw new TypeError("Invalid enrollment source row");
  const enrolledAt = requiredTimestamp(enrollment.activatedAt || enrollment.createdAt);
  const expiresAt = optionalTimestamp(enrollment.expiresAt);
  const linkedOrder = enrollment.orderId
    ? orders.find((order) => order.id === enrollment.orderId)
    : undefined;
  const kind = linkedOrder?.status === "paid" && orderCourseMatchesEnrollment(linkedOrder, enrollment)
    ? "paid"
    : enrollment.accessKind ?? (
      orders.some((order) => legacyPaidOrderMatchesEnrollment(order, enrollment)) ? "paid" : "free"
    );
  return {
    id: enrollment.id,
    studentId: enrollment.contactId || enrollment.userId || enrollment.id,
    email: enrollment.email,
    phone: enrollment.phone,
    status: enrollment.status.trim().toLowerCase(),
    kind,
    enrolledAt,
    firstAccessAt: enrolledAt,
    expiresAt,
  };
}

function safeMetadataValue(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 160);
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function getActivityKind(eventType: ActivityLog["eventType"]): CommandCenterActivityInput["kind"] | null {
  if (
    eventType === "payment_email_sent" ||
    eventType === "payment_email_failed" ||
    eventType === "payment_success_email_sent" ||
    eventType === "payment_success_email_failed"
  ) {
    return "email";
  }
  if (eventType === "student_account_created") return "account";
  if (eventType === "course_access_granted" || eventType === "course_access_revoked") return "access";
  return null;
}

function mapActivity(activity: ActivityLog): CommandCenterActivityInput | null {
  const kind = getActivityKind(activity.eventType);
  if (!kind || !activity.id) return null;
  return {
    id: activity.id,
    kind,
    status: activity.status,
    createdAt: requiredTimestamp(activity.createdAt),
    orderId: safeMetadataValue(activity.metadata, ["orderId", "order_id"]),
    orderCode: safeMetadataValue(activity.metadata, ["orderCode", "order_code"]),
    accessId: safeMetadataValue(activity.metadata, ["accessId", "access_id"]),
    studentId: activity.studentId,
    email: activity.studentEmail,
    phone: activity.studentPhone,
  };
}

function resolveRows<T, U>(
  result: PromiseSettledResult<T[]>,
  mapper: (row: T) => U | null,
): { rows: U[]; status: CommandCenterDataStatus } {
  if (result.status === "rejected") return { rows: [], status: "error" };
  try {
    return {
      rows: result.value.map(mapper).filter((row): row is U => row !== null),
      status: "ready",
    };
  } catch {
    return { rows: [], status: "error" };
  }
}

type CommandCenterSettledSources = {
  orders: PromiseSettledResult<PaymentOrder[]>;
  leads: PromiseSettledResult<CommandCenterLeadSummary[]>;
  courses: PromiseSettledResult<CourseSummary[]>;
  students: PromiseSettledResult<CommandCenterEnrollment[]>;
  activities: PromiseSettledResult<ActivityLog[]>;
};

export type CommandCenterProviders = {
  orders: () => Promise<PaymentOrder[]>;
  leads: () => Promise<CommandCenterLeadSummary[]>;
  courses: () => Promise<CourseSummary[]>;
  students: () => Promise<CommandCenterEnrollment[]>;
  activities: () => Promise<ActivityLog[]>;
};

export function resolveCommandCenterSettledSources(results: CommandCenterSettledSources) {
  const orders = resolveRows(results.orders, mapOrder);
  const leads = resolveRows(results.leads, mapLead);
  const courses = resolveRows(results.courses, mapCourse);
  const students = resolveRows(
    results.students,
    (student) => mapCommandCenterEnrollment(
      student,
      results.orders.status === "fulfilled" ? results.orders.value : [],
    ),
  );
  const activities = resolveRows(results.activities, mapActivity);
  return {
    orders: orders.rows,
    leads: leads.rows,
    courses: courses.rows,
    students: students.rows,
    activities: activities.rows,
    dataStatus: {
      orders: orders.status,
      leads: leads.status,
      courses: courses.status,
      students: students.status,
      activities: activities.status,
    },
  };
}

export async function getSoloCommandCenterModel(
  range: CommandCenterRange,
  providers?: CommandCenterProviders,
  generatedAt = new Date(),
): Promise<SoloCommandCenterModel> {
  const activeProviders: CommandCenterProviders = providers ?? {
    orders: getAdminPaymentOrdersStrict,
    leads: getAdminCommandCenterLeadsStrict,
    courses: getCourseSummariesStrict,
    students: getCommandCenterEnrollmentsStrict,
    activities: () => getCommandCenterStudentActivities(range),
  };
  const [ordersResult, leadsResult, coursesResult, studentsResult, activitiesResult] =
    await Promise.allSettled([
      activeProviders.orders(),
      activeProviders.leads(),
      activeProviders.courses(),
      activeProviders.students(),
      activeProviders.activities(),
    ]);

  const sources = resolveCommandCenterSettledSources({
    orders: ordersResult,
    leads: leadsResult,
    courses: coursesResult,
    students: studentsResult,
    activities: activitiesResult,
  });

  return buildSoloCommandCenterModel({
    range,
    generatedAt,
    orders: sources.orders,
    leads: sources.leads,
    courses: sources.courses,
    students: sources.students,
    activities: sources.activities,
    dataStatus: sources.dataStatus,
  });
}
