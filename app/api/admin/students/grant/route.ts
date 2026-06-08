import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { sendPaymentSuccessEmail } from "@/lib/notifications/payment-success-email";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import {
  cleanEmail,
  cleanPhone,
  cleanSlug,
  cleanText,
  isValidEmail,
  isValidPhone,
  isValidSlug,
} from "@/lib/security/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { invalidateAdminModules } from "@/services/adminDataService";
import { logStudentActivity } from "@/services/activityLogService";
import { createManualPaidOrder, markPaymentEmailError, markPaymentEmailSent } from "@/services/orderService";
import { ensureStudentAccountForPaidOrder } from "@/services/studentAccountService";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:students:grant"),
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
          { ok: false, message: "Bạn không có quyền cấp quyền học viên." },
          { status: 403 },
        );
      }
    }

    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      email?: string;
      courseSlug?: string;
      courseSlugs?: string[];
      paymentStatus?: string;
      temporaryPassword?: string;
      source?: string;
      note?: string;
    };
    const name = cleanText(body.name, 120);
    const phone = cleanPhone(body.phone);
    const email = cleanEmail(body.email);
    const courseSlugs = Array.from(
      new Set(
        (Array.isArray(body.courseSlugs) && body.courseSlugs.length > 0 ? body.courseSlugs : [body.courseSlug ?? ""])
          .map((courseSlug) => cleanSlug(String(courseSlug)))
          .filter(Boolean),
      ),
    );
    const paymentStatus = cleanText(body.paymentStatus, 30);
    const temporaryPassword = cleanText(body.temporaryPassword, 120);
    const source = cleanText(body.source, 80) || "Admin";
    const note = cleanText(body.note, 500);

    if (
      !name ||
      !phone ||
      !email ||
      courseSlugs.length === 0 ||
      !isValidEmail(email) ||
      !isValidPhone(phone) ||
      courseSlugs.some((courseSlug) => !isValidSlug(courseSlug))
    ) {
      return NextResponse.json(
        { ok: false, message: "Thiếu tên, số điện thoại, email hoặc khóa học." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json(
        { ok: false, message: "Chưa cấu hình Supabase để lưu học viên." },
        { status: 500 },
      );
    }

    const { error: leadError } = await supabase.from("leads").insert({
      name,
      phone,
      email,
      source: `admin-student:${source}`,
      message: `Khóa học: ${courseSlugs.join(", ")}\nTrạng thái: ${paymentStatus}\nGhi chú: ${note}`,
    });

    if (leadError) {
      return NextResponse.json(
        { ok: false, message: `Chưa lưu được hồ sơ: ${leadError.message}` },
        { status: 500 },
      );
    }

    if (paymentStatus === "paid") {
      const order = await createManualPaidOrder({
        studentName: name,
        email,
        phone,
        courseSlugs,
        note,
      });
      const studentAccount = await ensureStudentAccountForPaidOrder(order, {
        temporaryPassword,
        forcePasswordUpdate: true,
      });
      let emailResult: { ok: boolean; skipped: boolean; reason?: string | null } = {
        ok: true,
        skipped: true,
        reason: "not_sent",
      };

      if (!studentAccount.ok) {
        return NextResponse.json(
          {
            ok: false,
            message: `Đã tạo đơn ${order.orderCode}, nhưng chưa tạo được tài khoản học: ${studentAccount.reason}`,
            order,
            studentAccount: {
              ok: studentAccount.ok,
              skipped: studentAccount.skipped,
              created: studentAccount.created,
              reason: studentAccount.reason,
            },
          },
          { status: 500 },
        );
      }

      if (studentAccount.temporaryPassword) {
        const result = await sendPaymentSuccessEmail(order, {
          account: {
            email: studentAccount.email,
            temporaryPassword: studentAccount.temporaryPassword,
            created: studentAccount.created,
            mustChangePassword: true,
          },
        });
        emailResult = { ok: result.ok, skipped: result.skipped, reason: result.reason };

        if (result.ok && !result.skipped) {
          await markPaymentEmailSent(order.orderCode);
          await logStudentActivity({
            userId: studentAccount.userId,
            studentEmail: email,
            studentPhone: phone,
            eventType: "payment_success_email_sent",
            eventTitle: "Đã gửi email thanh toán thành công",
            eventDescription: `Email cấp tài khoản đã gửi sau đơn ${order.orderCode}.`,
            status: "success",
            actorType: "admin",
            actorId: adminActor?.id ?? null,
            actorEmail: adminActor?.email ?? null,
            metadata: { orderCode: order.orderCode, courseSlugs },
          });
        } else {
          await markPaymentEmailError(order.orderCode, result.reason ?? "Payment success email was skipped.");
          await logStudentActivity({
            userId: studentAccount.userId,
            studentEmail: email,
            studentPhone: phone,
            eventType: "payment_success_email_failed",
            eventTitle: "Gửi email thanh toán thành công thất bại",
            eventDescription: result.reason ?? "Payment success email was skipped.",
            status: "failed",
            actorType: "admin",
            actorId: adminActor?.id ?? null,
            actorEmail: adminActor?.email ?? null,
            metadata: { orderCode: order.orderCode, courseSlugs },
          });
        }
      }

      await logStudentActivity({
        userId: studentAccount.userId,
        studentEmail: email,
        studentPhone: phone,
        eventType: "course_access_granted",
        eventTitle: "Đã cấp quyền học viên",
        eventDescription: `Cấp quyền qua đơn thủ công ${order.orderCode}.`,
        status: "success",
        actorType: "admin",
        actorId: adminActor?.id ?? null,
        actorEmail: adminActor?.email ?? null,
        metadata: { orderCode: order.orderCode, courseSlugs },
      });

      invalidateAdminModules(["leads", "orders", "students"]);

      return NextResponse.json({
        ok: true,
        message:
          emailResult.ok && !emailResult.skipped
            ? `Đã lưu hồ sơ, cấp quyền học qua đơn ${order.orderCode}, tạo mật khẩu và gửi email cho học viên.`
            : `Đã lưu hồ sơ và cấp quyền học qua đơn ${order.orderCode}. Tài khoản đã xử lý nhưng email chưa gửi: ${emailResult.reason ?? "không rõ lý do"}.`,
        order,
        studentAccount: {
          ok: studentAccount.ok,
          skipped: studentAccount.skipped,
          created: studentAccount.created,
          reason: studentAccount.reason,
        },
        paymentEmail: emailResult,
      });
    }

    invalidateAdminModules(["leads", "students"]);

    return NextResponse.json({
      ok: true,
      message: "Đã lưu hồ sơ học viên. Quyền học sẽ được cấp khi trạng thái là đã thanh toán.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Không lưu được học viên.",
      },
      { status: 500 },
    );
  }
}
