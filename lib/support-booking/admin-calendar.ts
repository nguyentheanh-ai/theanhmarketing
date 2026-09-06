import type { SupportBookingAdminRow } from "@/services/supportBookingService";

export type CalendarView = "month" | "week" | "day";
export type CalendarBooking = SupportBookingAdminRow & { holdExpiresAt: string };
export type CalendarStatus = CalendarBooking["status"] | "expired";
export type SupportCalendarSnapshot = {
  from: string;
  to: string;
  now: string;
  minDate: string;
  maxDate: string;
  bookings: CalendarBooking[];
  busyDates: Array<{ date: string; note: string }>;
};

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addCalendarDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calendarDates(from: string, to: string) {
  const values: string[] = [];
  for (let date = from; date <= to; date = addCalendarDays(date, 1)) values.push(date);
  return values;
}

export function calendarRange(date: string, view: CalendarView) {
  const first = view === "month" ? `${date.slice(0, 7)}-01` : date;
  const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const from = view === "day" ? date : addCalendarDays(first, -offset);
  return { from, to: addCalendarDays(from, view === "month" ? 41 : view === "week" ? 6 : 0) };
}

export function moveCalendarDate(date: string, view: CalendarView, direction: number) {
  if (view !== "month") return addCalendarDays(date, direction * (view === "week" ? 7 : 1));
  const parsed = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  parsed.setUTCMonth(parsed.getUTCMonth() + direction);
  const lastDay = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0)).getUTCDate();
  parsed.setUTCDate(Math.min(Number(date.slice(8)), lastDay));
  return parsed.toISOString().slice(0, 10);
}

export function calendarStatus(booking: CalendarBooking, now: string): CalendarStatus {
  return booking.status === "held" && Date.parse(booking.holdExpiresAt) <= Date.parse(now) ? "expired" : booking.status;
}

export const calendarStatusLabels: Record<CalendarStatus, string> = {
  confirmed: "Đã xác nhận",
  held: "Đang giữ chỗ",
  needs_review: "Cần kiểm tra",
  cancelled: "Đã hủy",
  expired: "Hết hạn giữ chỗ",
};

// Cancelled and late-paid bookings may overlap. Assign lanes so every event stays clickable.
export function layoutCalendarEvents(bookings: CalendarBooking[]) {
  const events = bookings.map((booking) => {
    const [hour, minute] = booking.appointmentTime.split(":").map(Number);
    const start = hour * 60 + minute;
    return { booking, start, end: start + booking.durationMinutes, lane: 0, lanes: 1 };
  }).sort((a, b) => a.start - b.start || b.end - a.end || a.booking.id.localeCompare(b.booking.id));
  let group: typeof events = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;
  const finish = () => { for (const event of group) event.lanes = laneEnds.length; };
  for (const event of events) {
    if (event.start >= groupEnd) { finish(); group = []; laneEnds = []; }
    const lane = laneEnds.findIndex((end) => end <= event.start);
    event.lane = lane < 0 ? laneEnds.length : lane;
    laneEnds[event.lane] = event.end;
    group.push(event);
    groupEnd = Math.max(...laneEnds);
  }
  finish();
  return events;
}
