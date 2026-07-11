export type CommandCenterRange = {
  from: string;
  to: string;
};

export type Metric = {
  value: number;
  previousValue: number;
  changePercent: number | null;
};

export type PriorityTask = {
  id: string;
  severity: "critical" | "warning" | "info";
  kind: "account" | "email" | "access" | "trial" | "pending-order";
  title: string;
  detail: string;
  href: string;
  actionHref?: string;
  createdAt: string;
};

export type CommandCenterDataStatus = "ready" | "error";

export type CommandCenterOrderInput = {
  id: string;
  orderCode?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  amount: number;
  createdAt: string;
  paidAt?: string | null;
  courseSlug?: string | null;
  courseTitle?: string | null;
  orderItems?: Array<{
    slug?: string | null;
    courseSlug?: string | null;
    title?: string | null;
    courseTitle?: string | null;
    price?: number | null;
  }>;
  emailSentAt?: string | null;
  paymentEmailSentAt?: string | null;
  paymentSuccessEmailSentAt?: string | null;
};

export type CommandCenterLeadInput = {
  id: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
};

export type CommandCenterCourseInput = {
  id?: string | null;
  slug?: string | null;
  title: string;
};

export type AccessKind = "paid" | "free" | "trial";

type CommandCenterAccessBase = {
  id: string;
  studentId?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  accessStatus?: string | null;
  grantedAt?: string | null;
  enrolledAt?: string | null;
  firstAccessAt?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
};

export type CommandCenterAccessInput = CommandCenterAccessBase & (
  | { kind: AccessKind; accessKind?: AccessKind }
  | { kind?: AccessKind; accessKind: AccessKind }
);

export type CommandCenterActivityInput = {
  id: string;
  kind: "account" | "email" | "access" | string;
  status: string;
  createdAt: string;
  detail?: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  accessId?: string | null;
  studentId?: string | null;
  email?: string | null;
  phone?: string | null;
  operationId?: string | null;
  outcomeStatus?: string | null;
  errorCode?: string | null;
};

export type CommandCenterInput = {
  range: CommandCenterRange;
  generatedAt: Date | string;
  orders: CommandCenterOrderInput[];
  leads: CommandCenterLeadInput[];
  courses: CommandCenterCourseInput[];
  students?: CommandCenterAccessInput[];
  accessRecords?: CommandCenterAccessInput[];
  activities: CommandCenterActivityInput[];
  dataStatus?: Partial<Record<"orders" | "leads" | "courses" | "students" | "activities", CommandCenterDataStatus>>;
};

export type SoloCommandCenterModel = {
  range: CommandCenterRange;
  generatedAt: string;
  dataStatus: Record<"orders" | "leads" | "courses" | "students" | "activities", CommandCenterDataStatus>;
  kpis: {
    revenue: Metric;
    paidOrders: Metric;
    newStudents: Metric;
    newLeads: Metric;
  };
  revenueTrend: Array<{
    date: string;
    current: number;
    previous: number;
  }>;
  orderStatuses: Array<{
    status: "paid" | "pending" | "failed" | "refunded" | "other";
    label: string;
    count: number;
  }>;
  topCourses: Array<{
    slug: string;
    title: string;
    revenue: number;
    paidOrders: number;
  }>;
  funnel: {
    rows: Array<{
      stage: "lead" | "pending" | "paid" | "enrolled";
      label: string;
      count: number;
      conversionPercent: number;
    }>;
    unlinkedCount: number;
  };
  studentGrowth: Array<{
    date: string;
    kind: "paid" | "free" | "trial";
    count: number;
  }>;
  accessHealth: Array<{
    status: "active" | "pending" | "expiring" | "error";
    count: number;
  }>;
  priorityTasks: PriorityTask[];
};

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const DAY_MS = 24 * 60 * 60 * 1_000;
const ACTIVE_ACCESS_STATUSES = new Set(["active", "granted", "completed", "co quyen hoc", "có quyền học"]);

function parseDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return utc;
}

function addDateKeyDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  if (!date) throw new RangeError("Invalid command-center range");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateKeys(from: string, to: string) {
  const fromDate = parseDateKey(from);
  const toDate = parseDateKey(to);
  if (!fromDate || !toDate || fromDate.getTime() > toDate.getTime()) {
    throw new RangeError("Invalid command-center range");
  }
  const count = Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1;
  return Array.from({ length: count }, (_, index) => addDateKeyDays(from, index));
}

function toVietnamDateKey(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function calculateChangePercent(current: number, previous: number) {
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function metric(value: number, previousValue: number): Metric {
  return { value, previousValue, changePercent: calculateChangePercent(value, previousValue) };
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizePhone(value?: string | null) {
  let digits = value?.replace(/\D/g, "") ?? "";
  if (digits.startsWith("84") && digits.length === 11) digits = `0${digits.slice(2)}`;
  return digits;
}

function contactIdentityKey(input: { email?: string | null; phone?: string | null; studentId?: string | null }) {
  const email = normalizeEmail(input.email);
  if (email) return `email:${email}`;
  const phone = normalizePhone(input.phone);
  if (phone) return `phone:${phone}`;
  if (input.studentId) return `student:${input.studentId}`;
  return "";
}

function identityKey(input: { email?: string | null; phone?: string | null; studentId?: string | null; id?: string | null }) {
  const contactKey = contactIdentityKey(input);
  if (contactKey) return contactKey;
  return input.id ? `id:${input.id}` : "";
}

function studentIdentityKey(input: { studentId?: string | null; email?: string | null; phone?: string | null; id?: string | null }) {
  if (input.studentId) return `student:${input.studentId}`;
  return identityKey(input);
}

function timestamp(value?: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) {
    throw new RangeError("Invalid record timestamp");
  }
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, fractionRaw = "", zone, sign, offsetHourRaw = "0", offsetMinuteRaw = "0"] = match;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    [yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, offsetHourRaw, offsetMinuteRaw].map(Number);
  const millisecond = Number((fractionRaw + "000").slice(0, 3));
  const localUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const roundTrip = new Date(localUtc);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59 ||
    offsetHour > 23 || offsetMinute > 59 ||
    roundTrip.getUTCFullYear() !== year || roundTrip.getUTCMonth() !== month - 1 || roundTrip.getUTCDate() !== day ||
    roundTrip.getUTCHours() !== hour || roundTrip.getUTCMinutes() !== minute || roundTrip.getUTCSeconds() !== second) {
    throw new RangeError("Invalid record timestamp");
  }
  const offset = zone === "Z" ? 0 : (sign === "+" ? 1 : -1) * (offsetHour * 60 + offsetMinute) * 60_000;
  return localUtc - offset;
}

function paymentMarkerTimestamp(value?: string | null) {
  try {
    return timestamp(value);
  } catch {
    return null;
  }
}

function validateRecordTimestamps(input: CommandCenterInput) {
  for (const order of input.orders) {
    timestamp(order.createdAt);
    timestamp(order.paidAt);
  }
  for (const lead of input.leads) timestamp(lead.createdAt);
  for (const access of [...(input.students ?? []), ...(input.accessRecords ?? [])]) {
    timestamp(access.enrolledAt);
    timestamp(access.grantedAt);
    timestamp(access.createdAt);
    timestamp(access.firstAccessAt);
    timestamp(access.expiresAt);
  }
  for (const activity of input.activities) timestamp(activity.createdAt);
}

function isDateIn(dateKey: string, dates: Set<string>) {
  return dateKey !== "" && dates.has(dateKey);
}

function getAccessDate(access: CommandCenterAccessInput) {
  const provisioningDates = [access.enrolledAt, access.grantedAt, access.createdAt]
    .filter((value): value is string => timestamp(value) !== null)
    .sort((a, b) => (timestamp(a) ?? 0) - (timestamp(b) ?? 0) || a.localeCompare(b));
  return provisioningDates[0] || access.firstAccessAt || "";
}

