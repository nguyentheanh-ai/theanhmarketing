import type { LeadItem } from "@/services/leadService";
import type { PaymentOrder } from "@/services/orderService";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

export type RemarketingSegment = "checkout" | "lead" | "customer" | "other";

export type RemarketingContact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  segment: RemarketingSegment;
  segmentLabel: string;
  tone: Tone;
  priority: number;
  sources: string[];
  utmSource: string;
  utmCampaign: string;
  courseTitles: string[];
  orderCodes: string[];
  paidAmount: number;
  pendingAmount: number;
  lastActivity: string;
  note: string;
  actionLabel: string;
  actionDetail: string;
};

export type RemarketingKpi = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: Tone;
};

export type RemarketingSegmentSummary = {
  id: RemarketingSegment;
  label: string;
  count: number;
  detail: string;
  tone: Tone;
};

type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  sources: Set<string>;
  courseTitles: Set<string>;
  orderCodes: Set<string>;
  paidAmount: number;
  pendingAmount: number;
  paidOrders: number;
  pendingOrders: number;
  leadCount: number;
  lastActivity: string;
  note: string;
  utmSource: string;
  utmCampaign: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function contactKey(input: { email?: string; phone?: string; name?: string }) {
  const email = normalizeEmail(input.email ?? "");
  const phone = normalizePhone(input.phone ?? "");

  if (email) {
    return `email:${email}`;
  }

  if (phone) {
    return `phone:${phone}`;
  }

  return `name:${(input.name ?? "unknown").trim().toLowerCase()}`;
}

function newest(left?: string, right?: string) {
  const leftTime = Date.parse(left ?? "");
  const rightTime = Date.parse(right ?? "");

  if (Number.isNaN(leftTime)) {
    return right ?? "";
  }

  if (Number.isNaN(rightTime)) {
    return left ?? "";
  }

  return rightTime > leftTime ? right ?? "" : left ?? "";
}

function getNoteField(note: string, label: string) {
  const line = note
    .split(/\r?\n/)
    .find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));

  return line?.slice(label.length + 1).trim() ?? "";
}

function getOrCreateContact(map: Map<string, ContactDraft>, key: string) {
  const existing = map.get(key);

  if (existing) {
    return existing;
  }

  const draft: ContactDraft = {
    name: "",
    email: "",
    phone: "",
    sources: new Set(),
    courseTitles: new Set(),
    orderCodes: new Set(),
    paidAmount: 0,
    pendingAmount: 0,
    paidOrders: 0,
    pendingOrders: 0,
    leadCount: 0,
    lastActivity: "",
    note: "",
    utmSource: "",
    utmCampaign: "",
  };

  map.set(key, draft);
  return draft;
}

function resolveSegment(contact: ContactDraft) {
  if (contact.pendingOrders > 0) {
    return {
      segment: "checkout" as const,
      segmentLabel: "Chờ thanh toán",
      tone: "warning" as Tone,
      priority: 1,
      actionLabel: "Nhắc thanh toán",
      actionDetail: "Gửi lại mã đơn, QR và lý do nên hoàn tất ngay.",
    };
  }

  if (contact.leadCount > 0 && contact.paidOrders === 0) {
    return {
      segment: "lead" as const,
      segmentLabel: "Lead chưa mua",
      tone: "info" as Tone,
      priority: 2,
      actionLabel: "Tư vấn nhu cầu",
      actionDetail: "Nhắn theo pain point và hỏi đang vướng offer, content hay tài khoản.",
    };
  }

  if (contact.paidOrders > 0) {
    return {
      segment: "customer" as const,
      segmentLabel: "Đã mua",
      tone: "success" as Tone,
      priority: 3,
      actionLabel: "Upsell / chăm sóc",
      actionDetail: "Mời nâng cấp gói hỗ trợ, AI Master hoặc Performance Marketing.",
    };
  }

  return {
    segment: "other" as const,
    segmentLabel: "Cần phân loại",
    tone: "neutral" as Tone,
    priority: 4,
    actionLabel: "Kiểm tra lại",
    actionDetail: "Bổ sung nguồn, nhu cầu và trạng thái trước khi chạy remarketing.",
  };
}

