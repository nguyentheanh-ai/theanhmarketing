export type RegistrationNotificationInput = {
  studentName: string;
  phone: string;
  email: string;
  courseTitle: string;
  registeredAt?: string;
  source?: string;
};

const defaultRecipient = "theanhnguyen.marketing@gmail.com";
const defaultSender = "The Anh Marketing <noreply@theanhmarketing.com>";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function withEmailDocument(html: string) {
  return `<!doctype html><html><head><meta charset="UTF-8" /></head><body style="margin:0;padding:0">${html}</body></html>`;
}

function formatRegisteredAt(value?: string) {
  const date = value ? new Date(value) : new Date();

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function buildEmailHtml(input: RegistrationNotificationInput) {
  const rows = [
    ["Tên học viên", input.studentName],
    ["SĐT", input.phone],
    ["Email", input.email],
    ["Khóa đăng ký", input.courseTitle],
    ["Thời gian đăng ký", formatRegisteredAt(input.registeredAt)],
    ["Nguồn", input.source ?? "Website"],
  ];

  return `
    <div style="font-family:Arial,sans-serif;background:#f6f4ef;padding:28px;color:#111">
      <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:20px;padding:28px;border:1px solid #e8e2d8">
        <p style="margin:0 0 8px;color:#c77b20;font-weight:700">Đăng ký mới</p>
        <h1 style="margin:0 0 22px;font-size:28px;line-height:1.2">Có học viên vừa đăng ký</h1>
        <table style="width:100%;border-collapse:collapse">
          <tbody>
            ${rows
              .map(
                ([label, value]) => `
                  <tr>
                    <td style="padding:12px 0;border-top:1px solid #eee;color:#666;width:180px">${escapeHtml(label)}</td>
                    <td style="padding:12px 0;border-top:1px solid #eee;font-weight:700">${escapeHtml(value || "Chưa có")}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildEmailText(input: RegistrationNotificationInput) {
  return [
    "Có học viên vừa đăng ký",
    `Tên học viên: ${input.studentName || "Chưa có"}`,
    `SĐT: ${input.phone || "Chưa có"}`,
    `Email: ${input.email || "Chưa có"}`,
    `Khóa đăng ký: ${input.courseTitle || "Chưa có"}`,
    `Thời gian đăng ký: ${formatRegisteredAt(input.registeredAt)}`,
    `Nguồn: ${input.source ?? "Website"}`,
  ].join("\n");
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim().replace(/^\uFEFF/, "") ?? "";
}

export async function sendRegistrationNotification(input: RegistrationNotificationInput) {
  const apiKey = getResendApiKey();
  const to = process.env.REGISTRATION_NOTIFICATION_EMAIL || defaultRecipient;
  const from = process.env.REGISTRATION_NOTIFICATION_FROM || defaultSender;

  if (!apiKey) {
    return { ok: true, skipped: true, reason: "Missing RESEND_API_KEY" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Học viên đăng ký mới: ${input.studentName || input.email}`,
      html: withEmailDocument(buildEmailHtml(input)),
      text: buildEmailText(input),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, skipped: false, reason: errorText || response.statusText };
  }

  return { ok: true, skipped: false, reason: null };
}
