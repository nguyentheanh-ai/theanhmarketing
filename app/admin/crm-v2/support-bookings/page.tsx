import { PageHeader, StatusBadge } from "@/components/crm-v2";
import { SupportBookingsClient } from "@/components/crm-v2/support-bookings-client";
import { getVietnamToday } from "@/lib/support-booking/domain";
import { listConfirmedSupportBookings, listSupportBusyDates } from "@/services/supportBookingService";

export default async function SupportBookingsAdminPage() {
  const [bookings, busyDates] = await Promise.all([listConfirmedSupportBookings(), listSupportBusyDates()]);
  return <div className="space-y-5"><PageHeader eyebrow="Vận hành hỗ trợ" title="Lịch hỗ trợ" actions={<StatusBadge tone="green">500.000đ / 30 phút</StatusBadge>} /><SupportBookingsClient bookings={bookings} busyDates={busyDates} today={getVietnamToday()} /></div>;
}
