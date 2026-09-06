export type ChartRange = { range: string; from: string; to: string };
export function chartResolution(range: ChartRange): "hour" | "day" | "week" {
  if (range.from === range.to) return "hour";
  const days = Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86400000) + 1;
  return days > 45 ? "week" : "day";
}
export function chartDateLabel(date: string, range: ChartRange) {
  return range.from.slice(0, 4) === range.to.slice(0, 4) ? date.slice(5) : date;
}
