import {
  SUPPORT_HOLD_MINUTES,
  SUPPORT_MAX_LEAD_DAYS,
  type SupportBookingType,
  SUPPORT_MIN_LEAD_DAYS,
  SUPPORT_PRICE_VND,
  SUPPORT_PRODUCT_SLUG,
} from "@/lib/support-booking/constants";
import {
  getSupportBookingWindow,
  isSupportSunday,
  toVietnamAppointment,
  listSupportSlots,
  validateSupportBookingInput,
  type SupportBookingInput,
} from "@/lib/support-booking/domain";
import { isAdminEmail } from "@/lib/course-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupportPaymentOrder, getPaymentOrders } from "@/services/orderService";

type SupportBookingRow = {
  id: string;
  customer_name?: string;
  email?: string;
  phone?: string;
  topic?: string;
  note?: string;
  appointment_date: string;
  appointment_time: string;
  starts_at: string;
  ends_at: string;
  duration_minutes?: number;
  booking_type?: SupportBookingType;
  status: "held" | "confirmed" | "needs_review" | "cancelled";
  hold_expires_at: string;
  order_id?: string | null;
  order_code?: string | null;
};

export type ConfirmedSupportBooking = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  startsAt: string;
  endsAt: string;
  topic: string;
  note: string;
  status: SupportBookingRow["status"];
  durationMinutes: number;
  bookingType: SupportBookingType;
};

export type SupportBookingAdminRow = ConfirmedSupportBooking & {
  customerName: string;
  email: string;
  phone: string;
  amount: number;
  orderCode: string;
  paidAt: string;
};

export type SupportAvailabilityDay = {
  date: string;
  busy: boolean;
  slots: Array<{ time: string; available: boolean }>;
};

export type EligibleSupportCustomer = {
  customerName: string;
  email: string;
  phone: string;
  purchasedCourseSlug: string;
  previewMode?: boolean;
};

export class SupportBookingConflictError extends Error {}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function purchasedCourseSlugs(order: { courseSlug: string; orderItems: Array<{ slug: string }> }) {
  const slugs = order.orderItems.length
    ? order.orderItems.map((item) => item.slug)
    : order.courseSlug.split(",");
  return slugs.map((slug) => slug.trim()).filter((slug) => slug && slug !== SUPPORT_PRODUCT_SLUG);
}

