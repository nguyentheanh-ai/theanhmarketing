import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { sendPendingPaymentEmail } from "@/lib/notifications/pending-payment-email";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, cleanPhone, cleanSlug, cleanText, isValidEmail, isValidPhone, isValidSlug } from "@/lib/security/validation";
import { invalidateAdminModules } from "@/services/adminDataService";
import { logStudentActivity } from "@/services/activityLogService";
import { createLeadAdmin } from "@/services/leadService";
import { createPaymentOrder } from "@/services/orderService";

function normalizeSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://theanhmarketing.com";

  try {
    const url = new URL(rawUrl);
    url.protocol = "https:";

    if (url.hostname === "www.theanhmarketing.com") {
      url.hostname = "theanhmarketing.com";
    }

    return url.origin;
  } catch {
    return "https://theanhmarketing.com";
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:payment-links"),
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    let adminActor: Awaited<ReturnType<typeof getCurrentAuth>>["user"] | null = null;
    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole, user } = await getCurrentAuth();
      adminActor = user;

      if (!canAccessAdminRole(adminRole, ["owner", "editor"])) {
        return NextResponse.json(
          { ok: false, message: "Bạn không có quyền gửi form thanh toán cho khách." },
          { status: 403 },
        );
      }
    }

    const body = (await request.json()) as {
      studentName?: string;
      phone?: string;
      email?: string;
      courseSlug?: string;
      paymentPlan?: string;
    };
    const studentName = cleanText(body.studentName, 120);
    const phone = cleanPhone(body.phone);
    const email = cleanEmail(body.email);
    const courseSlug = cleanSlug(body.courseSlug);
    const paymentPlan = cleanText(body.paymentPlan, 40);

    if (!studentName || !phone || !email || !courseSlug || !isValidPhone(phone) || !isValidEmail(email) || !isValidSlug(courseSlug)) {
      return NextResponse.json(
        { ok: false, message: "Thiếu tên, số điện thoại, email hoặc khóa học hợp lệ để gửi form thanh toán." },
        { status: 400 },
      );
    }

    const order = await createPaymentOrder({
      studentName,
      phone,
      email,
      courseSlug,
      paymentPlan,
    });
    const paymentUrl = `${normalizeSiteUrl()}/thanh-toan/${encodeURIComponent(order.orderCode)}`;
    const emailResult = await sendPendingPaymentEmail(order);

    const leadResult = await createLeadAdmin({
      name: studentName,
      email,
      phone,
      source: "admin-payment-link",
      message: [
        `Mã đơn: ${order.orderCode}`,
        `Khóa: ${order.courseTitle}`,
        `Gói: ${paymentPlan || "default"}`,
        `Số tiền: ${order.amountLabel}`,
        `Trang thanh toán: ${paymentUrl}`,
      ].join("\n"),
    });
    await logStudentActivity({
      leadId: leadResult.lead?.id ?? null,
      studentEmail: email,
      studentPhone: phone,
      eventType: emailResult.ok && !emailResult.skipped ? "payment_email_sent" : "payment_email_failed",
      eventTitle: emailResult.ok && !emailResult.skipped ? "Đã gửi email thông báo thanh toán" : "Gửi email thông báo thanh toán thất bại",
      eventDescription: emailResult.ok && !emailResult.skipped ? `Đơn ${order.orderCode} - ${order.amountLabel}` : emailResult.reason ?? "Không rõ lý do",
      status: emailResult.ok && !emailResult.skipped ? "success" : "failed",
      actorType: "admin",
      actorId: adminActor?.id ?? null,
      actorEmail: adminActor?.email ?? null,
      metadata: { orderCode: order.orderCode, courseSlug, paymentPlan, paymentUrl },
    });

    invalidateAdminModules(["orders", "leads", "students", "activities"]);

    if (!emailResult.ok || emailResult.skipped) {
      return NextResponse.json(
        {
          ok: false,
          message: `Đã tạo đơn ${order.orderCode} nhưng chưa gửi được email thanh toán: ${
            emailResult.reason ?? "không rõ lý do"
          }. Có thể copy link bên dưới gửi thủ công.`,
          order,
          paymentUrl,
          email: emailResult,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Đã tạo đơn ${order.orderCode} (${order.amountLabel}) và gửi form thanh toán UTF-8 cho ${email}.`,
      order,
      paymentUrl,
      email: emailResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Không gửi được form thanh toán cho khách.",
      },
      { status: 500 },
    );
  }
}
