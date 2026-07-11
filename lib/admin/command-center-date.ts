const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function getVietnamDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid command-center generated time");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getVietnamCurrentMonthRange(generatedAt: Date | string) {
  const to = getVietnamDateKey(generatedAt);
  return { from: `${to.slice(0, 7)}-01`, to };
}
