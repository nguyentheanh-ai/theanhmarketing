import type { PaymentOrder } from "@/services/orderService";

export const AGENT_KIT_SLUG = "bo-agent-kit-x10-hieu-suat-cong-viec";
export const AGENT_KIT_PREORDER_PAYMENT_PLAN = "agent-kit-preorder-deposit-399";
export const AGENT_KIT_OFFICIAL_PRICE_VND = 999000;
export const AGENT_KIT_PREORDER_PRICE_VND = 799000;
export const AGENT_KIT_PREORDER_DEPOSIT_VND = 399000;
export const AGENT_KIT_PREORDER_REMAINING_VND = 400000;

export function isAgentKitPreorderDepositOrder(order: Pick<PaymentOrder, "courseSlug" | "courseTitle" | "orderItems">) {
  const slugHaystack = `${order.courseSlug} ${order.orderItems.map((item) => item.slug).join(" ")}`.toLowerCase();
  const titleHaystack = `${order.courseTitle} ${order.orderItems.map((item) => item.title).join(" ")}`.toLowerCase();

  return slugHaystack.includes(AGENT_KIT_SLUG) && titleHaystack.includes("cọc preorder");
}
