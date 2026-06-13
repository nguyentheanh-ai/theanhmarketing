import { buildEmailLink } from "@/lib/notifications/email-link-bridge";

type StudentAccessEmailOptions = {
  from?: string;
  siteUrl?: string;
  account?: {
    email: string;
    temporaryPassword?: string | null;
    created?: boolean;
    mustChangePassword?: boolean;
  };
};

type StudentAccessEmailInput = {
  action: "grant" | "revoke";
  studentName: string;
  email: string;
  courseTitles: string[];
};

type ResendEmailPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

const defaultSender = "The Anh Marketing <noreply@theanhmarketing.com>";
const defaultSiteUrl = "https://www.theanhmarketing.com";
const emailFontFamily = `'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`;
const supportEmail = "theanhmarketing@gmail.com";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSiteUrl(value?: string) {
  const rawUrl = String(value ?? "").trim() || defaultSiteUrl;

  try {
    const url = new URL(rawUrl);
    url.protocol = "https:";

    if (url.hostname === "theanhmarketing.com") {
      url.hostname = "www.theanhmarketing.com";
    }

    url.port = "";

    return url.origin;
  } catch {
    return defaultSiteUrl;
  }
}

function getSender(options: StudentAccessEmailOptions) {
  return (
    options.from?.trim() ||
    process.env.PAYMENT_SUCCESS_EMAIL_FROM?.trim() ||
    process.env.REGISTRATION_NOTIFICATION_FROM?.trim() ||
    defaultSender
  );
}

function withEmailDocument(html: string) {
  return `<!doctype html><html><head><meta charset="UTF-8" /></head><body style="margin:0;padding:0">${html}</body></html>`;
}

function renderCourseList(courseTitles: string[]) {
  return courseTitles
    .filter(Boolean)
    .map(
      (courseTitle) => `
        <tr>
          <td style="padding:0 10px 12px 0;color:#d8b653;font-size:17px;font-weight:900;width:20px">✓</td>
          <td style="padding:0 0 12px 0;color:#e9e3d5;font-size:15px;line-height:1.6">${escapeHtml(courseTitle)}</td>
        </tr>`,
    )
    .join("");
}

