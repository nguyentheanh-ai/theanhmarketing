import { BOT247_PAYMENT_PLAN, BOT247_PRODUCT_SLUG, BOT247_PRODUCT_TITLE } from "@/lib/bot247/constants";
import { cleanEmail, cleanPhone, cleanText, isValidEmail, isValidPhone } from "@/lib/security/validation";
import { createLeadAdmin } from "@/services/leadService";
import { createPaymentOrder } from "@/services/orderService";

/** Buy form on /bot-24-7 → lead + fixed-price order → existing SePay payment page. */
export async function createBot247Order(input: Record<string, unknown>) {
  const studentName = cleanText(input.studentName, 120);
  const email = cleanEmail(input.email);
  const phone = cleanPhone(input.phone);
  if (!studentName || !isValidEmail(email) || !isValidPhone(phone)) throw new Error("Vui lòng kiểm tra họ tên, email và số điện thoại.");

  const lead = await createLeadAdmin({ name: studentName, email, phone, message: `Mua ${BOT247_PRODUCT_TITLE}`, source: BOT247_PRODUCT_TITLE, syncGoogleSheet: false });
  const order = await createPaymentOrder({
    studentName,
    email,
    phone,
    courseSlug: BOT247_PRODUCT_SLUG,
    paymentPlan: BOT247_PAYMENT_PLAN,
    leadId: lead.ok ? lead.lead?.id ?? null : null,
    attribution: { landingPage: cleanText(input.pageUrl, 500), utmSource: cleanText(input.utmSource, 80) || "website" },
  });
  return { ok: true, orderCode: order.orderCode, paymentUrl: `/thanh-toan/${order.orderCode}` };
}
