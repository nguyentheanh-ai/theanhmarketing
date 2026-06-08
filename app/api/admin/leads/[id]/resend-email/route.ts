import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { invalidateAdminModules } from "@/services/adminDataService";
import { logStudentActivity } from "@/services/activityLogService";
import { recordEmailLog } from "@/services/emailLogService";
import { recordLeadActivity } from "@/services/leadActivityService";
import { sendLeadResendEmail } from "@/services/leadEmailService";
import { recordLeadEmailLog } from "@/services/leadService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:leads:resend-email"),
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole } = await getCurrentAuth();

      if (!canAccessAdminRole(adminRole, ["owner"])) {
        return NextResponse.json({ ok: false, message: "Bạn không có quyền gửi lại email lead." }, { status: 403 });
      }
    }

    const { id } = await params;
    const result = await sendLeadResendEmail(id);
    const isSuccess = result.ok && !result.skipped;
    await recordEmailLog({
      leadId: id,
      email: result.email || "unknown",
      subject: result.template,
      templateKey: result.template,
      status: isSuccess ? "sent" : "failed",
      errorMessage: isSuccess ? null : result.reason ?? "Email resend failed or skipped.",
      metadata: { orderCode: result.orderCode, source: "admin_resend" },
    });
    const logResult = await recordLeadEmailLog({
      leadId: id,
      orderCode: result.orderCode,
      email: result.email,
      template: result.template,
      status: isSuccess ? "success" : "failed",
      errorMessage: isSuccess ? null : result.reason ?? "Email resend failed or skipped.",
    });

    await recordLeadActivity({
      leadId: id,
      activityType: isSuccess ? "email_sent" : "email_failed",
      title: isSuccess ? `Đã gửi email xác nhận cho ${result.email}` : `Email gửi cho ${result.email || id} bị lỗi`,
      description: result.reason ?? result.template,
      metadata: { orderCode: result.orderCode, template: result.template },
    });
    await logStudentActivity({
      leadId: id,
      studentEmail: result.email,
      eventType: isSuccess
        ? result.template === "payment_success"
          ? "payment_success_email_sent"
          : "payment_email_sent"
        : result.template === "payment_success"
          ? "payment_success_email_failed"
          : "payment_email_failed",
      eventTitle: isSuccess ? `Đã gửi email ${result.template}` : `Gửi email ${result.template} thất bại`,
      eventDescription: result.reason ?? result.template,
      status: isSuccess ? "success" : "failed",
      actorType: "admin",
      metadata: { orderCode: result.orderCode, template: result.template },
    });
    invalidateAdminModules(["leads", "orders", "students", "activities"]);

    if (!logResult.ok) {
      return NextResponse.json(
        { ok: false, message: `Email đã xử lý nhưng chưa ghi được log resend: ${logResult.error}` },
        { status: 500 },
      );
    }

    if (!isSuccess) {
      return NextResponse.json(
        { ok: false, message: result.reason ?? "Chưa gửi lại được email.", email: result },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Đã gửi lại email ${result.template} cho ${result.email}.`,
      email: result,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không gửi lại được email." },
      { status: 500 },
    );
  }
}
