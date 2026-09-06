import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupportBookingWindow } from "@/lib/support-booking/domain";
import { isCalendarDate, type CalendarBooking, type SupportCalendarSnapshot } from "@/lib/support-booking/admin-calendar";

export function validateSupportCalendarRange(from: string, to: string) {
  if (!isCalendarDate(from) || !isCalendarDate(to) || from > to || Date.parse(to) - Date.parse(from) > 41 * 86_400_000) {
    throw new Error("Chọn khoảng lịch hợp lệ, tối đa 42 ngày.");
  }
}

// Admin-only read path. Public availability, reservations, payment confirmation and notifications remain unchanged.
export async function getSupportCalendar(from: string, to: string, now = new Date()): Promise<SupportCalendarSnapshot> {
  validateSupportCalendarRange(from, to);
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Chưa cấu hình dữ liệu lịch hỗ trợ.");
  const rows: Array<Record<string, unknown>> = [];
  let expectedCount: number | null = null;
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const result = await client.from("support_bookings")
      .select("id,customer_name,email,phone,topic,note,appointment_date,appointment_time,starts_at,ends_at,duration_minutes,booking_type,status,hold_expires_at,amount,order_code,paid_at", { count: "exact" })
      .gte("appointment_date", from).lte("appointment_date", to)
      .order("starts_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + pageSize - 1);
    if (result.error) throw new Error("Không tải được lịch hỗ trợ. Vui lòng tải lại.");
    if (typeof result.count !== "number" || (expectedCount !== null && expectedCount !== result.count)) throw new Error("Lịch vừa thay đổi. Vui lòng tải lại.");
    expectedCount = result.count;
    if (expectedCount > 10_000) throw new Error("Khoảng lịch có quá nhiều buổi hẹn. Vui lòng chọn chế độ tuần hoặc ngày.");
    const batch = result.data ?? [];
    rows.push(...batch);
    if (rows.length === expectedCount) break;
    if (batch.length !== pageSize || rows.length > expectedCount) throw new Error("Không tải đủ lịch hỗ trợ. Vui lòng tải lại.");
  }
  if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error("Lịch vừa thay đổi. Vui lòng tải lại.");
  const busy = await client.from("support_busy_dates").select("busy_date,note").gte("busy_date", from).lte("busy_date", to).order("busy_date", { ascending: true });
  if (busy.error) throw new Error("Không tải được ngày bận. Vui lòng tải lại.");
  const bookings: CalendarBooking[] = rows.map((row) => ({
    id: String(row.id), appointmentDate: String(row.appointment_date), appointmentTime: String(row.appointment_time).slice(0, 5),
    startsAt: String(row.starts_at), endsAt: String(row.ends_at), topic: String(row.topic ?? ""), note: String(row.note ?? ""),
    status: row.status as CalendarBooking["status"], holdExpiresAt: String(row.hold_expires_at ?? ""),
    customerName: String(row.customer_name ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? ""), amount: Number(row.amount),
    orderCode: String(row.order_code ?? ""), paidAt: String(row.paid_at ?? ""),
    durationMinutes: Number(row.duration_minutes ?? Math.round((Date.parse(String(row.ends_at)) - Date.parse(String(row.starts_at))) / 60_000)),
    bookingType: row.booking_type === "consultation" ? "consultation" : "student",
  }));
  return { from, to, now: now.toISOString(), ...getSupportBookingWindow(now), bookings, busyDates: (busy.data ?? []).map((row) => ({ date: String(row.busy_date), note: String(row.note ?? "") })) };
}