function getAccessStatus(access: CommandCenterAccessInput) {
  return (access.status || access.accessStatus || "").trim().toLowerCase();
}

function getAccessKind(access: CommandCenterAccessInput): AccessKind {
  const kind = (access.kind || access.accessKind || "").trim().toLowerCase();
  if (kind !== "paid" && kind !== "free" && kind !== "trial") throw new RangeError("Invalid access kind");
  return kind;
}

function isActiveAccess(access: CommandCenterAccessInput) {
  return ACTIVE_ACCESS_STATUSES.has(getAccessStatus(access));
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown-course"
  );
}

function allocateInteger(total: number, weights: number[]) {
  if (weights.length === 0) return [];
  const integerTotal = Math.round(total);
  const positiveTotal = weights.reduce((sum, value) => sum + (value > 0 ? value : 0), 0);
  const exact = weights.map((weight) =>
    positiveTotal > 0 ? (integerTotal * Math.max(0, weight)) / positiveTotal : integerTotal / weights.length,
  );
  const allocations = exact.map(Math.floor);
  let remainder = integerTotal - allocations.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; remainder > 0; index += 1, remainder -= 1) {
    allocations[order[index % order.length].index] += 1;
  }
  return allocations;
}

function buildTopCourses(
  paidOrders: CommandCenterOrderInput[],
  courses: CommandCenterCourseInput[],
) {
  const titles = new Map<string, string>();
  for (const course of courses) {
    const key = course.slug || course.id || slugify(course.title);
    titles.set(key, course.title);
  }
  const rows = new Map<string, { slug: string; title: string; revenue: number; paidOrders: number }>();

  for (const order of paidOrders) {
    const items = order.orderItems ?? [];
    const splits = items.length > 0
      ? allocateInteger(order.amount, items.map((item) => Number(item.price) || 0)).map((revenue, index) => {
          const item = items[index];
          const key = item.courseSlug || item.slug || slugify(item.courseTitle || item.title || "unknown-course");
          return { key, title: item.courseTitle || item.title || titles.get(key) || key, revenue };
        })
      : [{
          key: order.courseSlug || slugify(order.courseTitle || "unknown-course"),
          title: order.courseTitle || titles.get(order.courseSlug || "") || order.courseSlug || "Khóa học chưa xác định",
          revenue: order.amount,
        }];

    const orderCourseKeys = new Set<string>();
    for (const split of splits) {
      const current = rows.get(split.key) ?? {
        slug: split.key,
        title: titles.get(split.key) || split.title,
        revenue: 0,
        paidOrders: 0,
      };
      current.revenue += split.revenue;
      orderCourseKeys.add(split.key);
      rows.set(split.key, current);
    }
    for (const key of orderCourseKeys) {
      const current = rows.get(key);
      if (current) current.paidOrders += 1;
    }
  }

  return [...rows.values()].sort(
    (a, b) => b.revenue - a.revenue || b.paidOrders - a.paidOrders || a.title.localeCompare(b.title, "vi"),
  );
}

function buildFirstStudentAccess(accessRecords: CommandCenterAccessInput[]) {
  const firstByIdentity = new Map<string, CommandCenterAccessInput>();
  for (const access of accessRecords) {
    if (!isActiveAccess(access)) continue;
    const key = studentIdentityKey(access);
    const accessTime = timestamp(getAccessDate(access));
    if (!key || accessTime === null) continue;
    const current = firstByIdentity.get(key);
    const currentTime = current ? timestamp(getAccessDate(current)) : null;
    if (!current || currentTime === null || accessTime < currentTime || (accessTime === currentTime && access.id < current.id)) {
      firstByIdentity.set(key, access);
    }
  }
  return [...firstByIdentity.values()];
}

