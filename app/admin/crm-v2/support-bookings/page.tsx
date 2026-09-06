import { requireAdminAuth } from "@/lib/auth/session";
import { PageHeader } from "@/components/crm-v2";
import { SupportBookingsClient } from "@/components/crm-v2/support-bookings-client";
import { getVietnamToday } from "@/lib/support-booking/domain";
import { calendarRange } from "@/lib/support-booking/admin-calendar";
import { getSupportCalendar } from "@/services/supportCalendarService";

export default async function SupportBookingsAdminPage() {
  await requireAdminAuth("/admin/crm-v2/support-bookings", ["owner"]);
  const today = getVietnamToday();
  const range = calendarRange(today, "month");
  let initialSnapshot = null;
  let initialError = "";
  try { initialSnapshot = await getSupportCalendar(range.from, range.to); }
  catch { initialError = "Không tải được lịch hỗ trợ. Anh có thể bấm Tải lại để thử lại."; }
  return <div className="space-y-4"><PageHeader eyebrow="Vận hành" title="Lịch hỗ trợ" /><SupportBookingsClient initialSnapshot={initialSnapshot} initialError={initialError} today={today} /></div>;
}
