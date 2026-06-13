import type { PaymentOrder } from "@/services/orderService";
import { buildEmailLink } from "@/lib/notifications/email-link-bridge";

type PendingPaymentEmailOptions = {
  from?: string;
  siteUrl?: string;
  adminTo?: string;
  force?: boolean;
};

type ResendEmailPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SendEmailResult = {
  ok: boolean;
  skipped: boolean;
  reason: string | null;
};

const defaultSender = "The Anh Marketing <noreply@theanhmarketing.com>";
const defaultAdminRecipient = "theanhnguyen.marketing@gmail.com";
const defaultSiteUrl = "https://www.theanhmarketing.com";
const emailFontFamily = `'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`;
const adsSupportAgentName = "Agent Hỗ Trợ Quảng Cáo";
const adsSupportAgentUrl =
  "https://chatgpt.com/g/g-6a1ffa1efa308191b76782e0b93d4e30-ads-performance-planner";

const bankNameMap: Record<string, string> = {
  VCB: "Vietcombank",
  TCB: "Techcombank",
  ACB: "ACB",
  MBB: "MB Bank",
  BIDV: "BIDV",
  ICB: "VietinBank",
  CTG: "VietinBank",
  VPB: "VPBank",
  TPB: "TPBank",
  STB: "Sacombank",
  VIB: "VIB",
  HDB: "HDBank",
  OCB: "OCB",
  SHB: "SHB",
  EIB: "Eximbank",
  MSB: "MSB",
};

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
    const url = new URL(rawUrl);
    url.protocol = "https:";

    if (url.hostname === "theanhmarketing.com") {
      url.hostname = "www.theanhmarketing.com";
    }

    return url.origin;
  } catch {
    return defaultSiteUrl;
  }
}

function getBankDisplayName(bankCode: string) {
  const normalized = bankCode.trim().toUpperCase();
  if (!normalized) {
    return "";
  }

  return bankNameMap[normalized] ?? normalized;
}

function getPaymentBankConfig() {
  return {
    bankCode: process.env.SEPAY_BANK_CODE ?? "",
    bankAccountNumber: process.env.SEPAY_BANK_ACCOUNT_NUMBER ?? "",
    bankAccountName: process.env.SEPAY_BANK_ACCOUNT_NAME ?? "",
  };
}

function getSender(options: PendingPaymentEmailOptions) {
  return (
    options.from?.trim() ||
    process.env.PENDING_PAYMENT_EMAIL_FROM?.trim() ||
    process.env.REGISTRATION_NOTIFICATION_FROM?.trim() ||
    defaultSender
  );
}

function getAdminRecipient(options: PendingPaymentEmailOptions) {
  return (
    options.adminTo?.trim() ||
    process.env.NEW_LEAD_NOTIFICATION_TO?.trim() ||
    process.env.REGISTRATION_NOTIFICATION_EMAIL?.trim() ||
    defaultAdminRecipient
  );
}

function getCourseList(order: PaymentOrder) {
  if (order.orderItems.length > 0) {
    return order.orderItems.map((item) => item.title).filter(Boolean);
  }

  return [order.courseTitle].filter(Boolean);
}

function getFacebookAdsProductTitle(order: PaymentOrder) {
  const isFacebookAdsOrder =
    order.courseSlug === "facebook-ads-2026" ||
    order.orderItems.some((item) => item.slug === "facebook-ads-2026");

  if (!isFacebookAdsOrder) {
    return null;
  }

  if (order.amount === 799000 || order.orderItems.some((item) => item.price === 799000)) {
    return "Quảng cáo Facebook Master 2026 - Gói Hỗ Trợ 799K - Zoom lên ads + Agent kit";
  }

  return "Quảng cáo Facebook Master 2026 - Gói Video 399K";
}

function getProductTitle(order: PaymentOrder) {
  return getFacebookAdsProductTitle(order) || getCourseList(order)[0] || order.courseTitle || "Khóa học tại The Anh Marketing";
}

function isFacebookAdsSupportPlan(order: PaymentOrder) {
  const productTitle = getProductTitle(order);
  const courseIdentity = `${order.courseSlug} ${productTitle} ${order.amountLabel}`.toLowerCase();
  const isFacebookAdsOrder =
    order.courseSlug === "facebook-ads-2026" ||
    courseIdentity.includes("facebook ads") ||
    courseIdentity.includes("facebook master") ||
    courseIdentity.includes("quảng cáo facebook");
  const isSupportPlan = order.amount === 799000 || /799|zoom|hỗ trợ|ho tro/i.test(productTitle);

  return isFacebookAdsOrder && isSupportPlan;
}

