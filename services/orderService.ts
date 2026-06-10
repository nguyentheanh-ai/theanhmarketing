import { fallbackOrders } from "@/data/platform";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createOrderCode,
  createSepayQrUrl,
  formatVnd,
  getSepayOrderCode,
  getSepayReference,
  getSepayTransferAmount,
  isSepayAccountMatched,
  isSepayConfigured,
  parseVndAmount,
  type SepayWebhookPayload,
} from "@/lib/payments/sepay";
import { attributionToDbColumns, normalizeAttribution, type Attribution, type AttributionInput } from "@/lib/tracking/attribution";
import { getCourseBySlug, getCourses } from "@/services/courseService";

export type OrderStatus = "pending" | "paid" | "failed" | "expired";

export type OrderItem = {
  slug: string;
  title: string;
  price: number;
};

export type PaymentOrder = {
  id: string;
  leadId: string | null;
  orderCode: string;
  studentName: string;
  email: string;
  phone: string;
  courseSlug: string;
  courseTitle: string;
  amount: number;
  amountLabel: string;
  currency: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentQrUrl: string;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  sepayReferenceCode: string | null;
  orderItems: OrderItem[];
  paymentEmailSentAt: string | null;
  paymentEmailLastError: string | null;
  purchaseEventSent: boolean;
  attribution: Attribution;
};

type DbOrder = {
  id: string;
  lead_id?: string | null;
  order_code: string;
  student_name: string | null;
  email: string | null;
  phone: string | null;
  course_slug: string | null;
  course_title: string | null;
  amount: string | number | null;
  currency: string | null;
  status: string | null;
  payment_method: string | null;
  payment_qr_url: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  sepay_reference_code: string | null;
  order_items: OrderItem[] | null;
  payment_email_sent_at?: string | null;
  payment_email_last_error?: string | null;
  purchase_event_sent?: boolean | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_id?: string | null;
  utm_term?: string | null;
  campaign_id?: string | null;
  campaign_name?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  ad_name?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  landing_page?: string | null;
};

const orderBaseSelectFields =
  "id,order_code,student_name,email,phone,course_slug,course_title,amount,currency,status,payment_method,payment_qr_url,paid_at,expires_at,created_at,sepay_reference_code,order_items,payment_email_sent_at,payment_email_last_error" as const;
const orderSelectFields =
  "id,lead_id,order_code,student_name,email,phone,course_slug,course_title,amount,currency,status,payment_method,payment_qr_url,paid_at,expires_at,created_at,sepay_reference_code,order_items,payment_email_sent_at,payment_email_last_error,purchase_event_sent,utm_source,utm_campaign,utm_content,utm_medium,utm_id,utm_term,campaign_id,campaign_name,adset_id,ad_id,ad_name,fbclid,fbc,fbp,landing_page" as const;

export type PaymentConfirmationResult = {
  order: PaymentOrder;
  wasAlreadyPaid: boolean;
};

export type CreatePaymentOrderInput = {
  studentName: string;
  email: string;
  phone: string;
  courseSlug?: string;
  courseSlugs?: string[];
  paymentPlan?: string;
  leadId?: string | null;
  attribution?: AttributionInput;
};

export type CreateManualPaidOrderInput = CreatePaymentOrderInput & {
  note?: string;
};

export type ConfirmPaymentInput = {
  phone?: string;
  email?: string;
  amount: number;
  orderCode: string;
  productName: string;
  paymentMethod: string;
  paidAt?: string | null;
};

type LeadAttributionRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source?: string | null;
  created_at?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_id?: string | null;
  utm_term?: string | null;
  campaign_id?: string | null;
  campaign_name?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  ad_name?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  landing_page?: string | null;
};

function toOrderStatus(status: string | null | undefined): OrderStatus {
  if (status === "paid" || status === "failed" || status === "expired") {
    return status;
  }

  return "pending";
}

