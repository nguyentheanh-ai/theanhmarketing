import { buildEmailLink } from "@/lib/notifications/email-link-bridge";

type PasswordResetEmailInput = {
  email: string;
  resetUrl: string;
};

type SendPasswordResetEmailResult = {
  ok: boolean;
  skipped: boolean;
  resendEmailId: string | null;
  reason: string | null;
};

export const passwordResetEmailSubject = "Đặt lại mật khẩu The Anh Marketing";

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim().replace(/^\uFEFF/, "") ?? "";
}

function getFromEmail() {
  return (
    process.env.PASSWORD_RESET_EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_DEFAULT_FROM ||
    process.env.PAYMENT_SUCCESS_EMAIL_FROM ||
    "The Anh Marketing <noreply@theanhmarketing.com>"
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPasswordResetEmail(input: PasswordResetEmailInput) {
  const resetUrl = escapeHtml(input.resetUrl);
  const resetEmailUrl = escapeHtml(buildEmailLink(input.resetUrl));

  return {
    from: getFromEmail(),
    to: [input.email],
    subject: passwordResetEmailSubject,
    text: [
      "Anh/chị vừa yêu cầu đặt lại mật khẩu tài khoản The Anh Marketing.",
      "",
      "Bấm link dưới đây để tạo mật khẩu mới:",
      input.resetUrl,
      "",
      "Nếu không phải anh/chị yêu cầu, có thể bỏ qua email này.",
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#080808;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#f6f1e7">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808;margin:0;padding:40px 14px">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#171717;border:1px solid #303030;border-radius:18px;overflow:hidden">
                <tr>
                  <td style="padding:34px 30px">
                    <p style="margin:0 0 12px;color:#7dd3fc;font-size:13px;font-weight:800;letter-spacing:0.04em">THE ANH MARKETING</p>
                    <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.25;font-weight:850">Đặt lại mật khẩu</h1>
                    <p style="margin:16px 0 0;color:#d8d3c8;font-size:15px;line-height:1.7">Anh/chị vừa yêu cầu đặt lại mật khẩu tài khoản The Anh Marketing. Bấm nút bên dưới để tạo mật khẩu mới.</p>
                    <p style="margin:28px 0">
                      <a href="${resetEmailUrl}" style="display:inline-block;background:#249dff;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 20px;font-size:15px;font-weight:800">Tạo mật khẩu mới</a>
                    </p>
                    <p style="margin:0;color:#a7a29a;font-size:13px;line-height:1.7">Nếu nút không mở được, copy link này vào trình duyệt:</p>
                    <p style="margin:8px 0 0;color:#7dd3fc;font-size:12px;line-height:1.6;word-break:break-all">${resetUrl}</p>
                    <p style="margin:22px 0 0;color:#8d887f;font-size:12px;line-height:1.7">Nếu không phải anh/chị yêu cầu, có thể bỏ qua email này.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>`,
  };
}

export async function sendPasswordResetEmailViaResend(
  input: PasswordResetEmailInput,
): Promise<SendPasswordResetEmailResult> {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    return { ok: false, skipped: true, resendEmailId: null, reason: "Missing RESEND_API_KEY" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: Buffer.from(JSON.stringify(buildPasswordResetEmail(input)), "utf8"),
    });

    const result = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        resendEmailId: null,
        reason: result?.message || response.statusText || "Resend password reset email failed.",
      };
    }

    return { ok: true, skipped: false, resendEmailId: result?.id ?? null, reason: null };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      resendEmailId: null,
      reason: error instanceof Error ? error.message : "Resend password reset email failed.",
    };
  }
}