function mergeAccessAliases(students: CommandCenterAccessInput[], accessRecords: CommandCenterAccessInput[]) {
  const merged = new Map<string, CommandCenterAccessInput>();
  for (const access of [...students, ...accessRecords]) {
    getAccessKind(access);
    const fallbackKey = `${studentIdentityKey(access)}|${(access as CommandCenterAccessInput & { courseSlug?: string }).courseSlug ?? ""}|${getAccessDate(access)}`;
    const key = access.id ? `access:${access.id}` : `fallback:${fallbackKey}`;
    if (!merged.has(key)) merged.set(key, access);
  }
  return [...merged.values()];
}

function operationalTarget(activity: CommandCenterActivityInput) {
  if (activity.kind === "access" && activity.accessId) return `access:${activity.accessId}`;
  if ((activity.kind === "access" || activity.kind === "account") && activity.studentId) return `student:${activity.studentId}`;
  return contactIdentityKey(activity) || `unlinked:${activity.id}`;
}

function compareActivityRecency(a: CommandCenterActivityInput, b: CommandCenterActivityInput) {
  return (timestamp(a.createdAt) ?? 0) - (timestamp(b.createdAt) ?? 0) || a.id.localeCompare(b.id);
}

function indexLatestOperationalActivities(activities: CommandCenterActivityInput[]) {
  const latest = new Map<string, CommandCenterActivityInput>();
  for (const activity of activities) {
    if (activity.kind !== "access" && activity.kind !== "account") continue;
    const target = operationalTarget(activity);
    if (!target) continue;
    const key = `${activity.kind}:${target}`;
    const current = latest.get(key);
    if (!current || compareActivityRecency(activity, current) > 0) {
      latest.set(key, activity);
    }
  }
  return latest;
}

function indexLatestEmailActivities(activities: CommandCenterActivityInput[]) {
  const latest = new Map<string, CommandCenterActivityInput>();
  for (const activity of activities) {
    if (activity.kind !== "email") continue;
    const target = activity.orderId
      ? `order-id:${activity.orderId}`
      : activity.orderCode
        ? `order-code:${activity.orderCode}`
        : contactIdentityKey(activity)
          ? `contact:${contactIdentityKey(activity)}`
          : `unlinked:${activity.id}`;
    const current = latest.get(target);
    if (!current || compareActivityRecency(activity, current) > 0) latest.set(target, activity);
  }
  return latest;
}

function resolveAccessOperationalState(
  accessRecords: CommandCenterAccessInput[],
  latest: Map<string, CommandCenterActivityInput>,
) {
  const effectiveByAccessId = new Map<string, CommandCenterActivityInput>();
  const coveredKeys = new Set<string>();
  const selectedKeys = new Set<string>();
  for (const access of accessRecords) {
    const keys = [
      `access:access:${access.id}`,
      access.studentId ? `access:student:${access.studentId}` : "",
      contactIdentityKey(access) ? `access:${contactIdentityKey(access)}` : "",
    ].filter(Boolean);
    keys.forEach((key) => coveredKeys.add(key));
    for (const key of keys) {
      const activity = latest.get(key);
      if (!activity) continue;
      effectiveByAccessId.set(access.id, activity);
      selectedKeys.add(key);
      break;
    }
  }
  return { effectiveByAccessId, coveredKeys, selectedKeys };
}

function matchLeadId(
  record: { email?: string | null; phone?: string | null },
  byEmail: Map<string, string>,
  byPhone: Map<string, string>,
) {
  const email = normalizeEmail(record.email);
  if (email && byEmail.has(email)) return byEmail.get(email) ?? null;
  const phone = normalizePhone(record.phone);
  if (phone && byPhone.has(phone)) return byPhone.get(phone) ?? null;
  return null;
}