function getPaymentStatusLabel(order: PaymentOrder) {
  if (order.status === "paid") {
    return "Đã thanh toán";
  }

  if (order.status === "failed") {
    return "Thanh toán lỗi";
  }

  if (order.status === "expired") {
    return "Hết hạn";
  }

  return "Chưa thanh toán";
}

function getTransferRows(order: PaymentOrder) {
  const sepay = getPaymentBankConfig();
  const transferContent = (order.sepayReferenceCode || order.orderCode).toUpperCase();
  const bankName = getBankDisplayName(sepay.bankCode);

  return [
    ["Ngân hàng", bankName],
    ["Số tài khoản", sepay.bankAccountNumber],
    ["Chủ tài khoản", sepay.bankAccountName],
    ["Số tiền", order.amountLabel],
    ["Nội dung chuyển khoản", transferContent],
  ].filter(([, value]) => Boolean(String(value ?? "").trim())) as Array<[string, string]>;
}

function buildRows(rows: Array<[string, string]>) {
  return rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:14px 0;border-top:1px solid #343434;color:#9d978c;font-size:14px;width:175px">
            ${escapeHtml(label)}
          </td>
          <td align="right" style="padding:14px 0;border-top:1px solid #343434;color:#f6f1e7;font-size:14px;font-weight:800">
            ${escapeHtml(value || "Chưa có")}
          </td>
        </tr>
      `,
    )
    .join("");
}

function buildResendRequest(payload: ResendEmailPayload, apiKey: string) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: Buffer.from(JSON.stringify(payload), "utf8"),
  });
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim().replace(/^\uFEFF/, "") ?? "";
}

async function sendPayload(payload: ResendEmailPayload): Promise<SendEmailResult> {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    return { ok: true, skipped: true, reason: "Missing RESEND_API_KEY" };
  }

  try {
    const response = await buildResendRequest(payload, apiKey);

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, skipped: false, reason: errorText || response.statusText };
    }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "Could not send email.",
    };
  }

  return { ok: true, skipped: false, reason: null };
}

export function shouldSendPendingPaymentEmail(order: PaymentOrder) {
  return order.status === "pending" && Boolean(order.email.trim());
}

export function buildAdminNewLeadEmailPayload(
  order: PaymentOrder,
  options: PendingPaymentEmailOptions = {},
): ResendEmailPayload {
  const statusLabel = getPaymentStatusLabel(order);
  const productTitle = getProductTitle(order);
  const safeName = escapeHtml(order.studentName || "Học viên mới");
  const rows = buildRows([
    ["Tên học viên", order.studentName],
    ["SDT", order.phone],
    ["Email", order.email],
    ["Khóa đăng ký", productTitle],
    ["Số tiền", order.amountLabel],
    ["Trạng thái thanh toán", statusLabel],
    ["Mã đơn", order.orderCode],
  ]);

  const html = `
    <div style="margin:0;padding:0;background:#080808;font-family:${emailFontFamily};color:#f6f1e7">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808;margin:0;padding:34px 14px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;background:#171717;border:1px solid #303030;border-radius:18px;overflow:hidden">
              <tr>
                <td style="padding:30px 32px;border-bottom:1px solid #39352a;background:#161616">
                  <p style="margin:0 0 10px;color:#f66628;font-size:13px;font-weight:800;letter-spacing:0.04em">
                    Lead mới từ landing page
                  </p>
                  <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;font-weight:800">
                    ${safeName} vừa đăng ký khóa học
                  </h1>
                  <p style="margin:14px 0 0;color:#bdb7a9;font-size:15px;line-height:1.7">
                    Trạng thái hiện tại: <strong style="color:#f66628">${escapeHtml(statusLabel)}</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #3a3a3a;border-radius:14px;background:#202020">
                    <tr>
                      <td style="padding:10px 22px 8px">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          ${rows}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = [
    "Lead mới từ landing page",
    `Tên học viên: ${order.studentName || "Chưa có"}`,
    `SDT: ${order.phone || "Chưa có"}`,
    `Email: ${order.email || "Chưa có"}`,
    `Khóa đăng ký: ${productTitle}`,
    `Số tiền: ${order.amountLabel}`,
    `Trạng thái thanh toán: ${statusLabel}`,
    `Mã đơn: ${order.orderCode}`,
  ].join("\n");

  return {
    from: getSender(options),
    to: getAdminRecipient(options),
    subject: `Lead mới - ${order.studentName || order.email || order.orderCode} - ${statusLabel}`,
    html: withEmailDocument(html),
    text,
  };
}

