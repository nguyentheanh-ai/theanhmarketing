const couponProduct = "bo-agent-kit-x10-hieu-suat-cong-viec";
export function normalizeCouponCode(value: string = "") { return value.trim().toUpperCase(); }
export function applyOrderCoupon<T extends { amount: number; courseSlug: string; courseTitle: string; orderItems: { slug: string; title: string; price: number }[] }>(order: T, paymentPlan?: string, couponCode?: string): T {
  const code = normalizeCouponCode(couponCode);
  if (!code) return order;
  if (code !== "HOCVIEN20") throw new Error("Mã giảm giá không hợp lệ.");
  if (paymentPlan !== "agent-kit-offer-990" || order.courseSlug !== couponProduct || order.orderItems.length !== 1 || order.amount !== 990000) {
    throw new Error("Mã giảm giá chỉ áp dụng cho gói Codex và Bộ Kit Agent 990.000đ.");
  }
  const amount = Math.round(order.amount * 80 / 100);
  const courseTitle = `${order.courseTitle} (HOCVIEN20 - giảm 20%)`;
  return { ...order, amount, courseTitle, orderItems: order.orderItems.map(item => ({ ...item, title: courseTitle, price: amount })) };
}