export function formatVndCompact(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildRemarketingDashboardModel({
  orders,
  leads,
}: {
  orders: PaymentOrder[];
  leads: LeadItem[];
}) {
  const contacts = new Map<string, ContactDraft>();

  for (const order of orders) {
    const key = contactKey(order);
    const contact = getOrCreateContact(contacts, key);

    contact.name ||= order.studentName;
    contact.email ||= order.email;
    contact.phone ||= order.phone;
    contact.sources.add(order.paymentMethod || "checkout");
    contact.courseTitles.add(order.courseTitle || "Chưa rõ khóa học");
    contact.orderCodes.add(order.orderCode);
    contact.lastActivity = newest(contact.lastActivity, order.paidAt ?? order.createdAt);

    if (order.status === "paid") {
      contact.paidOrders += 1;
      contact.paidAmount += order.amount;
    } else if (order.status === "pending") {
      contact.pendingOrders += 1;
      contact.pendingAmount += order.amount;
    }
  }

  for (const lead of leads) {
    const key = contactKey(lead);
    const contact = getOrCreateContact(contacts, key);
    const note = lead.need || "";

    contact.name ||= lead.name;
    contact.email ||= lead.email ?? "";
    contact.phone ||= lead.phone;
    contact.sources.add(lead.source || "Website");
    contact.note ||= note;
    contact.leadCount += 1;
    contact.lastActivity = newest(contact.lastActivity, lead.createdAt);

    const noteCourse = getNoteField(note, "Khóa");
    const noteOrder = getNoteField(note, "Mã đơn");

    if (noteCourse) {
      contact.courseTitles.add(noteCourse);
    }

    if (noteOrder) {
      contact.orderCodes.add(noteOrder);
    }

    contact.utmSource ||= getNoteField(note, "UTM source");
    contact.utmCampaign ||= getNoteField(note, "UTM campaign");
  }

  const contactList: RemarketingContact[] = [...contacts.entries()].map(([id, contact]) => {
    const segment = resolveSegment(contact);

    return {
      id,
      name: contact.name || "Chưa có tên",
      email: contact.email,
      phone: contact.phone,
      sources: [...contact.sources].filter(Boolean),
      utmSource: contact.utmSource,
      utmCampaign: contact.utmCampaign,
      courseTitles: [...contact.courseTitles].filter(Boolean),
      orderCodes: [...contact.orderCodes].filter(Boolean),
      paidAmount: contact.paidAmount,
      pendingAmount: contact.pendingAmount,
      lastActivity: contact.lastActivity,
      note: contact.note,
      ...segment,
    };
  });

  contactList.sort(
    (a, b) =>
      a.priority - b.priority ||
      Date.parse(b.lastActivity || "") - Date.parse(a.lastActivity || ""),
  );

  const checkoutContacts = contactList.filter((contact) => contact.segment === "checkout");
  const leadOnlyContacts = contactList.filter((contact) => contact.segment === "lead");
  const customerContacts = contactList.filter((contact) => contact.segment === "customer");
  const totalPending = checkoutContacts.reduce((sum, contact) => sum + contact.pendingAmount, 0);
  const totalPaid = customerContacts.reduce((sum, contact) => sum + contact.paidAmount, 0);
  const facebookContacts = contactList.filter((contact) =>
    contact.courseTitles.some((title) => title.toLowerCase().includes("facebook")),
  );

  const kpis: RemarketingKpi[] = [
    {
      id: "contacts",
      label: "Tổng liên hệ",
      value: String(contactList.length),
      detail: "Gom từ đơn hàng và lead trong CRM",
      tone: "info",
    },
    {
      id: "checkout",
      label: "Bỏ dở thanh toán",
      value: String(checkoutContacts.length),
      detail: `${formatVndCompact(totalPending)} đang chờ xử lý`,
      tone: checkoutContacts.length > 0 ? "warning" : "neutral",
    },
    {
      id: "lead",
      label: "Lead chưa mua",
      value: String(leadOnlyContacts.length),
      detail: "Có thông tin nhưng chưa có đơn paid",
      tone: leadOnlyContacts.length > 0 ? "info" : "neutral",
    },
    {
      id: "customer",
      label: "Khách đã mua",
      value: String(customerContacts.length),
      detail: `${formatVndCompact(totalPaid)} doanh thu ghi nhận`,
      tone: "success",
    },
  ];

  const segments: RemarketingSegmentSummary[] = [
    {
      id: "checkout",
      label: "Chờ thanh toán",
      count: checkoutContacts.length,
      detail: "Ưu tiên gọi/nhắn trong ngày, gửi lại QR và lợi ích khóa học.",
      tone: "warning",
    },
    {
      id: "lead",
      label: "Lead chưa mua",
      count: leadOnlyContacts.length,
      detail: "Chạy remarketing theo pain point: offer, content, tài khoản, dashboard.",
      tone: "info",
    },
    {
      id: "customer",
      label: "Đã mua",
      count: customerContacts.length,
      detail: "Tệp upsell gói hỗ trợ 799K, AI Master hoặc khóa nâng cao.",
      tone: "success",
    },
    {
      id: "other",
      label: "Cần phân loại",
      count: contactList.filter((contact) => contact.segment === "other").length,
      detail: "Bổ sung nguồn và nhu cầu trước khi đưa vào chiến dịch.",
      tone: "neutral",
    },
  ];

  const sourceCounts = new Map<string, number>();

  for (const contact of contactList) {
    const source = contact.utmSource || contact.sources[0] || "Không rõ nguồn";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  const topSources = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    kpis,
    segments,
    contacts: contactList,
    priorityContacts: contactList.slice(0, 40),
    topSources,
    facebookContacts,
  };
}
