import type { PaymentOrder } from "@/services/orderService";

type PaymentEmailOptions = {
  from?: string;
  siteUrl?: string;
  account?: {
    email: string;
    temporaryPassword?: string | null;
    created?: boolean;
    mustChangePassword?: boolean;
  };
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
const zaloGroupUrl = "https://zalo.me/g/ye0dcyowbepyhnrtyacr";

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

function normalizeSiteUrl(value?: string) {
  const rawUrl = String(value ?? "").trim() || defaultSiteUrl;

  try {
    return new URL(rawUrl).origin;
  } catch {
    return defaultSiteUrl;
  }
}

function getSender(options: PaymentEmailOptions) {
  return (
    options.from?.trim() ||
    process.env.PAYMENT_SUCCESS_EMAIL_FROM?.trim() ||
    process.env.REGISTRATION_NOTIFICATION_FROM?.trim() ||
    defaultSender
  );
}

function getCourseList(order: PaymentOrder) {
  if (order.orderItems.length > 0) {
    return order.orderItems.map((item) => item.title).filter(Boolean);
  }

  return [order.courseTitle].filter(Boolean);
}

function getProductTitle(order: PaymentOrder) {
  return getCourseList(order)[0] || order.courseTitle || "Khóa học tại The Anh Marketing";
}

function getPaymentFailedTitle(order: PaymentOrder) {
  return order.status === "expired" ? "Đơn thanh toán đã hết hạn" : "Thanh toán không thành công";
}

function getBenefitItems(order: PaymentOrder) {
  const productTitle = getProductTitle(order);
  const courseIdentity = `${order.courseSlug} ${productTitle}`.toLowerCase();
  const isAiMaster = courseIdentity.includes("ai-master-x10") || courseIdentity.includes("ai master x10");
  const isAgentKit = courseIdentity.includes("bo-agent-kit") || courseIdentity.includes("agent kit");
  const isSupportPlan = /799|zoom|hỗ trợ/i.test(productTitle);

  if (isAgentKit) {
    return [
      "Bộ agent, skill, command và workflow tiếng Việt",
      "Khung triển khai AI Agent cho marketing, bán hàng, vận hành và CRM",
      "12 slash command để gọi việc nhanh trong Codex/Claude",
      "Tài liệu hướng dẫn dùng ngay cho đội nhóm doanh nghiệp",
    ];
  }

  if (isAiMaster) {
    return [
      "Quyền truy cập khóa AI Master X10 hiệu suất",
      "Bộ agent, template và workflow triển khai landing, content, video, CRM",
      "Dashboard học viên và tài nguyên thực hành đi kèm",
      "Cách biến tri thức thành sản phẩm bán được",
    ];
  }

  if (isSupportPlan) {
    return [
      "Toàn bộ nội dung khóa Facebook Ads Master 2026",
      "Buổi Zoom hỗ trợ trực tiếp 1-1",
      "Tặng bộ Agent kit lên kế hoạch quảng cáo",
      "Gợi ý hướng tối ưu sau khi xem chỉ số",
    ];
  }

  return [
    "20+ video bài giảng và tài liệu thực hành",
    "Checklist setup chiến dịch Facebook Ads từ A-Z",
    "Bộ prompt AI hỗ trợ viết quảng cáo, phân tích chỉ số và tối ưu ngân sách",
    "Quyền truy cập cộng đồng Zalo hỗ trợ học viên",
  ];
}

function renderBenefitRows(items: string[]) {
  return items
    .map(
      (item) => `
        <tr>
          <td style="padding:0 10px 14px 0;color:#d8b653;font-size:18px;font-weight:900;width:22px">✓</td>
          <td style="padding:0 0 14px 0;color:#e9e3d5;font-size:15px;line-height:1.6">
            ${escapeHtml(item)}
          </td>
        </tr>`,
    )
    .join("");
}

function renderAccountBlock(account?: PaymentEmailOptions["account"]) {
  if (!account?.temporaryPassword) return "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #5b3a23;border-radius:14px;background:#211913">
      <tr>
        <td style="padding:22px 24px">
          <p style="margin:0 0 12px;color:#d8b653;font-size:13px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase">Tài khoản học</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:12px 0;border-top:1px solid #3a3024;color:#9d978c;font-size:14px">Tên tài khoản</td>
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

export function shouldSendPaymentSuccessEmail(order: PaymentOrder) {
  return order.status === "paid" && Boolean(order.email.trim()) && !order.paymentEmailSentAt;
}

export function shouldSendPaymentFailedEmail(order: PaymentOrder) {
  return (
    (order.status === "failed" || order.status === "expired") &&
    Boolean(order.email.trim()) &&
    !order.paymentEmailSentAt
  );
}

export function buildPaymentSuccessEmailPayload(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
): ResendEmailPayload {
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const productTitle = getProductTitle(order);
  const benefits = getBenefitItems(order);
  const loginUrl = `${siteUrl}/dang-nhap?next=${encodeURIComponent("/dashboard")}`;
  const accountBlock = renderAccountBlock(options.account);
  const accessCopy = options.account?.temporaryPassword
    ? `Hệ thống đã ghi nhận thanh toán và tạo tài khoản học cho bạn bằng email <strong style="color:#ffffff">${escapeHtml(order.email)}</strong>.`
    : `Hệ thống đã ghi nhận thanh toán của bạn. Vui lòng dùng đúng email <strong style="color:#ffffff">${escapeHtml(order.email)}</strong> để đăng nhập hoặc tạo tài khoản học.`;

  const html = withEmailDocument(`
    <div style="margin:0;padding:0;background:#080808;font-family:Arial,Helvetica,sans-serif;color:#f6f1e7">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808;margin:0;padding:42px 14px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#171717;border:1px solid #303030;border-radius:18px;overflow:hidden">
              <tr>
                <td align="center" style="padding:42px 34px 36px;background:#161616;border-bottom:1px solid #39352a">
                  <p style="margin:0 0 12px;color:#26c56d;font-size:13px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase">Đã nhận thanh toán</p>
                  <h1 style="margin:0;color:#d8b653;font-size:26px;line-height:1.25;letter-spacing:0.08em;text-transform:uppercase;font-weight:900">Thanh toán thành công</h1>
                  <p style="margin:16px 0 0;color:#e9e3d5;font-size:15px;line-height:1.7">Cảm ơn bạn đã tin tưởng The Anh Marketing</p>
                </td>
              </tr>
              <tr>
                <td style="padding:34px">
                  <p style="margin:0 0 18px;color:#e9e3d5;font-size:16px;line-height:1.7">Xin chào <strong style="color:#d8b653">${escapeHtml(order.studentName || "bạn")}</strong>,</p>
                  <p style="margin:0;color:#bdb7a9;font-size:15px;line-height:1.8">${accessCopy}</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;border:1px solid #3a3a3a;border-radius:14px;background:#202020">
                    <tr>
                      <td style="padding:22px 24px">
                        <p style="margin:0 0 18px;color:#d8b653;font-size:13px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase">Chi tiết đơn hàng</p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr><td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Mã đơn hàng</td><td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#d8b653;font-size:14px;font-weight:900">${escapeHtml(order.orderCode)}</td></tr>
                          <tr><td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Sản phẩm</td><td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#f6f1e7;font-size:14px;font-weight:800">${escapeHtml(productTitle)}</td></tr>
                          <tr><td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Số tiền thanh toán</td><td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#26c56d;font-size:21px;font-weight:900">${escapeHtml(order.amountLabel)}</td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  ${accountBlock}
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #3a3a3a;border-radius:14px;background:#202020">
                    <tr>
                      <td style="padding:22px 24px">
                        <p style="margin:0 0 18px;color:#d8b653;font-size:13px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase">Bạn nhận được</p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${renderBenefitRows(benefits)}</table>
                      </td>
                    </tr>
                  </table>
                  <div style="padding-top:30px;text-align:center">
                    <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display:block;background:#d8b653;color:#111111;text-decoration:none;border-radius:10px;padding:17px 20px;font-size:15px;font-weight:900;letter-spacing:0.02em;text-transform:uppercase">Vào dashboard học viên</a>
                    <a href="${zaloGroupUrl}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:12px;background:#1f6feb;color:#ffffff;text-decoration:none;border-radius:10px;padding:15px 20px;font-size:14px;font-weight:900">Tham gia nhóm Zalo hỗ trợ</a>
                    <p style="margin:16px 0 0;color:#8f887c;font-size:12px;line-height:1.7">
                      Nếu mail app chặn nút bên trên, hãy copy link này và mở trong Chrome/Safari:<br />
                      <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="color:#d8b653;word-break:break-all">${loginUrl}</a>
                    </p>
                  </div>
                  <p style="margin:24px 0 0;color:#8f887c;font-size:13px;line-height:1.7">Nếu chưa đăng nhập được, hãy phản hồi email này hoặc nhắn Fanpage The Anh Marketing để được kiểm tra thủ công.</p>
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
        "Tài khoản học:",
        `Email: ${options.account.email}`,
        `Mật khẩu tạm: ${options.account.temporaryPassword}`,
        "Sau lần đăng nhập đầu tiên, hệ thống sẽ yêu cầu bạn đổi mật khẩu.",
      ].join("\n")
    : "";

  return {
    from: getSender(options),
    to: order.email,
    subject: `Thanh toán thành công - ${productTitle} (${order.orderCode})`,
    html,
    text: [
      "Thanh toán thành công tại The Anh Marketing",
      `Xin chào ${order.studentName || "bạn"},`,
      `Đơn hàng ${order.orderCode} đã được ghi nhận thanh toán thành công.`,
      `Sản phẩm: ${productTitle}`,
      `Số tiền thanh toán: ${order.amountLabel}`,
      `Vui lòng dùng đúng email ${order.email} để đăng nhập hoặc tạo tài khoản học.`,
      accountText,
      "",
      "Bạn nhận được:",
      ...benefits.map((item) => `- ${item}`),
      "",
      `Dashboard học viên: ${loginUrl}`,
      `Nhóm Zalo hỗ trợ: ${zaloGroupUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function buildPaymentFailedEmailPayload(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
): ResendEmailPayload {
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const productTitle = getProductTitle(order);
  const statusTitle = getPaymentFailedTitle(order);
  const paymentUrl = `${siteUrl}/thanh-toan/${encodeURIComponent(order.orderCode)}`;

  const html = withEmailDocument(`
    <div style="margin:0;padding:0;background:#080808;font-family:Arial,Helvetica,sans-serif;color:#f6f1e7">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808;margin:0;padding:42px 14px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#171717;border:1px solid #303030;border-radius:18px;overflow:hidden">
              <tr>
                <td align="center" style="padding:42px 34px 36px;background:#161616;border-bottom:1px solid #39352a">
                  <p style="margin:0 0 12px;color:#f66628;font-size:13px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase">Cần kiểm tra lại</p>
                  <h1 style="margin:0;color:#f66628;font-size:26px;line-height:1.25;letter-spacing:0.08em;text-transform:uppercase;font-weight:900">${escapeHtml(statusTitle)}</h1>
                  <p style="margin:16px 0 0;color:#e9e3d5;font-size:15px;line-height:1.7">Đơn hàng của bạn chưa được ghi nhận thanh toán thành công</p>
                </td>
              </tr>
              <tr>
                <td style="padding:34px">
                  <p style="margin:0 0 18px;color:#e9e3d5;font-size:16px;line-height:1.7">Xin chào <strong style="color:#f66628">${escapeHtml(order.studentName || "bạn")}</strong>,</p>
                  <p style="margin:0;color:#bdb7a9;font-size:15px;line-height:1.8">Hệ thống chưa xác nhận được thanh toán cho đơn <strong style="color:#f66628">${escapeHtml(order.orderCode)}</strong>. Bạn có thể mở lại trang thanh toán để kiểm tra QR, nội dung chuyển khoản hoặc thực hiện lại.</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;border:1px solid #3a3a3a;border-radius:14px;background:#202020">
                    <tr>
                      <td style="padding:22px 24px">
                        <p style="margin:0 0 18px;color:#f66628;font-size:13px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase">Chi tiết đơn hàng</p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr><td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Mã đơn hàng</td><td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#f66628;font-size:14px;font-weight:900">${escapeHtml(order.orderCode)}</td></tr>
                          <tr><td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Sản phẩm</td><td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#f6f1e7;font-size:14px;font-weight:800">${escapeHtml(productTitle)}</td></tr>
                          <tr><td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Số tiền</td><td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#f6f1e7;font-size:18px;font-weight:900">${escapeHtml(order.amountLabel)}</td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <div style="padding-top:30px;text-align:center">
                    <a href="${paymentUrl}" style="display:block;background:#f66628;color:#111111;text-decoration:none;border-radius:10px;padding:17px 20px;font-size:15px;font-weight:900;letter-spacing:0.02em;text-transform:uppercase">Mở lại trang thanh toán</a>
                    <p style="margin:20px 0 0;color:#8f887c;font-size:13px;line-height:1.7">Nếu bạn đã chuyển khoản nhưng hệ thống chưa xác nhận, hãy chụp màn hình giao dịch và nhắn Fanpage The Anh Marketing để được kiểm tra thủ công.<br />Trang thanh toán: <a href="${paymentUrl}" style="color:#f66628">${paymentUrl}</a></p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>`);

  return {
    from: getSender(options),
    to: order.email,
    subject: `${statusTitle} - ${productTitle} (${order.orderCode})`,
    html,
    text: [
      `${statusTitle} tại The Anh Marketing`,
      `Xin chào ${order.studentName || "bạn"},`,
      `Mã đơn hàng: ${order.orderCode}`,
      `Sản phẩm: ${productTitle}`,
      `Số tiền: ${order.amountLabel}`,
      "Hệ thống chưa xác nhận được thanh toán thành công cho đơn hàng này.",
      `Trang thanh toán: ${paymentUrl}`,
    ].join("\n"),
  };
}

export async function sendPaymentSuccessEmail(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
) {
  if (!shouldSendPaymentSuccessEmail(order)) {
    return { ok: true, skipped: true, reason: "Order is not eligible for payment success email." };
  }

  const payload = buildPaymentSuccessEmailPayload(order, options);
  return sendPayload(payload, "Failed to send payment success email.");
}

export async function sendPaymentFailedEmail(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
) {
  if (!shouldSendPaymentFailedEmail(order)) {
    return { ok: true, skipped: true, reason: "Order is not eligible for failed payment email." };
  }

  const payload = buildPaymentFailedEmailPayload(order, options);
  return sendPayload(payload, "Failed to send payment failed email.");
}
