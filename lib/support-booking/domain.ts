import {
  SUPPORT_DURATION_MINUTES,
  SUPPORT_MAX_DURATION_MINUTES,
  SUPPORT_BOOKING_PLANS,
  type SupportBookingType,
  SUPPORT_MAX_LEAD_DAYS,
  SUPPORT_MIN_LEAD_DAYS,
  SUPPORT_TIME_ZONE,
  SUPPORT_TOPICS,
  type SupportTopic,
} from "@/lib/support-booking/constants";

export type SupportBookingInput = {
  customerName: string;
  email: string;
  phone: string;
  topic: SupportTopic;
  note: string;
  appointmentDate: string;
  appointmentTime: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  bookingType: SupportBookingType;
  amount: number;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

export function getVietnamToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SUPPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateToDayNumber(value: string) {
  if (!datePattern.test(value)) return Number.NaN;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return Number.NaN;
  }
  return Math.floor(timestamp / 86_400_000);
}

function addDays(value: string, days: number) {
  const dayNumber = dateToDayNumber(value);
  return new Date((dayNumber + days) * 86_400_000).toISOString().slice(0, 10);
}

function range(startMinutes: number, endMinutes: number) {
  const result: string[] = [];
  for (let value = startMinutes; value <= endMinutes; value += SUPPORT_DURATION_MINUTES) {
    const hours = String(Math.floor(value / 60)).padStart(2, "0");
    const minutes = String(value % 60).padStart(2, "0");
    result.push(`${hours}:${minutes}`);
  }
  return result;
}

export function listSupportSlots() {
  return [...range(9 * 60, 11 * 60 + 30), ...range(13 * 60 + 30, 20 * 60)];
}

export function getSupportBookingQuote(bookingType: SupportBookingType, durationMinutes: number) {
  if (!Object.hasOwn(SUPPORT_BOOKING_PLANS, bookingType)) throw new Error("Loại lịch không hợp lệ.");
  const plan = SUPPORT_BOOKING_PLANS[bookingType];
  if (!Number.isInteger(durationMinutes) || durationMinutes < plan.baseMinutes || durationMinutes > SUPPORT_MAX_DURATION_MINUTES || durationMinutes % SUPPORT_DURATION_MINUTES !== 0) {
    throw new Error("Thời lượng buổi hỗ trợ không hợp lệ.");
  }
  return {
    bookingType,
    durationMinutes,
    amount: plan.basePrice + (durationMinutes - plan.baseMinutes) / SUPPORT_DURATION_MINUTES * plan.extraHalfHourPrice,
    title: `${plan.title} cùng Thế Anh - ${durationMinutes} phút`,
  };
}

export function getSupportCoveredSlots(time: string, durationMinutes: number) {
  if (!timePattern.test(time) || !Number.isInteger(durationMinutes) || durationMinutes < SUPPORT_DURATION_MINUTES || durationMinutes > SUPPORT_MAX_DURATION_MINUTES || durationMinutes % SUPPORT_DURATION_MINUTES !== 0) return [];
  const [hours, minutes] = time.split(":").map(Number);
  const allowed = new Set(listSupportSlots());
  const slots = Array.from({ length: durationMinutes / SUPPORT_DURATION_MINUTES }, (_, index) => {
    const value = hours * 60 + minutes + index * SUPPORT_DURATION_MINUTES;
    return `${String(Math.floor(value / 60)).padStart(2,"0")}:${String(value % 60).padStart(2,"0")}`;
  });
  return slots.every((slot) => allowed.has(slot)) ? slots : [];
}

export function isSupportSlotAvailable(slots: Array<{time: string; available: boolean}>, time: string, durationMinutes: number) {
  const covered = getSupportCoveredSlots(time, durationMinutes);
  return covered.length > 0 && covered.every((value) => slots.some((slot) => slot.time === value && slot.available));
}

