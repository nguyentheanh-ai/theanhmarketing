import type { PaymentOrder } from "@/services/orderService";

export const AGENT_KIT_SLUG = "bo-agent-kit-x10-hieu-suat-cong-viec";
export const AGENT_KIT_PREORDER_PAYMENT_PLAN = "agent-kit-preorder-deposit-399";
export const AGENT_KIT_PREORDER_REMAINING_PAYMENT_PLAN = "agent-kit-preorder-remaining-400";
export const AGENT_KIT_OFFICIAL_PAYMENT_PLAN = "agent-kit-standard-999";
export const AGENT_KIT_OFFICIAL_PRICE_VND = 999000;
export const AGENT_KIT_PREORDER_PRICE_VND = 799000;
export const AGENT_KIT_PREORDER_DEPOSIT_VND = 399000;
export const AGENT_KIT_PREORDER_REMAINING_VND = 400000;
export const AGENT_KIT_LAUNCH_AT = "2026-09-15T17:00:00.000Z";

export type AgentKitSalePhase = "preorder" | "official";

export function getAgentKitSalePhase(now: Date = new Date()): AgentKitSalePhase {
  return now.getTime() < new Date(AGENT_KIT_LAUNCH_AT).getTime() ? "preorder" : "official";
}

export function getAgentKitPaymentPlan(now: Date = new Date()) {
  return getAgentKitSalePhase(now) === "preorder"
    ? AGENT_KIT_PREORDER_PAYMENT_PLAN
    : AGENT_KIT_OFFICIAL_PAYMENT_PLAN;
}

export function assertAgentKitPaymentPlanAvailable(paymentPlan: string, now: Date = new Date()) {
  const phase = getAgentKitSalePhase(now);

  if (paymentPlan === AGENT_KIT_PREORDER_PAYMENT_PLAN && phase !== "preorder") {
    throw new Error("Chương trình preorder đã kết thúc. Vui lòng chọn gói giá chính thức 999.000đ.");
  }

  if (paymentPlan === AGENT_KIT_OFFICIAL_PAYMENT_PLAN && phase !== "official") {
    throw new Error("Gói giá chính thức mở bán từ ngày 16/09/2026.");
  }

  if (paymentPlan === AGENT_KIT_PREORDER_REMAINING_PAYMENT_PLAN) {
    throw new Error("Gói thanh toán phần còn lại chỉ được tạo từ đơn cọc đã thanh toán.");
  }
}

export function isAgentKitPreorderDepositOrder(order: Pick<PaymentOrder, "courseSlug" | "courseTitle" | "orderItems" | "paymentPlan">) {
  const slugHaystack = `${order.courseSlug} ${order.orderItems.map((item) => item.slug).join(" ")}`.toLowerCase();
  const titleHaystack = `${order.courseTitle} ${order.orderItems.map((item) => item.title).join(" ")}`.toLowerCase();

  return order.paymentPlan === AGENT_KIT_PREORDER_PAYMENT_PLAN ||
    (slugHaystack.includes(AGENT_KIT_SLUG) && titleHaystack.includes("cọc preorder"));
}

export function isAgentKitPreorderRemainingOrder(order: Pick<PaymentOrder, "courseSlug" | "courseTitle" | "orderItems" | "paymentPlan">) {
  const titleHaystack = `${order.courseTitle} ${order.orderItems.map((item) => item.title).join(" ")}`.toLowerCase();
  return order.paymentPlan === AGENT_KIT_PREORDER_REMAINING_PAYMENT_PLAN ||
    (order.courseSlug.includes(AGENT_KIT_SLUG) && titleHaystack.includes("còn lại preorder"));
}
