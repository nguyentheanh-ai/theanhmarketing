import { marketingAiServices, type MarketingAiServiceId } from "@/data/services";

export const CONSULTATION_PRODUCT_SLUG = "marketing-ai-consultation";
export const CONSULTATION_PAYMENT_PLAN = "consultation-deposit-500";
export const CONSULTATION_PRODUCT_TITLE = "Phí tư vấn Marketing & AI";
export const CONSULTATION_PRICE_VND = 500_000;
export const CONSULTATION_POLICY = "500.000đ là phí giữ yêu cầu tư vấn. Nếu bạn đăng ký dịch vụ sau tư vấn, khoản này được trừ vào học phí hoặc phí training. Nếu bạn không đăng ký tiếp, phí tư vấn không hoàn lại.";

export function isConsultationService(value: unknown): value is MarketingAiServiceId {
  return typeof value === "string" && marketingAiServices.some((service) => service.id === value);
}

export function getConsultationService(value: MarketingAiServiceId) {
  return marketingAiServices.find((service) => service.id === value)!;
}

export function isConsultationOrder(input: { courseSlug: string; orderItems?: Array<{ slug: string }> }) {
  return input.courseSlug.split(",").map((item) => item.trim()).includes(CONSULTATION_PRODUCT_SLUG)
    || input.orderItems?.some((item) => item.slug === CONSULTATION_PRODUCT_SLUG) === true;
}