export function getSupportBookingWindow(now = new Date()) {
  const today = getVietnamToday(now);
  return {
    minDate: addDays(today, SUPPORT_MIN_LEAD_DAYS),
    maxDate: addDays(today, SUPPORT_MAX_LEAD_DAYS),
  };
}

export function isSupportSunday(value: string) {
  const dayNumber = dateToDayNumber(value);
  return Number.isFinite(dayNumber) && new Date(dayNumber * 86_400_000).getUTCDay() === 0;
}

export function isSupportDateBookable(value: string, now = new Date()) {
  const dayNumber = dateToDayNumber(value);
  if (!Number.isFinite(dayNumber) || isSupportSunday(value)) return false;
  const { minDate, maxDate } = getSupportBookingWindow(now);
  return dayNumber >= dateToDayNumber(minDate) && dayNumber <= dateToDayNumber(maxDate);
}

export function toVietnamAppointment(date: string, time: string, durationMinutes = SUPPORT_DURATION_MINUTES) {
  if (!Number.isFinite(dateToDayNumber(date)) || !timePattern.test(time)) {
    throw new Error("Ngày hoặc khung giờ không hợp lệ.");
  }
  const startsAtDate = new Date(`${date}T${time}:00+07:00`);
  if (Number.isNaN(startsAtDate.getTime())) {
    throw new Error("Ngày hoặc khung giờ không hợp lệ.");
  }
  const endsAtDate = new Date(startsAtDate.getTime() + durationMinutes * 60_000);
  return { startsAt: startsAtDate.toISOString(), endsAt: endsAtDate.toISOString() };
}

export function validateSupportBookingInput(input: unknown, now = new Date(), bookingType: SupportBookingType = "student"): SupportBookingInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Thông tin đặt lịch không hợp lệ.");
  }

  const body = input as Record<string, unknown>;
  const customerName = cleanText(body.customerName, 120);
  const email = cleanText(body.email, 160).toLowerCase();
  const phone = cleanText(body.phone, 30).replace(/\D/g, "");
  const topic = cleanText(body.topic, 80) as SupportTopic;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2_000) : "";
  const appointmentDate = cleanText(body.appointmentDate, 10);
  const appointmentTime = cleanText(body.appointmentTime, 5);
  const durationMinutes = (body.durationMinutes ?? SUPPORT_BOOKING_PLANS[bookingType]?.baseMinutes) as number;
  const quote = getSupportBookingQuote(bookingType, durationMinutes);

  if (customerName.length < 2) throw new Error("Vui lòng nhập họ tên đầy đủ.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email không hợp lệ.");
  if (phone.length < 9 || phone.length > 15) throw new Error("Số điện thoại không hợp lệ.");
  if (!SUPPORT_TOPICS.some((item) => item.value === topic)) throw new Error("Chủ đề hỗ trợ không hợp lệ.");
  if (note.length < 10) throw new Error("Nội dung cần hỗ trợ phải có ít nhất 10 ký tự.");
  if (isSupportSunday(appointmentDate)) {
    throw new Error("Không nhận lịch hỗ trợ vào Chủ nhật. Vui lòng chọn ngày khác.");
  }
  if (!isSupportDateBookable(appointmentDate, now)) {
    throw new Error(`Lịch chỉ có thể đặt từ ${SUPPORT_MIN_LEAD_DAYS} đến ${SUPPORT_MAX_LEAD_DAYS} ngày tới.`);
  }
  if (!listSupportSlots().includes(appointmentTime)) throw new Error("Khung giờ không hợp lệ.");
  if (!getSupportCoveredSlots(appointmentTime, durationMinutes).length) throw new Error("Khung giờ không đủ thời gian cho buổi hỗ trợ. Vui lòng chọn giờ khác.");

  return {
    customerName,
    email,
    phone,
    topic,
    note,
    appointmentDate,
    appointmentTime,
    durationMinutes,
    bookingType,
    amount: quote.amount,
    ...toVietnamAppointment(appointmentDate, appointmentTime, durationMinutes),
  };
}
