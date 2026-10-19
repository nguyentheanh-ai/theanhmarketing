export const salesCareStatuses = {
  not_contacted: "Chưa liên hệ",
  zalo_contacted: "Đã liên hệ qua Zalo",
  called: "Đã gọi điện",
  zoom_met: "Đã họp Zoom",
} as const;
export type SalesCareStatus = keyof typeof salesCareStatuses;
export type SalesCareEntry = {
  id: string; status: SalesCareStatus; note: string;
  actorName: string; actorEmail: string; updatedAt: string;
};
export function isSalesCareStatus(value: unknown): value is SalesCareStatus {
  return typeof value === "string" && Object.hasOwn(salesCareStatuses, value);
}
export function parseSalesCareInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.customerId !== "string" || !input.customerId.trim() || input.customerId.length > 500 ||
      !isSalesCareStatus(input.status) || typeof input.note !== "string" || input.note.length > 1000) return null;
  return { customerId: input.customerId, status: input.status, note: input.note.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim() };
}