export async function getEligibleSupportCustomer(
  email: string,
  metadata?: Record<string, unknown> | null,
  options: { allowOwnerPreview?: boolean } = {},
): Promise<EligibleSupportCustomer | null> {
  if (isLocalDemo()) {
    return {
      customerName: "Nguyễn Minh Anh",
      email: email.trim() || "minhanh.demo@gmail.com",
      phone: "0900000000",
      purchasedCourseSlug: "facebook-ads-2026",
    };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const orders = await getPaymentOrders({ includeFallback: false, strict: true });
  const matchingCourseOrders = orders
    .filter((order) => normalizeEmail(order.email) === normalizedEmail)
    .map((order) => ({ order, slugs: purchasedCourseSlugs(order) }))
    .filter((entry) => entry.slugs.length > 0)
    .sort((a, b) => Date.parse(b.order.paidAt ?? b.order.createdAt) - Date.parse(a.order.paidAt ?? a.order.createdAt));

  const latestPaid = matchingCourseOrders.find((entry) => entry.order.status === "paid");
  const ownerPreview = !latestPaid && options.allowOwnerPreview === true && isAdminEmail(normalizedEmail);
  const latest = latestPaid ?? (ownerPreview ? matchingCourseOrders[0] : undefined);
  if (!latest) return null;
  const customerName = latest.order.studentName.trim()
    || (typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "")
    || normalizedEmail.split("@")[0];
  const phone = latest.order.phone.trim()
    || (typeof metadata?.phone === "string" ? metadata.phone.trim() : "");
  return {
    customerName,
    email: normalizedEmail,
    phone,
    purchasedCourseSlug: latest.slugs[0],
    ...(ownerPreview ? { previewMode: true } : {}),
  };
}

function isLocalDemo() {
  return process.env.NODE_ENV !== "production" && process.env.SUPPORT_BOOKING_DEMO !== "false";
}

function addDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function listDates(minDate: string, maxDate: string) {
  const dates: string[] = [];
  for (let date = minDate; date <= maxDate; date = addDays(date, 1)) dates.push(date);
  return dates;
}

export async function getSupportAvailability(now = new Date()): Promise<{
  minLeadDays: number;
  maxLeadDays: number;
  days: SupportAvailabilityDay[];
}> {
  const { minDate, maxDate } = getSupportBookingWindow(now);
  const dates = listDates(minDate, maxDate);
  const slots = listSupportSlots();

  if (isLocalDemo()) {
    return {
      minLeadDays: SUPPORT_MIN_LEAD_DAYS,
      maxLeadDays: SUPPORT_MAX_LEAD_DAYS,
      days: dates.map((date) => ({
        date,
        busy: isSupportSunday(date),
        slots: slots.map((time) => ({ time, available: !isSupportSunday(date) })),
      })),
    };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Chưa cấu hình dữ liệu lịch hỗ trợ.");

  const [busyResult, bookingResult] = await Promise.all([
    supabase.from("support_busy_dates").select("busy_date").gte("busy_date", minDate).lte("busy_date", maxDate),
    supabase
      .from("support_bookings")
      .select("appointment_date,appointment_time,starts_at,ends_at,status,hold_expires_at")
      .gte("appointment_date", minDate)
      .lte("appointment_date", maxDate)
      .in("status", ["held", "confirmed"]),
  ]);

  if (busyResult.error || bookingResult.error) {
    throw new Error(busyResult.error?.message ?? bookingResult.error?.message ?? "Không đọc được lịch hỗ trợ.");
  }

  const busyDates = new Set((busyResult.data ?? []).map((row) => String(row.busy_date)));
  const occupied = (bookingResult.data ?? [])
    .filter((row) => row.status === "confirmed" || Date.parse(String(row.hold_expires_at)) > now.getTime())
    .map((row) => ({ start: Date.parse(String(row.starts_at)), end: Date.parse(String(row.ends_at)) }));

  return {
    minLeadDays: SUPPORT_MIN_LEAD_DAYS,
    maxLeadDays: SUPPORT_MAX_LEAD_DAYS,
    days: dates.map((date) => ({
      date,
      busy: isSupportSunday(date) || busyDates.has(date),
      slots: slots.map((time) => {
        const appointment = toVietnamAppointment(date, time);
        const start = Date.parse(appointment.startsAt);
        const end = Date.parse(appointment.endsAt);
        return { time, available: !isSupportSunday(date) && !busyDates.has(date) && !occupied.some((range) => range.start < end && range.end > start) };
      }),
    })),
  };
}

export async function reserveSupportBooking(input: unknown, now = new Date(), bookingType: SupportBookingType = "student") {
  const bookingInput = validateSupportBookingInput(input, now, bookingType);

  if (isLocalDemo()) {
    return {
      bookingId: "local-support-demo",
      orderCode: "SUPPORTDEMO",
      checkoutUrl: "/thanh-toan/SUPPORTDEMO",
      appointment: bookingInput,
      demo: true,
    };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Chưa cấu hình dữ liệu lịch hỗ trợ.");
  const holdExpiresAt = new Date(now.getTime() + SUPPORT_HOLD_MINUTES * 60_000).toISOString();

  const reservation = await supabase.rpc("reserve_support_booking_v2", {
    p_customer_name: bookingInput.customerName,
    p_email: bookingInput.email,
    p_phone: bookingInput.phone,
    p_topic: bookingInput.topic,
    p_note: bookingInput.note,
    p_appointment_date: bookingInput.appointmentDate,
    p_appointment_time: bookingInput.appointmentTime,
    p_starts_at: bookingInput.startsAt,
    p_ends_at: bookingInput.endsAt,
    p_hold_expires_at: holdExpiresAt,
    p_duration_minutes: bookingInput.durationMinutes,
    p_booking_type: bookingInput.bookingType,
  });

  if (reservation.error || !reservation.data) {
    const reason = reservation.error?.message ?? "";
    if (reason.includes("SUPPORT_DATE_BUSY") || reason.includes("SUPPORT_SLOT_TAKEN")) {
      throw new SupportBookingConflictError("Khung giờ này vừa được người khác chọn. Vui lòng chọn giờ khác.");
    }
    throw new Error(reason || "Không giữ được khung giờ hỗ trợ.");
  }

  const held = reservation.data as SupportBookingRow;
  try {
    const order = await createSupportPaymentOrder({
      studentName: bookingInput.customerName,
      email: bookingInput.email,
      phone: bookingInput.phone,
      expiresAt: holdExpiresAt,
      durationMinutes: bookingInput.durationMinutes,
      bookingType: bookingInput.bookingType,
    });
    const linked = await supabase
      .from("support_bookings")
      .update({ order_id: order.id, order_code: order.orderCode, updated_at: new Date().toISOString() })
      .eq("id", held.id)
      .eq("status", "held")
      .select("id")
      .single();
    if (linked.error || !linked.data) throw new Error(linked.error?.message ?? "Không liên kết được đơn thanh toán.");
    return {
      bookingId: held.id,
      orderCode: order.orderCode,
      checkoutUrl: `/thanh-toan/${encodeURIComponent(order.orderCode)}`,
      appointment: bookingInput,
      demo: false,
    };
  } catch (error) {
    await supabase
      .from("support_bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", held.id)
      .eq("status", "held");
    throw error;
  }
}

export async function confirmSupportBookingForPaidOrder(order: { id: string; orderCode: string; paidAt: string | null }) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Chưa cấu hình dữ liệu lịch hỗ trợ.");
  const paidAt = order.paidAt ?? new Date().toISOString();
  const result = await supabase.rpc("confirm_support_booking", {
    p_order_id: order.id,
    p_order_code: order.orderCode,
    p_paid_at: paidAt,
  });
  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Không xác nhận được lịch hỗ trợ đã thanh toán.");
  }
  const row = result.data as SupportBookingRow;
  return {
    id: row.id,
    appointmentDate: row.appointment_date,
    appointmentTime: String(row.appointment_time).slice(0, 5),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    topic: row.topic ?? "",
    note: row.note ?? "",
    status: row.status,
    durationMinutes: row.duration_minutes ?? Math.round((Date.parse(row.ends_at) - Date.parse(row.starts_at)) / 60_000),
    bookingType: row.booking_type ?? "student",
  } satisfies ConfirmedSupportBooking;
}

export async function markSupportBookingTelegram(
  bookingId: string,
  result: { ok: boolean; skipped: boolean; reason?: string },
) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Missing Supabase admin client" };
  const patch = result.ok && !result.skipped
    ? { telegram_sent_at: new Date().toISOString(), telegram_last_error: null, updated_at: new Date().toISOString() }
    : { telegram_last_error: (result.reason ?? "Telegram notification was skipped.").slice(0, 1000), updated_at: new Date().toISOString() };
  const update = await supabase.from("support_bookings").update(patch).eq("id", bookingId);
  return update.error ? { ok: false, error: update.error.message } : { ok: true, error: null };
}

