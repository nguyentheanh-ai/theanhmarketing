import { sampleOrders } from "@/data/platform";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createOrderCode,
  createSepayQrUrl,
  createVietQrUrl,
  formatVnd,
  getSepayOrderCode,
  getSepayReference,
  getSepayTransferAmount,
  isSepayAccountMatched,
  isSepayConfigured,
  parseVndAmount,
  type SepayWebhookPayload,
} from "@/lib/payments/sepay";
import { getCourseBySlug, getCourses } from "@/services/courseService";

export type OrderStatus = "pending" | "paid" | "failed" | "expired";

export type OrderItem = {
  slug: string;
  title: string;
  price: number;
};

export type PaymentOrder = {
  id: string;
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
};

type DbOrder = {
  id: string;
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
};

export type CreatePaymentOrderInput = {
  studentName: string;
  email: string;
  phone: string;
  courseSlug?: string;
  courseSlugs?: string[];
};

export type CreateManualPaidOrderInput = CreatePaymentOrderInput & {
  note?: string;
};

function toOrderStatus(status: string | null | undefined): OrderStatus {
  if (status === "paid" || status === "failed" || status === "expired") {
    return status;
  }

  return "pending";
}

function mapDbOrder(row: DbOrder): PaymentOrder {
  const amount = parseVndAmount(row.amount);

  return {
    id: row.id,
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
  };
}

function getFallbackOrders(): PaymentOrder[] {
  return sampleOrders.map((order) => ({
    id: order.id,
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

export async function createPaymentOrder(input: CreatePaymentOrderInput) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase để tạo đơn thanh toán.");
  }

  const selectedCourses = await resolveCourses(input);

  if (selectedCourses.length === 0) {
    throw new Error("Không tìm thấy khóa học đã chọn.");
  }

  const amount = selectedCourses.reduce((sum, course) => sum + parseVndAmount(course.price), 0);

  if (amount <= 0) {
    throw new Error("Giỏ hàng chưa có giá thanh toán hợp lệ.");
  }

  const orderCode = createOrderCode();
  const paymentQrUrl = isSepayConfigured()
    ? createVietQrUrl({ amount, orderCode }) || createSepayQrUrl({ amount, orderCode })
    : "";
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  const courseSlug = selectedCourses.map((course) => course.slug).join(",");
  const courseTitle = selectedCourses.map((course) => course.title).join(" | ");
  const orderItems: OrderItem[] = selectedCourses.map((course) => ({
    slug: course.slug,
    title: course.title,
    price: parseVndAmount(course.price),
  }));

  const firstInsert = await supabase
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
      order_items: orderItems,
    })
    .select("*")
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
    .select("*")
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

  const amount = selectedCourses.reduce((sum, course) => sum + parseVndAmount(course.price), 0);
  const orderCode = createOrderCode();
  const courseSlug = selectedCourses.map((course) => course.slug).join(",");
  const courseTitle = selectedCourses.map((course) => course.title).join(" | ");
  const orderItems: OrderItem[] = selectedCourses.map((course) => ({
    slug: course.slug,
    title: course.title,
    price: parseVndAmount(course.price),
  }));
  const paidAt = new Date().toISOString();

  const firstInsert = await supabase
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
      order_items: orderItems,
    })
    .select("*")
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
    .select("*")
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

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_code", orderCode.toUpperCase())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapDbOrder(data as DbOrder);
}

export async function getPaymentOrders(options: { includeFallback?: boolean } = {}) {
  const includeFallback = options.includeFallback ?? true;
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return includeFallback ? getFallbackOrders() : [];
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    if (!includeFallback) {
      return [];
    }

    return getFallbackOrders();
  }

  return (data as DbOrder[]).map(mapDbOrder);
}

export async function confirmOrderFromSepay(payload: SepayWebhookPayload) {
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
    return order;
  }

  if (receivedAmount < order.amount) {
    throw new Error("Số tiền nhận được chưa khớp với đơn hàng.");
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase để cập nhật đơn.");
  }

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      sepay_transaction_id: payload.id ? String(payload.id) : null,
      sepay_reference_code: getSepayReference(payload),
      sepay_payload: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Không cập nhật được đơn hàng.");
  }

  return mapDbOrder(data as DbOrder);
}
