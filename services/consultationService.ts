import {
  CONSULTATION_PAYMENT_PLAN,
  CONSULTATION_PRODUCT_SLUG,
  getConsultationService,
  isConsultationService,
} from "@/lib/consultation/constants";
import { cleanEmail, cleanPhone, cleanText, isValidEmail, isValidPhone } from "@/lib/security/validation";
import { createLeadAdmin } from "@/services/leadService";
import { createPaymentOrder } from "@/services/orderService";

export async function createConsultationRequest(input: Record<string, unknown>) {
  const serviceId = cleanText(input.service, 80);
  const studentName = cleanText(input.studentName, 120);
  const email = cleanEmail(input.email);
  const phone = cleanPhone(input.phone);
  const note = cleanText(input.note, 1200);

  if (!isConsultationService(serviceId)) throw new Error("Dịch vụ tư vấn không hợp lệ.");
  if (!studentName || !isValidEmail(email) || !isValidPhone(phone)) throw new Error("Vui lòng kiểm tra họ tên, email và số điện thoại.");
  if (note.length < 10) throw new Error("Vui lòng mô tả nhu cầu tư vấn ít nhất 10 ký tự.");

  const service = getConsultationService(serviceId);
  const source = `Tư vấn Marketing & AI - ${service.title}`;
  const lead = await createLeadAdmin({
    name: studentName,
    email,
    phone,
    message: `Dịch vụ: ${service.title}\nNhu cầu: ${note}`,
    source,
    syncGoogleSheet: false,
  });

  const order = await createPaymentOrder({
    studentName,
    email,
    phone,
    courseSlug: CONSULTATION_PRODUCT_SLUG,
    paymentPlan: CONSULTATION_PAYMENT_PLAN,
    leadId: lead.ok ? lead.lead?.id ?? null : null,
    attribution: { landingPage: cleanText(input.pageUrl, 500), utmSource: "website" },
  });

  return { ok: true, orderCode: order.orderCode, paymentUrl: `/thanh-toan/${order.orderCode}` };
}
