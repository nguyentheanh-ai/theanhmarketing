import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, isValidEmail } from "@/lib/security/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { passwordResetEmailSubject, sendPasswordResetEmailViaResend } from "@/lib/notifications/password-reset-email";
import { getPasswordResetConfirmUrl, getPasswordResetRedirectUrl } from "@/lib/auth/password-reset-url";
import { recordEmailLog } from "@/services/emailLogService";
import { recordLeadActivity } from "@/services/leadActivityService";

const sentMessage =
  "Email đã tồn tại trong hệ thống. Hệ thống đã gửi link đặt lại mật khẩu qua email để anh/chị tạo mật khẩu mới.";
const notFoundMessage =
  "Email này chưa tồn tại trong hệ thống. Anh/chị kiểm tra lại email hoặc đăng ký tài khoản mới.";
const invalidEmailMessage = "Email chưa đúng định dạng. Anh/chị kiểm tra lại email rồi gửi lại.";
const unavailableMessage =
  "Hệ thống chưa kiểm tra được tài khoản email lúc này. Anh/chị thử lại sau ít phút.";

async function findAuthUserByEmail(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  email: string,
) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "auth:forgot-password"),
      limit: 5,
      windowMs: 30 * 60 * 1000,
    });

    if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

    const body = (await request.json()) as { email?: string };
    const email = cleanEmail(body.email);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, status: "invalid_email", message: invalidEmailMessage }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, status: "unavailable", message: unavailableMessage }, { status: 503 });
    }

    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, status: "unavailable", message: unavailableMessage }, { status: 503 });
    }

    const user = await findAuthUserByEmail(supabase, email);

    if (!user) {
      return NextResponse.json({ ok: false, status: "not_found", message: notFoundMessage }, { status: 404 });
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: getPasswordResetRedirectUrl() },
    });
    const resetUrl = linkData.properties?.hashed_token
      ? getPasswordResetConfirmUrl(linkData.properties.hashed_token)
      : null;

    if (linkError || !resetUrl) {
      return NextResponse.json({ ok: false, status: "failed", message: unavailableMessage }, { status: 502 });
    }

    const emailResult = await sendPasswordResetEmailViaResend({ email, resetUrl });
    await recordEmailLog({
      email,
      subject: passwordResetEmailSubject,
      templateKey: "password_reset",
      resendEmailId: emailResult.resendEmailId,
      status: emailResult.ok ? "sent" : "failed",
      errorMessage: emailResult.ok ? null : emailResult.reason,
      metadata: { source: "forgot_password" },
    });

    if (!emailResult.ok) {
      return NextResponse.json({ ok: false, status: "failed", message: unavailableMessage }, { status: 502 });
    }

    await recordLeadActivity({
      activityType: "password_reset_requested",
      title: "Password reset requested",
      description: `Reset password request for ${email}`,
      metadata: { email },
    });

    return NextResponse.json({ ok: true, status: "sent", message: sentMessage });
  } catch {
    return NextResponse.json({ ok: false, status: "failed", message: unavailableMessage }, { status: 500 });
  }
}
