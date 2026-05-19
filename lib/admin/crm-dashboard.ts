import type { LeadItem } from "@/services/leadService";
import type { PaymentOrder, OrderStatus } from "@/services/orderService";
import type { StudentAccessRecord } from "@/services/studentAccessService";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

type DashboardInput = {
  orders: PaymentOrder[];
  leads: LeadItem[];
  students: StudentAccessRecord[];
  now?: Date;
};

export type AdminKpi = {
  id: string;
  label: string;
  value: string;
  detail: string;
  href: string;
  tone: Tone;
};

export type AdminPriorityTask = {
  id: string;
  type: "order" | "lead" | "student";
  title: string;
  detail: string;
  href: string;
  tone: Tone;
  createdAt: string;
};

export type AdminPipelineItem = {
  id: "new" | "pending" | "won" | "access";
  label: string;
  count: number;
  detail: string;
  href: string;
  tone: Tone;
};

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function formatAdminDate(value?: string | null) {
  if (!value) {
    return "Chưa có thời gian";
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  const parts = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date(timestamp))
    .reduce<Record<string, string>>((current, part) => {
      current[part.type] = part.value;
      return current;
    }, {});

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

export function getOrderStatusMeta(status: OrderStatus | string) {
  if (status === "paid") {
    return { label: "Đã thanh toán", tone: "success" as Tone };
  }

  if (status === "failed") {
    return { label: "Thất bại", tone: "danger" as Tone };
  }

  if (status === "expired") {
    return { label: "Hết hạn", tone: "neutral" as Tone };
  }

  return { label: "Chờ thanh toán", tone: "warning" as Tone };
}

export function getAccessStatusMeta(status: string) {
  const normalized = normalizeText(status);

  if (normalized.includes("co quyen")) {
    return { label: "Có quyền học", tone: "success" as Tone };
  }

  return { label: "Chờ cấp quyền", tone: "warning" as Tone };
}

export function getLeadStatusMeta(status: string) {
  const normalized = normalizeText(status);

  if (normalized.includes("da") || normalized.includes("done")) {
    return { label: status || "Đã xử lý", tone: "success" as Tone };
  }

  if (normalized.includes("nong") || normalized.includes("hot")) {
    return { label: status || "Lead nóng", tone: "danger" as Tone };
  }

  return { label: status || "Mới", tone: "info" as Tone };
}

function compareNewest(a?: string | null, b?: string | null) {
  return Date.parse(b ?? "") - Date.parse(a ?? "");
}

function orderCreatedAt(order: PaymentOrder) {
  return order.paidAt ?? order.createdAt ?? "";
}

function studentNeedsAccess(student: StudentAccessRecord) {
  return getAccessStatusMeta(student.accessStatus).tone !== "success";
}

function getTaskWeight(task: AdminPriorityTask) {
  if (task.type === "order") {
    return 0;
  }

  if (task.type === "lead") {
    return 1;
  }

  return 2;
}

export function buildAdminDashboardModel({ orders, leads, students }: DashboardInput) {
  const paidOrders = orders.filter((order) => order.status === "paid");
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const revenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);
  const grantedStudents = students.filter((student) => getAccessStatusMeta(student.accessStatus).tone === "success");
  const pendingStudents = students.filter(studentNeedsAccess);
  const newLeads = leads.filter((lead) => getLeadStatusMeta(lead.status).tone !== "success");

  const kpis: AdminKpi[] = [
    {
      id: "revenue",
      label: "Doanh thu",
      value: formatVnd(revenue),
      detail: `${paidOrders.length} đơn đã thanh toán`,
      href: "/admin/don-hang",
      tone: "success",
    },
    {
      id: "pendingOrders",
      label: "Đơn chờ",
      value: String(pendingOrders.length),
      detail: "Cần đối soát hoặc nhắc thanh toán",
      href: "/admin/don-hang",
      tone: pendingOrders.length > 0 ? "warning" : "neutral",
    },
    {
      id: "newLeads",
      label: "Lead mới",
      value: String(newLeads.length),
      detail: `${leads.length} lead trong hệ thống`,
      href: "/admin/leads",
      tone: newLeads.length > 0 ? "info" : "neutral",
    },
    {
      id: "activeStudents",
      label: "Học viên",
      value: String(grantedStudents.length),
      detail: `${pendingStudents.length} hồ sơ chờ cấp quyền`,
      href: "/admin/hoc-vien",
      tone: pendingStudents.length > 0 ? "warning" : "success",
    },
  ];

  const priorityTasks: AdminPriorityTask[] = [
    ...pendingOrders.slice(0, 3).map((order) => ({
      id: `order:${order.id}`,
      type: "order" as const,
      title: `Đối soát đơn ${order.orderCode}`,
      detail: `${order.studentName || "Chưa có tên"} · ${order.amountLabel}`,
      href: "/admin/don-hang",
      tone: "warning" as Tone,
      createdAt: order.createdAt,
    })),
    ...newLeads.slice(0, 3).map((lead) => ({
      id: `lead:${lead.id ?? `${lead.name}-${lead.phone}`}`,
      type: "lead" as const,
      title: `Chăm sóc ${lead.name || "lead mới"}`,
      detail: `${lead.source || "Website"} · ${lead.need || lead.phone || "Chưa có nhu cầu"}`,
      href: "/admin/leads",
      tone: getLeadStatusMeta(lead.status).tone,
      createdAt: lead.createdAt ?? "",
    })),
    ...pendingStudents.slice(0, 3).map((student) => ({
      id: `student:${student.id}`,
      type: "student" as const,
      title: `Kiểm tra quyền học ${student.name || student.email || "học viên"}`,
      detail: student.courseTitles.length > 0 ? student.courseTitles.join(", ") : student.paymentStatus,
      href: "/admin/hoc-vien",
      tone: "warning" as Tone,
      createdAt: student.updatedAt,
    })),
  ]
    .sort((a, b) => getTaskWeight(a) - getTaskWeight(b) || compareNewest(a.createdAt, b.createdAt))
    .slice(0, 6);

  const pipeline: AdminPipelineItem[] = [
    {
      id: "new",
      label: "Lead mới",
      count: newLeads.length,
      detail: "Cần gọi hoặc nhắn tin",
      href: "/admin/leads",
      tone: "info",
    },
    {
      id: "pending",
      label: "Chờ thanh toán",
      count: pendingOrders.length,
      detail: "Đơn cần theo dõi",
      href: "/admin/don-hang",
      tone: "warning",
    },
    {
      id: "won",
      label: "Đã mua",
      count: paidOrders.length,
      detail: "Doanh thu ghi nhận",
      href: "/admin/don-hang",
      tone: "success",
    },
    {
      id: "access",
      label: "Cấp quyền",
      count: pendingStudents.length,
      detail: "Hồ sơ cần kiểm tra",
      href: "/admin/hoc-vien",
      tone: pendingStudents.length > 0 ? "warning" : "neutral",
    },
  ];

  return {
    revenue,
    paidOrders,
    pendingOrders,
    grantedStudents,
    pendingStudents,
    newLeads,
    kpis,
    priorityTasks,
    pipeline,
    recentOrders: [...orders].sort((a, b) => compareNewest(orderCreatedAt(a), orderCreatedAt(b))).slice(0, 6),
    recentLeads: [...leads].sort((a, b) => compareNewest(a.createdAt, b.createdAt)).slice(0, 6),
    recentStudents: [...students].sort((a, b) => compareNewest(a.updatedAt, b.updatedAt)).slice(0, 6),
  };
}