function mapOrderAttribution(row: DbOrder): Attribution {
  return normalizeAttribution({
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    utmId: row.utm_id,
    utmTerm: row.utm_term,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    adsetId: row.adset_id,
    adId: row.ad_id,
    adName: row.ad_name,
    fbclid: row.fbclid,
    fbc: row.fbc,
    fbp: row.fbp,
    landingPage: row.landing_page,
  });
}

function normalizePhoneDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function mapLeadRowAttribution(row: LeadAttributionRow | null | undefined): Attribution {
  return normalizeAttribution({
    utmSource: row?.utm_source,
    utmMedium: row?.utm_medium,
    utmCampaign: row?.utm_campaign,
    utmContent: row?.utm_content,
    utmId: row?.utm_id,
    utmTerm: row?.utm_term,
    campaignId: row?.campaign_id,
    campaignName: row?.campaign_name,
    adsetId: row?.adset_id,
    adId: row?.ad_id,
    adName: row?.ad_name,
    fbclid: row?.fbclid,
    fbc: row?.fbc,
    fbp: row?.fbp,
    landingPage: row?.landing_page,
  });
}

function mapDbOrder(row: DbOrder): PaymentOrder {
  const amount = parseVndAmount(row.amount);

  return {
    id: row.id,
    leadId: row.lead_id ?? null,
    orderCode: row.order_code,
    studentName: row.student_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    courseSlug: row.course_slug ?? "",
    courseTitle: row.course_title ?? "",
    amount,
    amountLabel: formatVnd(amount),
    currency: row.currency ?? "VND",
    status: toOrderStatus(row.status),
    paymentMethod: row.payment_method ?? "sepay",
    paymentQrUrl: row.payment_qr_url ?? "",
    paidAt: row.paid_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at ?? "",
    sepayReferenceCode: row.sepay_reference_code,
    orderItems: row.order_items ?? [],
    paymentEmailSentAt: row.payment_email_sent_at ?? null,
    paymentEmailLastError: row.payment_email_last_error ?? null,
    purchaseEventSent: Boolean(row.purchase_event_sent),
    attribution: mapOrderAttribution(row),
  };
}

function getFallbackOrders(): PaymentOrder[] {
  return fallbackOrders.map((order) => ({
    id: order.id,
    leadId: null,
    orderCode: order.id,
    studentName: order.student,
    email: "",
    phone: "",
    courseSlug: "",
    courseTitle: order.course,
    amount: parseVndAmount(order.amount),
    amountLabel: order.amount,
    currency: "VND",
    status: order.status.includes("Đã") ? "paid" : "pending",
    paymentMethod: "manual",
    paymentQrUrl: "",
    paidAt: null,
    expiresAt: null,
    createdAt: order.date,
    sepayReferenceCode: null,
    orderItems: [],
    paymentEmailSentAt: null,
    paymentEmailLastError: null,
    purchaseEventSent: false,
    attribution: normalizeAttribution(),
  }));
}

async function resolveCourses(input: CreatePaymentOrderInput) {
  const requestedSlugs = (input.courseSlugs ?? []).filter(Boolean);

  if (requestedSlugs.length > 0) {
    const allCourses = await getCourses();
    return requestedSlugs
      .map((slug) => allCourses.find((course) => course.slug === slug))
      .filter((course): course is NonNullable<typeof course> => Boolean(course));
  }

  if (!input.courseSlug) {
    return [];
  }

  const course = await getCourseBySlug(input.courseSlug);
  return course ? [course] : [];
}

const coursePaymentPlans: Record<string, Record<string, { title: string; amount: number }>> = {
  "facebook-ads-2026": {
    video: {
      title: "Gói Cơ Bản 399K",
      amount: 399000,
    },
    "zoom-kit": {
      title: "Gói AI Agent 799K - Tặng AI Agent lên kế hoạch quảng cáo",
      amount: 799000,
    },
    "advanced-zoom": {
      title: "Gói AI Agent 799K + 1 buổi Zoom chuyên sâu",
      amount: 1299000,
    },
  },
  "bo-agent-kit-x10-hieu-suat-cong-viec": {
    "agent-kit-ads-359": {
      title: "Gói private ads 359K",
      amount: 359000,
    },
  },
};

