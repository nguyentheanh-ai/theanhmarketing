import {
  SUPPORT_HOLD_MINUTES,
  SUPPORT_MAX_LEAD_DAYS,
  SUPPORT_MIN_LEAD_DAYS,
} from "@/lib/support-booking/constants";
import {
  getSupportBookingWindow,
  listSupportSlots,
  validateSupportBookingInput,
  type SupportBookingInput,
} from "@/lib/support-booking/domain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupportPaymentOrder } from "@/services/orderService";

type SupportBookingRow = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  starts_at: string;
  ends_at: string;
  status: "held" | "confirmed" | "needs_review" | "cancelled";
  hold_expires_at: string;
  order_id?: string | null;
  order_code?: string | null;
};

export type SupportAvailabilityDay = {
  date: string;
  busy: boolean;
  slots: Array<{ time: string; available: boolean }>;
};

export class SupportBookingConflictError extends Error {}

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
        busy: false,
        slots: slots.map((time) => ({ time, available: true })),
      })),
    };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Chưa cấu hình dữ liệu lịch hỗ trợ.");

  const [busyResult, bookingResult] = await Promise.all([
    supabase.from("support_busy_dates").select("busy_date").gte("busy_date", minDate).lte("busy_date", maxDate),
    supabase
      .from("support_bookings")
      .select("appointment_date,appointment_time,status,hold_expires_at")
      .gte("appointment_date", minDate)
      .lte("appointment_date", maxDate)
      .in("status", ["held", "confirmed"]),
  ]);

  if (busyResult.error || bookingResult.error) {
    throw new Error(busyResult.error?.message ?? bookingResult.error?.message ?? "Không đọc được lịch hỗ trợ.");
  }

  const busyDates = new Set((busyResult.data ?? []).map((row) => String(row.busy_date)));
  const occupied = new Set(
    (bookingResult.data ?? [])
      .filter((row) => row.status === "confirmed" || Date.parse(String(row.hold_expires_at)) > now.getTime())
      .map((row) => `${row.appointment_date}:${String(row.appointment_time).slice(0, 5)}`),
  );

  return {
    minLeadDays: SUPPORT_MIN_LEAD_DAYS,
    maxLeadDays: SUPPORT_MAX_LEAD_DAYS,
    days: dates.map((date) => ({
      date,
      busy: busyDates.has(date),
      slots: slots.map((time) => ({
        time,
        available: !busyDates.has(date) && !occupied.has(`${date}:${time}`),
      })),
    })),
  };
}

export async function reserveSupportBooking(input: unknown, now = new Date()) {
  const bookingInput = validateSupportBookingInput(input, now);

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

  const reservation = await supabase.rpc("reserve_support_booking", {
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

export type { SupportBookingInput };
