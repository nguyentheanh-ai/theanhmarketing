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

const defaultSender = "The Anh Marketing <onboarding@resend.dev>";
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

function normalizeSiteUrl(value?: string) {
  const rawUrl = String(value ?? "").trim() || defaultSiteUrl;

  try {
    const url = new URL(rawUrl);
    return url.origin;
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
  const isSupportPlan = /799|zoom|agent kit|hỗ trợ/i.test(productTitle);

  if (isAiMaster) {
    return [
      "Quyền truy cập khóa AI Master X10 hiệu suất",
      "Lộ trình biến tri thức thành sản phẩm bán được",
      "Bộ agent, template và workflow triển khai landing, content, video, CRM",
      "Dashboard học viên và tài nguyên thực hành đi kèm",
    ];
  }

  if (isSupportPlan) {
    return [
      "Toàn bộ nội dung khóa Facebook Ads Master 2026",
      "1 buổi Zoom lên ads trên case thực tế",
      "Tặng bộ Agent kit lên kế hoạch quảng cáo",
      "Gợi ý hướng tối ưu sau khi xem chỉ số",
    ];
  }

  return [
    "Quyền truy cập khóa Facebook Ads Master 2026",
    "20+ video bài giảng và tài liệu thực hành",
    "Checklist chạy ads 2026 và prompt AI viết content",
    "Dashboard đọc chỉ số cơ bản để biết cần tối ưu điểm nào",
  ];
}

function renderBenefitRows(items: string[]) {
  return items
    .map(
      (item) => `
        <tr>
          <td style="padding:0 0 14px 0;color:#e9e3d5;font-size:15px;line-height:1.6">
            <span style="color:#d8b653;font-weight:800">✓</span>
            ${escapeHtml(item)}
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderAccountBlock(account: PaymentEmailOptions["account"]) {
  if (!account?.temporaryPassword) {
    return "";
  }

  const safeAccountEmail = escapeHtml(account.email);
  const safePassword = escapeHtml(account.temporaryPassword);

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #5b3a23;border-radius:14px;background:#211913">
      <tr>
        <td style="padding:22px 24px">
          <p style="margin:0 0 18px;color:#d8b653;font-size:15px;font-weight:900">
            Tài khoản học
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:12px 0;border-top:1px solid #3a3024;color:#9d978c;font-size:14px">Tên tài khoản</td>
              <td align="right" style="padding:12px 0;border-top:1px solid #3a3024;color:#ffffff;font-size:14px;font-weight:800">${safeAccountEmail}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-top:1px solid #3a3024;color:#9d978c;font-size:14px">Mật khẩu tạm</td>
              <td align="right" style="padding:12px 0;border-top:1px solid #3a3024;color:#d8b653;font-size:17px;font-weight:900">${safePassword}</td>
            </tr>
          </table>
          <p style="margin:14px 0 0;color:#bdb7a9;font-size:13px;line-height:1.7">
            Sau khi đăng nhập lần đầu, hệ thống sẽ yêu cầu bạn đổi mật khẩu để bảo vệ tài khoản.
          </p>
        </td>
      </tr>
    </table>
  `;
}

export function shouldSendPaymentSuccessEmail(order: PaymentOrder) {
  return order.status === "paid" && Boolean(order.email.trim()) && !order.paymentEmailSentAt;
}

export function shouldSendPaymentFailedEmail(order: PaymentOrder) {
  return (order.status === "failed" || order.status === "expired") && Boolean(order.email.trim()) && !order.paymentEmailSentAt;
}

export function buildPaymentSuccessEmailPayload(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
): ResendEmailPayload {
  const siteUrl = normalizeSiteUrl(options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL);
  const loginUrl = `${siteUrl}/dang-nhap?next=${encodeURIComponent("/dashboard")}`;
  const dashboardUrl = `${siteUrl}/dashboard`;
  const courseList = getCourseList(order);
  const productTitle = getProductTitle(order);
  const benefitItems = getBenefitItems(order);
  const safeName = escapeHtml(order.studentName || "bạn");
  const safeEmail = escapeHtml(order.email);
  const safeOrderCode = escapeHtml(order.orderCode);
  const safeAmount = escapeHtml(order.amountLabel);
  const safeProductTitle = escapeHtml(productTitle);
  const benefitRows = renderBenefitRows(benefitItems);
  const accountBlock = renderAccountBlock(options.account);
  const accountIntro = options.account?.temporaryPassword
    ? `Hệ thống đã ghi nhận thanh toán và tạo tài khoản học cho bạn bằng email
                    <strong style="color:#ffffff">${safeEmail}</strong>.`
    : `Hệ thống đã ghi nhận thanh toán của bạn. Vui lòng dùng đúng email
                    <strong style="color:#ffffff">${safeEmail}</strong> để đăng nhập hoặc tạo tài khoản học.`;

  const html = `
    <div style="margin:0;padding:0;background:#080808;font-family:Arial,Helvetica,sans-serif;color:#f6f1e7">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808;margin:0;padding:42px 14px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#171717;border:1px solid #303030;border-radius:18px;overflow:hidden">
              <tr>
                <td align="center" style="padding:42px 34px 36px;background:#161616;border-bottom:1px solid #39352a">
                  <div style="width:76px;height:76px;border-radius:50%;background:#d8b653;color:#101010;font-size:42px;line-height:76px;font-weight:400;margin:0 auto 24px">
                    ✓
                  </div>
                  <h1 style="margin:0;color:#d8b653;font-size:26px;line-height:1.25;letter-spacing:0.08em;text-transform:uppercase;font-weight:900">
                    Thanh toán thành công
                  </h1>
                  <p style="margin:16px 0 0;color:#e9e3d5;font-size:15px;line-height:1.7">
                    Cảm ơn bạn đã tin tưởng The Anh Marketing
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:34px">
                  <p style="margin:0 0 18px;color:#e9e3d5;font-size:16px;line-height:1.7">
                    Xin chào <strong style="color:#d8b653">${safeName}</strong>,
                  </p>
                  <p style="margin:0;color:#bdb7a9;font-size:15px;line-height:1.8">
                    ${accountIntro}
                  </p>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;border:1px solid #3a3a3a;border-radius:14px;background:#202020">
                    <tr>
                      <td style="padding:22px 24px">
                        <p style="margin:0 0 18px;color:#d8b653;font-size:13px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase">
                          Chi tiết đơn hàng
                        </p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Mã đơn hàng</td>
                            <td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#d8b653;font-size:14px;font-weight:900">${safeOrderCode}</td>
                          </tr>
                          <tr>
                            <td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Sản phẩm</td>
                            <td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#f6f1e7;font-size:14px;font-weight:800">${safeProductTitle}</td>
                          </tr>
                          <tr>
                            <td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Số tiền thanh toán</td>
                            <td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#26c56d;font-size:21px;font-weight:900">${safeAmount}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${accountBlock}

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #514528;border-radius:14px;background:#201d14">
                    <tr>
                      <td style="padding:22px 24px">
                        <p style="margin:0 0 18px;color:#d8b653;font-size:15px;font-weight:900">
                          🎁 Bạn sẽ nhận được:
                        </p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          ${benefitRows}
                        </table>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #3a3a3a;border-radius:14px;background:#202020">
                    <tr>
                      <td style="padding:22px 24px">
                        <p style="margin:0 0 18px;color:#d8b653;font-size:15px;font-weight:900">
                          📝 Cách nhận sản phẩm:
                        </p>
                        <p style="margin:0 0 12px;color:#e9e3d5;font-size:14px;line-height:1.7">
                          <strong style="color:#d8b653">Bước 1:</strong> Bấm nút bên dưới để vào nhóm Zalo nhận hướng dẫn.
                        </p>
                        <p style="margin:0 0 12px;color:#e9e3d5;font-size:14px;line-height:1.7">
                          <strong style="color:#d8b653">Bước 2:</strong> Đăng nhập hoặc tạo tài khoản bằng đúng email đã thanh toán.
                        </p>
                        <p style="margin:0;color:#e9e3d5;font-size:14px;line-height:1.7">
                          <strong style="color:#d8b653">Bước 3:</strong> Vào dashboard để mở khóa học, tài liệu và nhận hỗ trợ khi cần.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <div style="padding-top:30px;text-align:center">
                    <a href="${zaloGroupUrl}" style="display:block;background:#d8b653;color:#111111;text-decoration:none;border-radius:10px;padding:17px 20px;font-size:15px;font-weight:900;letter-spacing:0.02em;text-transform:uppercase">
                      Tham gia Zalo nhận hướng dẫn
                    </a>
                    <a href="${loginUrl}" style="display:block;margin-top:14px;background:#f66628;color:#111111;text-decoration:none;border-radius:10px;padding:15px 20px;font-size:15px;font-weight:900">
                      Vào khu vực học ngay
                    </a>
                    <p style="margin:20px 0 0;color:#8f887c;font-size:13px;line-height:1.7">
                      Link dashboard: <a href="${dashboardUrl}" style="color:#d8b653">${dashboardUrl}</a>
                    </p>
                  </div>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:28px 20px;border-top:1px solid #2f2f2f;color:#8f887c;font-size:13px;line-height:1.7">
                  Cần hỗ trợ? Fanpage <strong style="color:#d8b653">The Anh Marketing</strong><br />
                  © 2026 The Anh Marketing. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = [
    "Thanh toán thành công tại The Anh Marketing",
    `Chào ${order.studentName || "bạn"},`,
    `Mã đơn: ${order.orderCode}`,
    `Số tiền: ${order.amountLabel}`,
    `Khóa học: ${courseList.join(", ") || order.courseTitle}`,
    `Bạn sẽ nhận được: ${benefitItems.join("; ")}`,
    options.account?.temporaryPassword
      ? `Tài khoản học: ${options.account.email}\nMật khẩu tạm: ${options.account.temporaryPassword}\nSau khi đăng nhập lần đầu, hệ thống sẽ yêu cầu bạn đổi mật khẩu.`
      : "",
    `Vui lòng dùng đúng email ${order.email} để đăng nhập/tạo tài khoản và mở khóa học.`,
    `Nhóm Zalo: ${zaloGroupUrl}`,
    `Link đăng nhập: ${loginUrl}`,
    `Dashboard: ${dashboardUrl}`,
  ].join("\n");

  return {
    from: getSender(options),
    to: order.email,
    subject: `${productTitle} - Thanh toán thành công - ${order.orderCode}`,
    html,
    text,
  };
}

export function buildPaymentFailedEmailPayload(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
): ResendEmailPayload {
  const siteUrl = normalizeSiteUrl(options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL);
  const paymentUrl = `${siteUrl}/thanh-toan/${encodeURIComponent(order.orderCode)}`;
  const productTitle = getProductTitle(order);
  const statusTitle = getPaymentFailedTitle(order);
  const safeName = escapeHtml(order.studentName || "bạn");
  const safeOrderCode = escapeHtml(order.orderCode);
  const safeAmount = escapeHtml(order.amountLabel);
  const safeProductTitle = escapeHtml(productTitle);
  const safePaymentUrl = escapeHtml(paymentUrl);

  const html = `
    <div style="margin:0;padding:0;background:#080808;font-family:Arial,Helvetica,sans-serif;color:#f6f1e7">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808;margin:0;padding:42px 14px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#171717;border:1px solid #303030;border-radius:18px;overflow:hidden">
              <tr>
                <td align="center" style="padding:42px 34px 36px;background:#161616;border-bottom:1px solid #39352a">
                  <div style="width:76px;height:76px;border-radius:50%;background:#f66628;color:#101010;font-size:42px;line-height:76px;font-weight:900;margin:0 auto 24px">
                    !
                  </div>
                  <h1 style="margin:0;color:#f66628;font-size:26px;line-height:1.25;letter-spacing:0.08em;text-transform:uppercase;font-weight:900">
                    ${escapeHtml(statusTitle)}
                  </h1>
                  <p style="margin:16px 0 0;color:#e9e3d5;font-size:15px;line-height:1.7">
                    Đơn hàng của bạn chưa được ghi nhận thanh toán thành công
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:34px">
                  <p style="margin:0 0 18px;color:#e9e3d5;font-size:16px;line-height:1.7">
                    Xin chào <strong style="color:#f66628">${safeName}</strong>,
                  </p>
                  <p style="margin:0;color:#bdb7a9;font-size:15px;line-height:1.8">
                    Hệ thống chưa xác nhận được thanh toán cho đơn
                    <strong style="color:#f66628">${safeOrderCode}</strong>.
                    Anh/chị có thể mở lại trang thanh toán bên dưới để kiểm tra QR, nội dung chuyển khoản hoặc thực hiện lại.
                  </p>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;border:1px solid #3a3a3a;border-radius:14px;background:#202020">
                    <tr>
                      <td style="padding:22px 24px">
                        <p style="margin:0 0 18px;color:#f66628;font-size:13px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase">
                          Chi tiết đơn hàng
                        </p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Mã đơn hàng</td>
                            <td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#f66628;font-size:14px;font-weight:900">${safeOrderCode}</td>
                          </tr>
                          <tr>
                            <td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Sản phẩm</td>
                            <td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#f6f1e7;font-size:14px;font-weight:800">${safeProductTitle}</td>
                          </tr>
                          <tr>
                            <td style="padding:13px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px">Số tiền</td>
                            <td align="right" style="padding:13px 0;border-top:1px solid #343434;color:#f6f1e7;font-size:18px;font-weight:900">${safeAmount}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <div style="padding-top:30px;text-align:center">
                    <a href="${safePaymentUrl}" style="display:block;background:#f66628;color:#111111;text-decoration:none;border-radius:10px;padding:17px 20px;font-size:15px;font-weight:900;letter-spacing:0.02em;text-transform:uppercase">
                      Mở lại trang thanh toán
                    </a>
                    <p style="margin:20px 0 0;color:#8f887c;font-size:13px;line-height:1.7">
                      Nếu bạn đã chuyển khoản nhưng hệ thống chưa xác nhận, hãy chụp màn hình giao dịch và nhắn Fanpage The Anh Marketing để được kiểm tra thủ công.<br />
                      Trang thanh toán: <a href="${safePaymentUrl}" style="color:#f66628">${safePaymentUrl}</a>
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = [
    `${statusTitle} tại The Anh Marketing`,
    `Chào ${order.studentName || "bạn"},`,
    `Mã đơn: ${order.orderCode}`,
    `Khóa học: ${productTitle}`,
    `Số tiền: ${order.amountLabel}`,
    "Hệ thống chưa xác nhận được thanh toán thành công cho đơn hàng này.",
    `Trang thanh toán: ${paymentUrl}`,
  ].join("\n");

  return {
    from: getSender(options),
    to: order.email,
    subject: `${productTitle} - ${statusTitle} - ${order.orderCode}`,
    html,
    text,
  };
}

export async function sendPaymentSuccessEmail(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
) {
  if (!shouldSendPaymentSuccessEmail(order)) {
    return { ok: true, skipped: true, reason: "Order is not eligible for payment success email." };
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { ok: true, skipped: true, reason: "Missing RESEND_API_KEY" };
  }

  try {
    const payload = buildPaymentSuccessEmailPayload(order, options);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, skipped: false, reason: errorText || response.statusText };
    }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "Could not send payment success email.",
    };
  }

  return { ok: true, skipped: false, reason: null };
}

export async function sendPaymentFailedEmail(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
) {
  if (!shouldSendPaymentFailedEmail(order)) {
    return { ok: true, skipped: true, reason: "Order is not eligible for payment failed email." };
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { ok: true, skipped: true, reason: "Missing RESEND_API_KEY" };
  }

  try {
    const payload = buildPaymentFailedEmailPayload(order, options);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, skipped: false, reason: errorText || response.statusText };
    }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "Could not send payment failed email.",
    };
  }

  return { ok: true, skipped: false, reason: null };
}