function buildOrderPackage(
  selectedCourses: Awaited<ReturnType<typeof resolveCourses>>,
  paymentPlan?: string,
) {
  if (paymentPlan) {
    const selectedCourse = selectedCourses[0];
    const plan = selectedCourse ? coursePaymentPlans[selectedCourse.slug]?.[paymentPlan] : undefined;

    if (selectedCourses.length !== 1 || !selectedCourse || !plan) {
      throw new Error("Gói thanh toán không hợp lệ.");
    }

    const title = `${selectedCourse.title} - ${plan.title}`;

    return {
      amount: plan.amount,
      courseSlug: selectedCourse.slug,
      courseTitle: title,
      orderItems: [
        {
          slug: selectedCourse.slug,
          title,
          price: plan.amount,
        },
      ],
    };
  }

  const amount = selectedCourses.reduce((sum, course) => sum + parseVndAmount(course.price), 0);

  return {
    amount,
    courseSlug: selectedCourses.map((course) => course.slug).join(","),
    courseTitle: selectedCourses.map((course) => course.title).join(" | "),
    orderItems: selectedCourses.map((course) => ({
      slug: course.slug,
      title: course.title,
      price: parseVndAmount(course.price),
    })),
  };
}

export async function createPaymentOrder(input: CreatePaymentOrderInput) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase để tạo đơn thanh toán.");
  }

  const selectedCourses = await resolveCourses(input);

  if (selectedCourses.length === 0) {
    throw new Error("Không tìm thấy khóa học đã chọn.");
  }

  const orderPackage = buildOrderPackage(selectedCourses, input.paymentPlan);
  const { amount, courseSlug, courseTitle, orderItems } = orderPackage;

  if (amount <= 0) {
    throw new Error("Giỏ hàng chưa có giá thanh toán hợp lệ.");
  }

  const orderCode = createOrderCode();
  const paymentQrUrl = isSepayConfigured() ? createSepayQrUrl({ amount, orderCode }) : "";
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  const attribution = normalizeAttribution(input.attribution);

  const firstInsert = await supabase
    .from("orders")
    .insert({
      lead_id: input.leadId ?? null,
      order_code: orderCode,
      student_name: input.studentName,
      email: input.email,
      phone: input.phone,
      course_slug: courseSlug,
      course_title: courseTitle,
      amount,
      currency: "VND",
      status: "pending",
      payment_status: "pending",
      payment_method: "sepay",
      payment_qr_url: paymentQrUrl,
      expires_at: expiresAt,
      order_items: orderItems,
      purchase_event_sent: false,
      ...attributionToDbColumns(attribution),
    })
    .select(orderSelectFields)
    .single();

  if (!firstInsert.error && firstInsert.data) {
    return mapDbOrder(firstInsert.data as DbOrder);
  }

  // Backward compatible with existing orders schema that does not have order_items.
  const fallbackInsert = await supabase
    .from("orders")
    .insert({
      order_code: orderCode,
      student_name: input.studentName,
      email: input.email,
      phone: input.phone,
      course_slug: courseSlug,
      course_title: courseTitle,
      amount,
      currency: "VND",
      status: "pending",
      payment_method: "sepay",
      payment_qr_url: paymentQrUrl,
      expires_at: expiresAt,
    })
    .select(orderBaseSelectFields)
    .single();

  if (fallbackInsert.error || !fallbackInsert.data) {
    throw new Error(
      fallbackInsert.error?.message ?? firstInsert.error?.message ?? "Không tạo được đơn thanh toán.",
    );
  }

  return mapDbOrder(fallbackInsert.data as DbOrder);
}