function buildFunnel(
  leads: CommandCenterLeadInput[],
  orders: CommandCenterOrderInput[],
  accessRecords: CommandCenterAccessInput[],
) {
  const byEmail = new Map<string, string>();
  const byPhone = new Map<string, string>();
  const leadIds = new Set<string>();
  for (const lead of leads) {
    const key = identityKey(lead) || `lead:${lead.id}`;
    leadIds.add(key);
    const email = normalizeEmail(lead.email);
    const phone = normalizePhone(lead.phone);
    if (email && !byEmail.has(email)) byEmail.set(email, key);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, key);
  }

  const pending = new Set<string>();
  const paid = new Set<string>();
  const enrolled = new Set<string>();
  let unlinkedCount = 0;
  for (const order of orders) {
    if (order.status !== "pending" && order.status !== "paid") continue;
    const leadId = matchLeadId(order, byEmail, byPhone);
    if (!leadId) {
      unlinkedCount += 1;
      continue;
    }
    if (order.status === "pending") pending.add(leadId);
    if (order.status === "paid") paid.add(leadId);
  }
  for (const access of accessRecords) {
    if (!isActiveAccess(access)) continue;
    const leadId = matchLeadId(access, byEmail, byPhone);
    if (!leadId) {
      unlinkedCount += 1;
      continue;
    }
    enrolled.add(leadId);
  }

  const totalLeads = leadIds.size;
  const percent = (count: number) => totalLeads === 0 ? 0 : Number(((count / totalLeads) * 100).toFixed(1));
  return {
    rows: [
      { stage: "lead" as const, label: "Lead", count: totalLeads, conversionPercent: totalLeads === 0 ? 0 : 100 },
      { stage: "pending" as const, label: "Chờ thanh toán", count: pending.size, conversionPercent: percent(pending.size) },
      { stage: "paid" as const, label: "Đã thanh toán", count: paid.size, conversionPercent: percent(paid.size) },
      { stage: "enrolled" as const, label: "Đã cấp quyền", count: enrolled.size, conversionPercent: percent(enrolled.size) },
    ],
    unlinkedCount,
  };
}