export async function listConfirmedSupportBookings(now = new Date()): Promise<SupportBookingAdminRow[]> {
  if (isLocalDemo()) {
    const date = addDays(getSupportBookingWindow(now).minDate, 2);
    return [{
      id: "demo-confirmed-booking",
      appointmentDate: date,
      appointmentTime: "15:00",
      startsAt: `${date}T08:00:00.000Z`,
      endsAt: `${date}T08:30:00.000Z`,
      topic: "Kiểm tra quảng cáo",
      note: "Kiểm tra cấu trúc chiến dịch và đề xuất một mẫu quảng cáo để test trong 7 ngày.",
      status: "confirmed",
      durationMinutes: 30,
      bookingType: "student",
      customerName: "Nguyễn Minh Anh",
      email: "minhanh.demo@gmail.com",
      phone: "0900000000",
      amount: SUPPORT_PRICE_VND,
      orderCode: "SUPPORTDEMO",
      paidAt: now.toISOString(),
    }];
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Chưa cấu hình dữ liệu lịch hỗ trợ.");
  const result = await supabase
    .from("support_bookings")
    .select("id,customer_name,email,phone,topic,note,appointment_date,appointment_time,starts_at,ends_at,duration_minutes,booking_type,status,amount,order_code,paid_at")
    .eq("status", "confirmed")
    .gte("starts_at", now.toISOString())
    .order("starts_at", { ascending: true })
    .limit(200);
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map((row) => ({
    id: String(row.id), appointmentDate: String(row.appointment_date), appointmentTime: String(row.appointment_time).slice(0, 5),
    startsAt: String(row.starts_at), endsAt: String(row.ends_at), topic: String(row.topic), note: String(row.note), status: "confirmed" as const,
    customerName: String(row.customer_name), email: String(row.email), phone: String(row.phone), amount: Number(row.amount),
    orderCode: String(row.order_code ?? ""), paidAt: String(row.paid_at ?? ""),
    durationMinutes: Number(row.duration_minutes ?? 30), bookingType: (row.booking_type ?? "student") as SupportBookingType,
  }));
}

export async function listSupportBusyDates(now = new Date()) {
  const { minDate, maxDate } = getSupportBookingWindow(now);
  if (isLocalDemo()) return [addDays(minDate, 4)];
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Chưa cấu hình dữ liệu lịch hỗ trợ.");
  const result = await supabase.from("support_busy_dates").select("busy_date").gte("busy_date", minDate).lte("busy_date", maxDate);
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map((row) => String(row.busy_date));
}

export async function setSupportBusyDate(input: { date: string; busy: boolean; note?: string; actorId?: string | null }, now = new Date()) {
  const { minDate, maxDate } = getSupportBookingWindow(now);
  if (input.date < minDate && !input.busy) throw new Error(`Chỉ có thể mở lịch từ ${SUPPORT_MIN_LEAD_DAYS} ngày tới.`);
  if (isSupportSunday(input.date) && !input.busy) throw new Error("Không nhận lịch hỗ trợ vào Chủ nhật.");
  if (input.date > maxDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Ngày bận không hợp lệ.");
  if (isLocalDemo()) return { ok: true, demo: true };
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Chưa cấu hình dữ liệu lịch hỗ trợ.");
  const result = input.busy
    ? await supabase.from("support_busy_dates").upsert({ busy_date: input.date, note: input.note?.slice(0, 500) || null, created_by: input.actorId ?? null, updated_at: new Date().toISOString() }, { onConflict: "busy_date" })
    : await supabase.from("support_busy_dates").delete().eq("busy_date", input.date);
  if (result.error) throw new Error(result.error.message);
  return { ok: true, demo: false };
}

export type { SupportBookingInput };