export async function createManualPaidOrder(input: CreateManualPaidOrderInput) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase để cấp quyền học viên.");
  }

  const selectedCourses = await resolveCourses(input);

  if (selectedCourses.length === 0) {
    throw new Error("Không tìm thấy khóa học đã chọn.");
  }

  const orderPackage = buildOrderPackage(selectedCourses, input.paymentPlan);
  const { amount, courseSlug, courseTitle, orderItems } = orderPackage;
  const orderCode = createOrderCode();
  const paidAt = new Date().toISOString();
  const attribution = normalizeAttribution(input.attribution);

  const firstInsert = await supabase
    .from("orders")
    .insert({
      lead_id: input.leadId ?? null,
      order_code: orderCode,
      student_name: input.studentName,
      email: input.email,
      phone: input.phone,
      course_slug: courseSlug,
      course_title: courseTitle,
      amount,
      currency: "VND",
      status: "paid",
      payment_status: "paid",
      payment_method: "manual-admin",
      payment_qr_url: "",
      paid_at: paidAt,
      order_items: orderItems,
      purchase_event_sent: false,
      ...attributionToDbColumns(attribution),
    })
    .select(orderSelectFields)
    .single();

  if (!firstInsert.error && firstInsert.data) {
    return mapDbOrder(firstInsert.data as DbOrder);
  }

  const fallbackInsert = await supabase
    .from("orders")
    .insert({
      order_code: orderCode,
      student_name: input.studentName,
      email: input.email,
      phone: input.phone,
      course_slug: courseSlug,
      course_title: courseTitle,
      amount,
      currency: "VND",
      status: "paid",
      payment_method: "manual-admin",
      payment_qr_url: "",
      paid_at: paidAt,
    })
    .select(orderSelectFields)
    .single();

  if (fallbackInsert.error || !fallbackInsert.data) {
    throw new Error(
      fallbackInsert.error?.message ?? firstInsert.error?.message ?? "Không cấp được quyền học viên.",
    );
  }

  return mapDbOrder(fallbackInsert.data as DbOrder);
}

export async function getPaymentOrder(orderCode: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const primaryRead = await supabase
    .from("orders")
    .select(orderSelectFields)
    .eq("order_code", orderCode.toUpperCase())
    .maybeSingle();
  let data: unknown = primaryRead.data;
  let error = primaryRead.error;

  if (error) {
    const fallback = await supabase
      .from("orders")
      .select(orderBaseSelectFields)
      .eq("order_code", orderCode.toUpperCase())
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    return null;
  }

  return mapDbOrder(data as DbOrder);
}