function buildPriorityTasks(
  orders: CommandCenterOrderInput[],
  accessRecords: CommandCenterAccessInput[],
  activities: CommandCenterActivityInput[],
  latestOperationalActivities: Map<string, CommandCenterActivityInput>,
  accessOperationalState: ReturnType<typeof resolveAccessOperationalState>,
  latestEmailActivities: Map<string, CommandCenterActivityInput>,
  now: Date,
) {
  const tasks: PriorityTask[] = [];
  const nowTime = now.getTime();

  const latestProvisioningByOperation = new Map<string, CommandCenterActivityInput>();
  for (const activity of activities) {
    if (activity.kind !== "provisioning" || !activity.operationId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activity.operationId)) continue;
    const current = latestProvisioningByOperation.get(activity.operationId);
    if (!current || (timestamp(activity.createdAt) ?? 0) > (timestamp(current.createdAt) ?? 0)) {
      latestProvisioningByOperation.set(activity.operationId, activity);
    }
  }
  for (const [operationId, activity] of latestProvisioningByOperation) {
    const outcome = activity.outcomeStatus?.trim().toLowerCase();
    if (outcome !== "partial" && outcome !== "failed") continue;
    const errorCode = activity.errorCode?.trim().toUpperCase() ?? "OPERATION_FAILED";
    const kind: PriorityTask["kind"] = errorCode === "EMAIL_SEND_FAILED"
      ? "email"
      : errorCode === "ACCESS_GRANT_FAILED"
        ? "access"
        : "account";
    tasks.push({
      id: `provisioning-${operationId}`,
      severity: "critical",
      kind,
      title: outcome === "partial" ? "Tạo học viên chưa hoàn tất" : "Tạo học viên thất bại",
      detail: `Thao tác ${operationId} cần được kiểm tra và tiếp tục an toàn`,
      href: `/admin/dashboard?task=${encodeURIComponent(`provisioning-${operationId}`)}#viec-can-xu-ly`,
      actionHref: `/admin/hoc-vien?add_student=1&operation_id=${encodeURIComponent(operationId)}`,
      createdAt: activity.createdAt,
    });
  }

  for (const [key, activity] of latestOperationalActivities) {
    if (activity.status.trim().toLowerCase() !== "failed") continue;
    if (activity.kind !== "account" && activity.kind !== "access") continue;
    if (activity.kind === "access" && accessOperationalState.coveredKeys.has(key) && !accessOperationalState.selectedKeys.has(key)) continue;
    const targetId = activity.accessId || activity.studentId || activity.id;
    const target = operationalTarget(activity);
    const isOpaqueTarget = target.startsWith("unlinked:") || target.startsWith("email:") || target.startsWith("phone:");
    tasks.push({
      id: `activity-${activity.kind}-${activity.id}`,
      severity: "critical",
      kind: activity.kind,
      title: activity.kind === "account" ? "Lỗi tạo tài khoản học viên" : "Lỗi cấp quyền học",
      detail: activity.kind === "account"
        ? `Hoạt động tài khoản ${activity.id} thất bại`
        : `Hoạt động cấp quyền ${activity.id} thất bại`,
      href: isOpaqueTarget
        ? `/admin/viec-can-xu-ly?activity=${encodeURIComponent(activity.id)}`
        : activity.kind === "account"
          ? `/admin/hoc-vien?student=${encodeURIComponent(targetId)}`
          : `/admin/crm-v2/students?access=${encodeURIComponent(targetId)}`,
      createdAt: activity.createdAt,
    });
  }

  for (const [target, activity] of latestEmailActivities) {
    if (!target.startsWith("contact:") || activity.status.trim().toLowerCase() !== "failed") continue;
    tasks.push({
      id: `activity-email-${activity.id}`,
      severity: "critical",
      kind: "email",
      title: "Lỗi gửi email theo liên hệ",
      detail: `Hoạt động gửi email ${activity.id} thất bại`,
      href: `/admin/viec-can-xu-ly?activity=${encodeURIComponent(activity.id)}`,
      createdAt: activity.createdAt,
    });
  }

  for (const order of orders) {
    const orderTime = timestamp(order.createdAt);
    const orderTarget = order.orderCode || order.id;
    if (order.status === "pending" && orderTime !== null && nowTime - orderTime > DAY_MS) {
      tasks.push({
        id: `pending-order-${order.id}`,
        severity: "warning",
        kind: "pending-order",
        title: `Đơn chờ thanh toán ${orderTarget}`,
        detail: `Đơn tạo lúc ${order.createdAt} vẫn chưa thanh toán`,
        href: `/admin/crm-v2/orders?order=${encodeURIComponent(orderTarget)}`,
        createdAt: order.createdAt,
      });
    }

    if (order.status === "paid") {
      const latestEmail = latestEmailActivities.get(`order-id:${order.id}`) ??
        (order.orderCode ? latestEmailActivities.get(`order-code:${order.orderCode}`) : undefined);
      const failedEmail = latestEmail?.status.trim().toLowerCase() === "failed" ? latestEmail : undefined;
      const successTimes = [order.paymentEmailSentAt, order.paymentSuccessEmailSentAt]
        .map(paymentMarkerTimestamp)
        .filter((value): value is number => value !== null);
      const successTime = successTimes.length > 0 ? Math.max(...successTimes) : null;
      const failureTime = timestamp(failedEmail?.createdAt);
      const hasUnresolvedFailure = failureTime !== null && (successTime === null || failureTime > successTime);
      if (successTime === null || hasUnresolvedFailure) {
        tasks.push({
          id: `order-email-${order.id}`,
          severity: "critical",
          kind: "email",
          title: `Email đơn đã thanh toán ${orderTarget} cần xử lý`,
          detail: hasUnresolvedFailure && failedEmail
            ? `Hoạt động gửi email ${failedEmail.id} thất bại sau lần gửi thành công gần nhất`
            : "Chưa có dấu mốc gửi email thanh toán thành công",
          href: `/admin/crm-v2/orders?order=${encodeURIComponent(orderTarget)}`,
          createdAt: failedEmail?.createdAt || order.paidAt || order.createdAt,
        });
      }
    }
  }

  for (const access of accessRecords) {
    if (getAccessKind(access) !== "trial" || !isActiveAccess(access)) continue;
    const expiryTime = timestamp(access.expiresAt);
    if (expiryTime === null || expiryTime < nowTime || expiryTime > nowTime + 3 * DAY_MS) continue;
    tasks.push({
      id: `trial-expiring-${access.id}`,
      severity: "info",
      kind: "trial",
      title: "Quyền dùng thử sắp hết hạn",
      detail: `Quyền dùng thử hết hạn lúc ${access.expiresAt}`,
      href: `/admin/crm-v2/students?access=${encodeURIComponent(access.id)}`,
      createdAt: access.expiresAt || getAccessDate(access),
    });
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return tasks
    .map((task) => ({
      ...task,
      href: `/admin/dashboard?task=${encodeURIComponent(task.id)}#viec-can-xu-ly`,
    }))
    .sort((a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      (timestamp(a.createdAt) ?? 0) - (timestamp(b.createdAt) ?? 0) ||
      a.id.localeCompare(b.id),
    );
}

export function buildSoloCommandCenterModel(input: CommandCenterInput): SoloCommandCenterModel {
  const currentDates = getDateKeys(input.range.from, input.range.to);
  const currentDateSet = new Set(currentDates);
  const previousDates = currentDates.map((_, index) => addDateKeyDays(input.range.from, index - currentDates.length));
  const previousDateSet = new Set(previousDates);
  let generatedAt: Date;
  if (input.generatedAt instanceof Date) {
    generatedAt = input.generatedAt;
  } else {
    try {
      timestamp(input.generatedAt);
    } catch {
      throw new RangeError("Invalid generatedAt");
    }
    generatedAt = new Date(input.generatedAt);
  }
  if (Number.isNaN(generatedAt.getTime())) throw new RangeError("Invalid generatedAt");
  validateRecordTimestamps(input);

  const accessRecords = mergeAccessAliases(input.students ?? [], input.accessRecords ?? []);
  const latestOperationalActivities = indexLatestOperationalActivities(input.activities);
  const accessOperationalState = resolveAccessOperationalState(accessRecords, latestOperationalActivities);
  const latestEmailActivities = indexLatestEmailActivities(input.activities);
  const paidOrders = input.orders.filter((order) => order.status === "paid");
  const currentPaidOrders = paidOrders.filter((order) => isDateIn(toVietnamDateKey(order.paidAt || order.createdAt), currentDateSet));
  const previousPaidOrders = paidOrders.filter((order) => isDateIn(toVietnamDateKey(order.paidAt || order.createdAt), previousDateSet));
  const firstStudentAccess = buildFirstStudentAccess(accessRecords);
  const currentStudents = firstStudentAccess.filter((access) => isDateIn(toVietnamDateKey(getAccessDate(access)), currentDateSet));
  const previousStudents = firstStudentAccess.filter((access) => isDateIn(toVietnamDateKey(getAccessDate(access)), previousDateSet));
  const currentLeads = input.leads.filter((lead) => isDateIn(toVietnamDateKey(lead.createdAt), currentDateSet));
  const previousLeads = input.leads.filter((lead) => isDateIn(toVietnamDateKey(lead.createdAt), previousDateSet));

  const currentRevenueByDate = new Map<string, number>();
  const previousRevenueByDate = new Map<string, number>();
  for (const order of currentPaidOrders) {
    const date = toVietnamDateKey(order.paidAt || order.createdAt);
    currentRevenueByDate.set(date, (currentRevenueByDate.get(date) ?? 0) + order.amount);
  }
  for (const order of previousPaidOrders) {
    const date = toVietnamDateKey(order.paidAt || order.createdAt);
    previousRevenueByDate.set(date, (previousRevenueByDate.get(date) ?? 0) + order.amount);
  }

  const currentOrdersByCreatedDate = input.orders.filter((order) =>
    isDateIn(toVietnamDateKey(order.createdAt), currentDateSet),
  );
  const statusCounts = { paid: 0, pending: 0, failed: 0, refunded: 0, other: 0 };
  for (const order of currentOrdersByCreatedDate) {
    if (order.status === "paid" || order.status === "pending" || order.status === "failed" || order.status === "refunded") {
      statusCounts[order.status] += 1;
    } else {
      statusCounts.other += 1;
    }
  }

  const growthCounts = new Map<string, number>();
  for (const access of firstStudentAccess) {
    const key = `${toVietnamDateKey(getAccessDate(access))}:${getAccessKind(access)}`;
    growthCounts.set(key, (growthCounts.get(key) ?? 0) + 1);
  }
  const studentGrowth = currentDates.flatMap((date) =>
    (["paid", "free", "trial"] as const).map((kind) => ({
      date,
      kind,
      count: growthCounts.get(`${date}:${kind}`) ?? 0,
    })),
  );
  const accessHealthCounts = { active: 0, pending: 0, expiring: 0, error: 0 };
  const nowTime = generatedAt.getTime();
  for (const access of accessRecords) {
    const status = getAccessStatus(access);
    const latestActivity = accessOperationalState.effectiveByAccessId.get(access.id);
    const hasFailure = latestActivity?.status.trim().toLowerCase() === "failed";
    const expiresAt = timestamp(access.expiresAt);
    if (hasFailure || status === "error" || status === "failed" || status === "expired") {
      accessHealthCounts.error += 1;
    } else if (status === "pending") {
      accessHealthCounts.pending += 1;
    } else if (ACTIVE_ACCESS_STATUSES.has(status)) {
      if (expiresAt !== null && expiresAt < nowTime) {
        accessHealthCounts.error += 1;
      } else if (getAccessKind(access) === "trial" && expiresAt !== null && expiresAt <= nowTime + 3 * DAY_MS) {
        accessHealthCounts.expiring += 1;
      } else {
        accessHealthCounts.active += 1;
      }
    }
  }

  return {
    range: { ...input.range },
    generatedAt: generatedAt.toISOString(),
    dataStatus: {
      orders: input.dataStatus?.orders ?? "ready",
      leads: input.dataStatus?.leads ?? "ready",
      courses: input.dataStatus?.courses ?? "ready",
      students: input.dataStatus?.students ?? "ready",
      activities: input.dataStatus?.activities ?? "ready",
    },
    kpis: {
      revenue: metric(
        currentPaidOrders.reduce((sum, order) => sum + order.amount, 0),
        previousPaidOrders.reduce((sum, order) => sum + order.amount, 0),
      ),
      paidOrders: metric(currentPaidOrders.length, previousPaidOrders.length),
      newStudents: metric(currentStudents.length, previousStudents.length),
      newLeads: metric(currentLeads.length, previousLeads.length),
    },
    revenueTrend: currentDates.map((date, index) => ({
      date,
      current: currentRevenueByDate.get(date) ?? 0,
      previous: previousRevenueByDate.get(previousDates[index]) ?? 0,
    })),
    orderStatuses: [
      { status: "paid", label: "Đã thanh toán", count: statusCounts.paid },
      { status: "pending", label: "Chờ thanh toán", count: statusCounts.pending },
      { status: "failed", label: "Thất bại", count: statusCounts.failed },
      { status: "refunded", label: "Đã hoàn tiền", count: statusCounts.refunded },
      { status: "other", label: "Khác", count: statusCounts.other },
    ],
    topCourses: buildTopCourses(currentPaidOrders, input.courses),
    funnel: buildFunnel(currentLeads, currentOrdersByCreatedDate, currentStudents),
    studentGrowth,
    accessHealth: [
      { status: "active", count: accessHealthCounts.active },
      { status: "pending", count: accessHealthCounts.pending },
      { status: "expiring", count: accessHealthCounts.expiring },
      { status: "error", count: accessHealthCounts.error },
    ],
    priorityTasks: buildPriorityTasks(
      input.orders,
      accessRecords,
      input.activities,
      latestOperationalActivities,
      accessOperationalState,
      latestEmailActivities,
      generatedAt,
    ),
  };
}