export function buildPendingPaymentEmailPayload(
  order: PaymentOrder,
  options: PendingPaymentEmailOptions = {},
): ResendEmailPayload {
  const siteUrl = normalizeSiteUrl(options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL);
  const paymentUrl = `${siteUrl}/thanh-toan/${encodeURIComponent(order.orderCode)}`;
  const paymentEmailUrl = buildEmailLink(paymentUrl, siteUrl);
  const adsSupportAgentEmailUrl = buildEmailLink(adsSupportAgentUrl, siteUrl);
  const statusLabel = getPaymentStatusLabel(order);
  const productTitle = getProductTitle(order);
  const safeName = escapeHtml(order.studentName || "bạn");
  const safeOrderCode = escapeHtml(order.orderCode);
  const safePaymentUrl = escapeHtml(paymentEmailUrl);
  const safeRawPaymentUrl = escapeHtml(paymentUrl);
  const safeQrUrl = escapeHtml(order.paymentQrUrl);
  const transferRows = getTransferRows(order);
  const transferBlock = transferRows.length
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #3a3a3a;border-radius:14px;background:#202020">
        <tr>
          <td style="padding:22px 24px">
            <p style="margin:0 0 18px;color:#f66628;font-size:13px;font-weight:800;letter-spacing:0.03em">
              Thông tin chuyển khoản để copy
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              ${buildRows(transferRows)}
            </table>
          </td>
        </tr>
      </table>
    `
    : "";
  const supportAgentBlock = isFacebookAdsSupportPlan(order)
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #4b3321;border-radius:14px;background:#241a13">
        <tr>
          <td style="padding:22px 24px">
            <p style="margin:0 0 10px;color:#f66628;font-size:13px;font-weight:800;letter-spacing:0.03em">
              ${escapeHtml(adsSupportAgentName)}
            </p>
            <p style="margin:0;color:#e9e3d5;font-size:15px;line-height:1.7">
              Gói Hỗ Trợ 799.000đ có thêm agent này để bạn chuẩn bị câu hỏi, lên kế hoạch test ads và đọc chỉ số sau khi học.
            </p>
            <p style="margin:16px 0 0">
              <a href="${escapeHtml(adsSupportAgentEmailUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#f66628;color:#111111;text-decoration:none;border-radius:10px;padding:13px 18px;font-size:14px;font-weight:900">
                Mở ${escapeHtml(adsSupportAgentName)}
              </a>
            </p>
          </td>
        </tr>
      </table>
    `
    : "";
  const qrBlock = order.paymentQrUrl
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #3a3a3a;border-radius:14px;background:#f6f1e7">
        <tr>
          <td align="center" style="padding:24px">
            <p style="margin:0 0 16px;color:#161616;font-size:15px;font-weight:900">
              Quét QR Sepay để hoàn tất thanh toán
            </p>
            <img src="${safeQrUrl}" alt="QR thanh toán Sepay ${safeOrderCode}" style="display:block;width:260px;max-width:100%;height:auto;border-radius:12px;border:1px solid #ded4c5;background:#ffffff" />
          </td>
        </tr>
      </table>
    `
    : "";

  const html = `
    <div style="margin:0;padding:0;background:#080808;font-family:${emailFontFamily};color:#f6f1e7">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808;margin:0;padding:42px 14px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#171717;border:1px solid #303030;border-radius:18px;overflow:hidden">
              <tr>
                <td align="center" style="padding:42px 34px 36px;background:#161616;border-bottom:1px solid #39352a">
                  <div style="width:76px;height:76px;border-radius:50%;background:#f66628;color:#101010;font-size:42px;line-height:76px;font-weight:900;margin:0 auto 24px">
                    !
                  </div>
                  <h1 style="margin:0;color:#f66628;font-size:26px;line-height:1.25;font-weight:800">
                    Chưa thanh toán
                  </h1>
                  <p style="margin:16px 0 0;color:#e9e3d5;font-size:15px;line-height:1.7">
                    Đơn đăng ký của bạn đã được ghi nhận tại The Anh Marketing
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:34px">
                  <p style="margin:0 0 18px;color:#e9e3d5;font-size:16px;line-height:1.7">
                    Xin chào <strong style="color:#f66628">${safeName}</strong>,
                  </p>
                  <p style="margin:0;color:#bdb7a9;font-size:15px;line-height:1.8">
                    Hệ thống đã nhận thông tin đăng ký của bạn, nhưng đơn hàng hiện vẫn ở trạng thái
                    <strong style="color:#f66628">${escapeHtml(statusLabel)}</strong>.
                    Bạn có thể quét QR Sepay bên dưới hoặc mở trang thanh toán để hoàn tất.
                  </p>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;border:1px solid #3a3a3a;border-radius:14px;background:#202020">
                    <tr>
                      <td style="padding:22px 24px">
                        <p style="margin:0 0 18px;color:#f66628;font-size:13px;font-weight:800;letter-spacing:0.03em">
                          Chi tiết đơn hàng
                        </p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          ${buildRows([
                            ["Mã đơn hàng", order.orderCode],
                            ["Sản phẩm", productTitle],
                            ["Số tiền thanh toán", order.amountLabel],
                            ["Trạng thái thanh toán", statusLabel],
                          ])}
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${qrBlock}
                  ${transferBlock}
                  ${supportAgentBlock}

                  <div style="padding-top:28px;text-align:center">
                    <a href="${safePaymentUrl}" style="display:block;background:#f66628;color:#111111;text-decoration:none;border-radius:10px;padding:17px 20px;font-size:15px;font-weight:800">
                      Mở trang thanh toán
                    </a>
                    <p style="margin:20px 0 0;color:#8f887c;font-size:13px;line-height:1.7">
                      Nội dung chuyển khoản: <strong style="color:#f66628">${safeOrderCode}</strong><br />
                      Trang thanh toán: <a href="${safePaymentUrl}" style="color:#f66628">${safeRawPaymentUrl}</a>
                    </p>
                  </div>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:28px 20px;border-top:1px solid #2f2f2f;color:#8f887c;font-size:13px;line-height:1.7">
                  Nếu bạn đã chuyển khoản, hệ thống sẽ tự động xác nhận sau khi SePay báo giao dịch thành công.<br />
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
    "Đơn đăng ký chưa thanh toán tại The Anh Marketing",
    `Chào ${order.studentName || "bạn"},`,
    `Mã đơn: ${order.orderCode}`,
    `Khóa học: ${productTitle}`,
    `Số tiền: ${order.amountLabel}`,
    `Trạng thái thanh toán: ${statusLabel}`,
    transferRows.length
      ? ["", "Thông tin chuyển khoản:", ...transferRows.map(([label, value]) => `${label}: ${value}`)].join("\n")
      : "",
    order.paymentQrUrl ? `QR Sepay: ${order.paymentQrUrl}` : "",
    isFacebookAdsSupportPlan(order) ? `${adsSupportAgentName}: ${adsSupportAgentUrl}` : "",
    `Trang thanh toán: ${paymentUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    from: getSender(options),
    to: order.email,
    subject: `${productTitle} - Chưa thanh toán - ${order.orderCode}`,
    html: withEmailDocument(html),
    text,
  };
}

export async function sendAdminNewLeadNotification(
  order: PaymentOrder,
  options: PendingPaymentEmailOptions = {},
) {
  const payload = buildAdminNewLeadEmailPayload(order, options);
  return sendPayload(payload);
}

export async function sendPendingPaymentEmail(
  order: PaymentOrder,
  options: PendingPaymentEmailOptions = {},
) {
  if (!options.force && !shouldSendPendingPaymentEmail(order)) {
    return { ok: true, skipped: true, reason: "Order is not eligible for pending payment email." };
  }

  const payload = buildPendingPaymentEmailPayload(order, options);
  return sendPayload(payload);
}

export async function sendOrderCreatedEmails(
  order: PaymentOrder,
  options: PendingPaymentEmailOptions = {},
) {
  const admin = await sendAdminNewLeadNotification(order, options);
  const customer = await sendPendingPaymentEmail(order, options);

  return { admin, customer };
}