export async function getPaymentOrders(options: { includeFallback?: boolean } = {}) {
  const includeFallback = options.includeFallback ?? false;
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseAdminClient()
    : await (await import("@/lib/auth/session")).createSupabaseAuthServerClient();

  if (!supabase) {
    return includeFallback ? getFallbackOrders() : [];
  }

  const primaryRead = await supabase
    .from("orders")
    .select(orderSelectFields)
    .order("created_at", { ascending: false });
  let data: unknown = primaryRead.data;
  let error = primaryRead.error;

  if (error) {
    const fallback = await supabase
      .from("orders")
      .select(orderBaseSelectFields)
      .order("created_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  const rows = (data ?? []) as DbOrder[];

  if (error || rows.length === 0) {
    if (!includeFallback) {
      return [];
    }

    return getFallbackOrders();
  }

  return rows.map(mapDbOrder);
}

async function findLatestLeadForPayment(input: { phone?: string; email?: string }) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return null;

  const email = normalizeEmail(input.email);
  const phoneDigits = normalizePhoneDigits(input.phone);
  const select =
    "id,name,phone,email,source,created_at,utm_source,utm_medium,utm_campaign,utm_content,utm_id,utm_term,campaign_id,campaign_name,adset_id,ad_id,ad_name,fbclid,fbc,fbp,landing_page";

  if (email) {
    const primary = await supabase
      .from("leads")
      .select(select)
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let data: unknown = primary.data;
    if (primary.error) {
      const fallback = await supabase
        .from("leads")
        .select("id,name,phone,email,source,created_at")
        .ilike("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      data = fallback.data;
    }
    if (data) return data as LeadAttributionRow;
  }

  if (!phoneDigits) return null;

  const primary = await supabase
    .from("leads")
    .select(select)
    .order("created_at", { ascending: false })
    .limit(1000);
  let data: unknown = primary.data;
  if (primary.error) {
    const fallback = await supabase
      .from("leads")
      .select("id,name,phone,email,source,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    data = fallback.data;
  }

  return ((data ?? []) as LeadAttributionRow[]).find((lead) => normalizePhoneDigits(lead.phone) === phoneDigits) ?? null;
}

async function markLeadPaid(leadId: string | null, orderCode: string, paidAt = new Date().toISOString()) {
  if (!leadId) return;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  await supabase
    .from("leads")
    .update({
      payment_status: "paid",
      paid_at: paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
}

export async function confirmPaymentManually(input: ConfirmPaymentInput): Promise<PaymentConfirmationResult> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Chua cau hinh Supabase de xac nhan thanh toan.");
  }

  const orderCode = String(input.orderCode || "").trim().toUpperCase();
  const paidAt = input.paidAt ? new Date(input.paidAt).toISOString() : new Date().toISOString();
  const lead = await findLatestLeadForPayment({ phone: input.phone, email: input.email });
  const attribution = mapLeadRowAttribution(lead);
  const customerName = lead?.name || normalizeEmail(input.email) || normalizePhoneDigits(input.phone) || "Khach hang";
  const existing = await getPaymentOrder(orderCode);

  if (existing?.status === "paid") {
    await markLeadPaid(existing.leadId ?? lead?.id ?? null, orderCode, existing.paidAt ?? paidAt);
    return { order: existing, wasAlreadyPaid: true };
  }

  if (existing) {
    const primary = await supabase
      .from("orders")
      .update({
        lead_id: existing.leadId ?? lead?.id ?? null,
        student_name: existing.studentName || customerName,
        phone: existing.phone || input.phone || lead?.phone || "",
        email: existing.email || normalizeEmail(input.email) || lead?.email || "",
        course_title: input.productName || existing.courseTitle,
        amount: input.amount || existing.amount,
        currency: "VND",
        status: "paid",
        payment_status: "paid",
        payment_method: input.paymentMethod || existing.paymentMethod || "manual-confirm",
        paid_at: paidAt,
        updated_at: new Date().toISOString(),
        ...attributionToDbColumns(attribution),
      })
      .eq("order_code", orderCode)
      .select(orderSelectFields)
      .single();
    let data: unknown = primary.data;
    let error = primary.error;

    if (error) {
      const fallback = await supabase
        .from("orders")
        .update({
          student_name: existing.studentName || customerName,
          phone: existing.phone || input.phone || lead?.phone || "",
          email: existing.email || normalizeEmail(input.email) || lead?.email || "",
          course_title: input.productName || existing.courseTitle,
          amount: input.amount || existing.amount,
          currency: "VND",
          status: "paid",
          payment_method: input.paymentMethod || existing.paymentMethod || "manual-confirm",
          paid_at: paidAt,
          updated_at: new Date().toISOString(),
        })
        .eq("order_code", orderCode)
        .select(orderBaseSelectFields)
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) throw new Error(error?.message ?? "Khong cap nhat duoc don thanh toan.");
    await markLeadPaid(lead?.id ?? null, orderCode, paidAt);
    return { order: mapDbOrder(data as DbOrder), wasAlreadyPaid: false };
  }

  const primary = await supabase
    .from("orders")
    .insert({
      lead_id: lead?.id ?? null,
      order_code: orderCode,
      student_name: customerName,
      email: normalizeEmail(input.email) || lead?.email || "",
      phone: input.phone || lead?.phone || "",
      course_slug: "",
      course_title: input.productName,
      amount: input.amount,
      currency: "VND",
      status: "paid",
      payment_status: "paid",
      payment_method: input.paymentMethod || "manual-confirm",
      payment_qr_url: "",
      paid_at: paidAt,
      order_items: [{ slug: "", title: input.productName, price: input.amount }],
      purchase_event_sent: false,
      ...attributionToDbColumns(attribution),
    })
    .select(orderSelectFields)
    .single();
  let data: unknown = primary.data;
  let error = primary.error;

  if (error) {
    const fallback = await supabase
      .from("orders")
      .insert({
        order_code: orderCode,
        student_name: customerName,
        email: normalizeEmail(input.email) || lead?.email || "",
        phone: input.phone || lead?.phone || "",
        course_slug: "",
        course_title: input.productName,
        amount: input.amount,
        currency: "VND",
        status: "paid",
        payment_method: input.paymentMethod || "manual-confirm",
        payment_qr_url: "",
        paid_at: paidAt,
      })
      .select(orderBaseSelectFields)
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) throw new Error(error?.message ?? "Khong tao duoc don thanh toan.");
  await markLeadPaid(lead?.id ?? null, orderCode, paidAt);
  return { order: mapDbOrder(data as DbOrder), wasAlreadyPaid: false };
}

export async function expirePendingPaymentOrders(now = new Date()) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase để cập nhật đơn hết hạn.");
  }

  const timestamp = now.toISOString();
  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "expired",
      updated_at: timestamp,
    })
    .eq("status", "pending")
    .lt("expires_at", timestamp)
    .select(orderBaseSelectFields);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DbOrder[]).map(mapDbOrder);
}

