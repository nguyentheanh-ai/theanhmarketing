const VIETNAM_UTC_OFFSET_HOURS = 7;

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function vietnamLocalDateTimeToIso(value: string): string | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const utcMillis = Date.UTC(year, month - 1, day, hour - VIETNAM_UTC_OFFSET_HOURS, minute);
  const vietnamDate = new Date(utcMillis + VIETNAM_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  if (
    vietnamDate.getUTCFullYear() !== year
    || vietnamDate.getUTCMonth() !== month - 1
    || vietnamDate.getUTCDate() !== day
    || vietnamDate.getUTCHours() !== hour
    || vietnamDate.getUTCMinutes() !== minute
  ) return null;

  return new Date(utcMillis).toISOString();
}

export function vietnamDateToLocalInput(value: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
  return parts.replace(" ", "T").slice(0, 16);
}

export function formatVietnamLocalDateTime(value: string): string | null {
  const iso = vietnamLocalDateTimeToIso(value);
  if (!iso) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