function renderAccountBlock(account?: StudentAccessEmailOptions["account"]) {
  if (!account?.temporaryPassword) return "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #5b3a23;border-radius:14px;background:#211913">
      <tr>
        <td style="padding:22px 24px">
          <p style="margin:0 0 12px;color:#d8b653;font-size:13px;font-weight:800;letter-spacing:0.03em">Thông tin đăng nhập</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:12px 0;border-top:1px solid #3a3024;color:#9d978c;font-size:14px">Email</td>
              <td align="right" style="padding:12px 0;border-top:1px solid #3a3024;color:#ffffff;font-size:14px;font-weight:800">${escapeHtml(account.email)}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-top:1px solid #3a3024;color:#9d978c;font-size:14px">Mật khẩu tạm</td>
              <td align="right" style="padding:12px 0;border-top:1px solid #3a3024;color:#d8b653;font-size:17px;font-weight:900">${escapeHtml(account.temporaryPassword)}</td>
            </tr>
          </table>
          <p style="margin:12px 0 0;color:#bdb7a9;font-size:13px;line-height:1.7">
            Sau khi đăng nhập lần đầu, hệ thống sẽ yêu cầu bạn đổi mật khẩu để bảo vệ tài khoản.
          </p>
        </td>
      </tr>
    </table>`;
}

async function sendPayload(payload: ResendEmailPayload, fallbackReason: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim().replace(/^\uFEFF/, "") ?? "";

  if (!apiKey) {
    return { ok: true, skipped: true, reason: "Missing RESEND_API_KEY" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: Buffer.from(JSON.stringify(payload), "utf8"),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, skipped: false, reason: text || fallbackReason, status: response.status };
    }

    return { ok: true, skipped: false, reason: null };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message : fallbackReason,
    };
  }
}

export function buildStudentAccessEmailPayload(
  input: StudentAccessEmailInput,
  options: StudentAccessEmailOptions = {},
): ResendEmailPayload {
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const accessUrl = `${siteUrl}/vao-khoa-hoc`;
  const accessEmailUrl = buildEmailLink(accessUrl, siteUrl);
  const courseTitles = input.courseTitles.filter(Boolean);
  const firstCourseTitle = courseTitles[0] ?? "khóa học tại The Anh Marketing";
  const isGrant = input.action === "grant";
  const headline = isGrant ? "Đã cấp quyền học" : "Quyền học đã được cập nhật";
  const title = isGrant ? "Tài khoản học viên của bạn" : "Thông báo cập nhật quyền học";
  const intro = isGrant
    ? `Bạn đã được cấp quyền truy cập khóa học bên dưới.`
    : `Quyền truy cập của bạn với khóa học bên dưới đã được cập nhật.`;
  const accountBlock = renderAccountBlock(options.account);

  const html = withEmailDocument(`
    <div style="margin:0;padding:0;background:#080808;font-family:${emailFontFamily};color:#f6f1e7">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808;margin:0;padding:42px 14px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#171717;border:1px solid #303030;border-radius:18px;overflow:hidden">
              <tr>
                <td align="center" style="padding:38px 32px 30px;border-bottom:1px solid #39352a">
                  <p style="margin:0 0 12px;color:${isGrant ? "#26c56d" : "#f66628"};font-size:13px;font-weight:800;letter-spacing:0.04em">${escapeHtml(headline)}</p>
                  <h1 style="margin:0;color:#d8b653;font-size:25px;line-height:1.25;font-weight:800">${escapeHtml(title)}</h1>
                  <p style="margin:14px 0 0;color:#e9e3d5;font-size:15px;line-height:1.7">The Anh Marketing gửi bạn thông tin cập nhật tài khoản học viên.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px">
                  <p style="margin:0 0 18px;color:#e9e3d5;font-size:16px;line-height:1.7">Xin chào <strong style="color:#d8b653">${escapeHtml(input.studentName || "bạn")}</strong>,</p>
                  <p style="margin:0;color:#bdb7a9;font-size:15px;line-height:1.8">${escapeHtml(intro)}</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;border:1px solid #3a3a3a;border-radius:14px;background:#202020">
                    <tr>
                      <td style="padding:22px 24px">
                        <p style="margin:0 0 18px;color:#d8b653;font-size:13px;font-weight:800;letter-spacing:0.03em">Khóa học</p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${renderCourseList(courseTitles)}</table>
                      </td>
                    </tr>
                  </table>
                  ${accountBlock}
                  ${
                    isGrant
                      ? `<div style="padding-top:28px;text-align:center">
                          <a href="${escapeHtml(accessEmailUrl)}" target="_blank" rel="noopener noreferrer" style="display:block;background:#d8b653;color:#111111;text-decoration:none;border-radius:10px;padding:16px 20px;font-size:15px;font-weight:800">Truy cập khu vực học viên</a>
                          <p style="margin:16px 0 0;color:#8f887c;font-size:12px;line-height:1.7">
                            Link truy cập chính thức: <strong style="color:#f6f1e7">theanhmarketing.com</strong><br />
                            Nếu nút không hoạt động, anh/chị copy đường dẫn này và mở bằng Chrome: <a href="${escapeHtml(accessEmailUrl)}" target="_blank" rel="noopener noreferrer" style="color:#d8b653;word-break:break-all">${escapeHtml(accessUrl)}</a>
                          </p>
                        </div>`
                      : ""
                  }
                  <p style="margin:24px 0 0;color:#8f887c;font-size:13px;line-height:1.7">Nếu anh/chị cần hỗ trợ, hãy phản hồi email này hoặc gửi email tới <a href="mailto:${supportEmail}" style="color:#d8b653">${supportEmail}</a>.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>`);

  const accountText = options.account?.temporaryPassword
    ? [
        "",
        "Thông tin đăng nhập:",
        `Email: ${options.account.email}`,
        `Mật khẩu tạm: ${options.account.temporaryPassword}`,
        "Sau lần đăng nhập đầu tiên, hệ thống sẽ yêu cầu bạn đổi mật khẩu.",
      ].join("\n")
    : "";

  return {
    from: getSender(options),
    to: input.email,
    subject: `${headline} - ${firstCourseTitle}`,
    html,
    text: [
      headline,
      `Xin chào ${input.studentName || "bạn"},`,
      intro,
      "",
      "Khóa học:",
      ...courseTitles.map((courseTitle) => `- ${courseTitle}`),
      accountText,
      isGrant ? `Truy cập khu vực học viên: ${accessUrl}` : "",
      isGrant ? `Link truy cập chính thức: ${accessUrl}` : "",
      `Hỗ trợ: ${supportEmail}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export async function sendStudentAccessEmail(
  input: StudentAccessEmailInput,
  options: StudentAccessEmailOptions = {},
) {
  if (!input.email.trim() || input.courseTitles.length === 0) {
    return { ok: true, skipped: true, reason: "Missing recipient or course title." };
  }

  const payload = buildStudentAccessEmailPayload(input, options);
  return sendPayload(payload, "Failed to send student access email.");
}