export async function expirePaymentOrderIfOverdue(orderCode: string, now = new Date()) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase để cập nhật đơn hết hạn.");
  }

  const timestamp = now.toISOString();
  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "expired",
      updated_at: timestamp,
    })
    .eq("order_code", orderCode.toUpperCase())
    .eq("status", "pending")
    .lt("expires_at", timestamp)
    .select(orderBaseSelectFields)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapDbOrder(data as DbOrder) : null;
}

export async function confirmOrderFromSepay(payload: SepayWebhookPayload): Promise<PaymentConfirmationResult> {
  const transferType = String(payload.transferType ?? payload.transfer_type ?? "").toLowerCase();

  if (transferType && transferType !== "in") {
    throw new Error("Webhook Sepay không phải giao dịch tiền vào.");
  }

  if (!isSepayAccountMatched(payload)) {
    throw new Error("Webhook Sepay không khớp tài khoản nhận tiền.");
  }

  const orderCode = getSepayOrderCode(payload);
  const receivedAmount = getSepayTransferAmount(payload);

  if (!orderCode) {
    throw new Error("Webhook Sepay thiếu mã đơn.");
  }

  const order = await getPaymentOrder(orderCode);

  if (!order) {
    throw new Error(`Không tìm thấy đơn ${orderCode}.`);
  }

  if (order.status === "paid") {
    return { order, wasAlreadyPaid: true };
  }

  if (receivedAmount < order.amount) {
    throw new Error("Số tiền nhận được chưa khớp với đơn hàng.");
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase để cập nhật đơn.");
  }

  const primary = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      sepay_transaction_id: payload.id ? String(payload.id) : null,
      sepay_reference_code: getSepayReference(payload),
      sepay_payload: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode)
    .select(orderSelectFields)
    .single();
  let data: unknown = primary.data;
  let error = primary.error;

  if (error) {
    const fallback = await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        sepay_transaction_id: payload.id ? String(payload.id) : null,
        sepay_reference_code: getSepayReference(payload),
        sepay_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("order_code", orderCode)
      .select(orderBaseSelectFields)
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    throw new Error(error?.message ?? "Không cập nhật được đơn hàng.");
  }

  return { order: mapDbOrder(data as DbOrder), wasAlreadyPaid: false };
}

export async function markPurchaseEventSent(orderCode: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, error: "Missing Supabase admin client" };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      purchase_event_sent: true,
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode.toUpperCase());

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function markPaymentEmailSent(orderCode: string, sentAt = new Date().toISOString()) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, error: "Missing Supabase admin client" };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      payment_email_sent_at: sentAt,
      payment_email_last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode.toUpperCase());

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}

export async function markPaymentEmailError(orderCode: string, reason: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, error: "Missing Supabase admin client" };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      payment_email_last_error: reason.slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode.toUpperCase());

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}
