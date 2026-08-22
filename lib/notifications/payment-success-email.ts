import type { PaymentOrder } from "@/services/orderService";
import { buildEmailLink } from "@/lib/notifications/email-link-bridge";
import {
  AGENT_KIT_PREORDER_DEPOSIT_VND,
  AGENT_KIT_PREORDER_PRICE_VND,
  AGENT_KIT_PREORDER_REMAINING_VND,
  isAgentKitPreorderDepositOrder,
} from "@/lib/agent-kit-preorder";

type PaymentEmailOptions = {
  from?: string;
  siteUrl?: string;
  force?: boolean;
  idempotencyKey?: string;
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
const emailFontFamily = `'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`;
const zaloGroupUrl = "https://zalo.me/g/ye0dcyowbepyhnrtyacr";
const agentGuideUrl =
  "https://docs.google.com/document/d/1H8BbQZnSvyw50nO6oXw-u1PD0Ph_DWzXdeqPL9CZFrM/edit?usp=sharing";
const adsSupportAgentName = "Agent Hỗ Trợ Quảng Cáo";
const adsSupportAgentUrl =
  "https://chatgpt.com/g/g-6a1ffa1efa308191b76782e0b93d4e30-ads-performance-planner";
const facebookEbookCourseSlug = "ebook-facebook-ads-2026";
const facebookEbookProductTitle = "Ebook Facebook Ads 2026";
const facebookAdsEbookBundleTitle = "Facebook Ads Master 2026 + Ebook Facebook Ads 2026";
const facebookEbookReaderPath = "/thu-vien/facebook-ads";
const facebookEbookPdfPath = "/thu-vien/facebook-ads/pdf";

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
    if (url.hostname === "theanhmarketing.com") {
      url.hostname = "www.theanhmarketing.com";
    }
    url.protocol = "https:";
    url.port = "";
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

function hasExactCourseSlug(order: PaymentOrder, slug: string) {
  return (
    order.courseSlug.split(",").map((item) => item.trim()).includes(slug) ||
    order.orderItems.some((item) => item.slug === slug)
  );
}

function isFacebookAdsEbookBundle(order: PaymentOrder) {
  return (
    hasExactCourseSlug(order, "facebook-ads-2026") &&
    hasExactCourseSlug(order, facebookEbookCourseSlug)
  );
}

function getProductTitle(order: PaymentOrder) {
  if (isFacebookAdsEbookBundle(order)) {
    return facebookAdsEbookBundleTitle;
  }

  if (isFacebookEbookOrder(order)) {
    return facebookEbookProductTitle;
  }

  return getCourseList(order)[0] || order.courseTitle || "Khóa học tại The Anh Marketing";
}

function isFacebookEbookOrder(order: PaymentOrder) {
  return hasExactCourseSlug(order, facebookEbookCourseSlug);
}

function getPaymentFailedTitle(order: PaymentOrder) {
  return order.status === "expired" ? "Đơn thanh toán đã hết hạn" : "Thanh toán không thành công";
}

function getBenefitItems(order: PaymentOrder) {
  const productTitle = getProductTitle(order);

  if (isFacebookAdsEbookBundle(order)) {
    return [
      "Toàn bộ nội dung khóa Facebook Ads Master 2026",
      "Tặng AI Agent lên kế hoạch quảng cáo",
      "Khung plan test quảng cáo 7 ngày và prompt phân tích angle ads",
      "Quyền đọc Ebook Facebook Ads 2026 online và tải PDF",
      "Tài khoản học viên dùng chung cho cả khóa học và Ebook",
    ];
  }

  if (isFacebookEbookOrder(order)) {
    return [
      "Quyền đọc ebook online",
      "File PDF đầy đủ để tải về sau khi đồng ý điều khoản",
      "10 phần nội dung từ nền tảng, mục tiêu, target, content, Pixel/CAPI đến tối ưu và chính sách",
      "Tài khoản học viên để quay lại đọc bất cứ khi nào cần tra cứu",
    ];
  }

  const courseIdentity = `${order.courseSlug} ${productTitle}`.toLowerCase();
  const isAiMaster = courseIdentity.includes("ai-master-x10") || courseIdentity.includes("ai master x10");
  const isAdvancedFacebookAdsPlan = /1\.299|1299|chuyên sâu|zoom sửa|hệ thống quảng cáo chuyên sâu/i.test(productTitle);
  const isSupportPlan = /799|ai agent|agent kit|hỗ trợ/i.test(productTitle);

  if (isAiMaster) {
    return [
      "Quyền truy cập khóa AI Master X10 hiệu suất",
      "Lộ trình biến tri thức thành sản phẩm bán được",
      "Bộ agent, template và workflow triển khai landing, content, video, CRM",
      "Dashboard học viên và tài nguyên thực hành đi kèm",
    ];
  }

  if (isAdvancedFacebookAdsPlan) {
    return [
      "Toàn bộ nội dung khóa Facebook Ads Master 2026",
      "Tặng AI Agent lên kế hoạch quảng cáo",
      "1 buổi Zoom chuyên sâu sửa quảng cáo",
      "Xây dựng hệ thống quảng cáo chuyên sâu",
      "Rà lại offer, content, tracking và chỉ số trên case thực tế",
    ];
  }

  if (isSupportPlan) {
    return [
      "Toàn bộ nội dung khóa Facebook Ads Master 2026",
      "Tặng AI Agent lên kế hoạch quảng cáo",
      "Khung plan test quảng cáo 7 ngày",
      "Prompt phân tích sản phẩm, khách hàng và angle ads",
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

function renderEbookAccountBlock(account: PaymentEmailOptions["account"]) {
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
            Thông tin đăng nhập
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:12px 0;border-top:1px solid #3a3024;color:#9d978c;font-size:14px">Email</td>
              <td align="right" style="padding:12px 0;border-top:1px solid #3a3024;color:#ffffff;font-size:14px;font-weight:800">${safeAccountEmail}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-top:1px solid #3a3024;color:#9d978c;font-size:14px">Mật khẩu tạm</td>
              <td align="right" style="padding:12px 0;border-top:1px solid #3a3024;color:#d8b653;font-size:17px;font-weight:900">${safePassword}</td>
            </tr>
          </table>
          <p style="margin:14px 0 0;color:#bdb7a9;font-size:13px;line-height:1.7">
            Sau lần đăng nhập đầu tiên, hệ thống có thể yêu cầu anh/chị đổi mật khẩu để bảo vệ tài khoản.
          </p>
        </td>
      </tr>
    </table>
  `;
}

function shouldShowAgentGuide(items: string[]) {
  return items.some((item) => item.includes("Tặng AI Agent lên kế hoạch quảng cáo"));
}

function isFacebookAdsSupportPlan(order: PaymentOrder) {
  const isFacebookAdsOrder =
    order.courseSlug === "facebook-ads-2026" ||
    order.orderItems.some((item) => item.slug === "facebook-ads-2026");
  const isSupportPlan = order.amount === 799000 || order.orderItems.some((item) => item.price === 799000);

  return isFacebookAdsOrder && isSupportPlan;
}

export function shouldSendPaymentSuccessEmail(order: PaymentOrder) {
  return order.status === "paid" && Boolean(order.email.trim()) && !order.paymentEmailSentAt;
}

function buildPreorderDepositEmailPayload(order: PaymentOrder, options: PaymentEmailOptions = {}): ResendEmailPayload {
  const siteUrl = normalizeSiteUrl(options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL);
  const paymentUrl = buildEmailLink(`${siteUrl}/thanh-toan/${encodeURIComponent(order.orderCode)}`, siteUrl);
  const safeName = escapeHtml(order.studentName || "anh/chị");
  const safeOrderCode = escapeHtml(order.orderCode);
  const safePaymentUrl = escapeHtml(paymentUrl);
  const subject = `Đã nhận cọc preorder Đội ngũ nhân sự AI - ${order.orderCode}`;
  const text = [
    "Đã nhận tiền cọc preorder Đội ngũ nhân sự AI tại The Anh Marketing",
    `Chào ${order.studentName || "anh/chị"},`,
    `Mã đơn: ${order.orderCode}`,
    `Tiền cọc đã thanh toán: ${order.amountLabel || `${AGENT_KIT_PREORDER_DEPOSIT_VND.toLocaleString("vi-VN")}đ`}`,
    `Tổng giá preorder: ${AGENT_KIT_PREORDER_PRICE_VND.toLocaleString("vi-VN")}đ`,
    `Còn lại khi mở bán: ${AGENT_KIT_PREORDER_REMAINING_VND.toLocaleString("vi-VN")}đ`,
    "Khoản cọc được ghi nhận để giữ suất preorder; bộ cài sẽ được bàn giao sau khi sản phẩm mở bán và hoàn tất phần thanh toán còn lại.",
    `Xem lại đơn: ${paymentUrl}`,
  ].join("\n");
  const html = withEmailDocument(`
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;background:#171816;color:#f5eee2;font-family:${emailFontFamily};line-height:1.7">
      <p style="margin:0 0 8px;color:#d8b653;font-size:13px;font-weight:900;letter-spacing:.12em;text-transform:uppercase">ĐÃ NHẬN TIỀN CỌC PREORDER</p>
      <h1 style="margin:0 0 18px;color:#ffffff;font-size:28px;line-height:1.2">Giữ suất Đội ngũ nhân sự AI thành công</h1>
      <p>Chào ${safeName},</p>
      <p>The Anh Marketing đã ghi nhận tiền cọc trước ngày mở bán của anh/chị.</p>
      <div style="margin:24px 0;padding:20px;border:1px solid #5b3a23;border-radius:16px;background:#211913">
        <p style="margin:0 0 10px"><strong>Mã đơn:</strong> ${safeOrderCode}</p>
        <p style="margin:0 0 10px"><strong>Tiền cọc:</strong> ${escapeHtml(order.amountLabel || "399.000đ")}</p>
        <p style="margin:0 0 10px"><strong>Tổng giá preorder:</strong> 799.000đ</p>
        <p style="margin:0"><strong>Còn lại khi mở bán:</strong> 400.000đ</p>
      </div>
      <p>Khoản cọc được tính vào tổng giá preorder. Bộ cài và hướng dẫn sẽ được bàn giao sau khi sản phẩm mở bán và anh/chị hoàn tất phần thanh toán còn lại.</p>
      <p><a href="${safePaymentUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#d8b653;color:#171816;font-weight:900;text-decoration:none">Xem lại đơn cọc</a></p>
    </div>
  `);

  return { from: getSender(options), to: order.email, subject, html, text };
}

export function shouldSendPaymentFailedEmail(order: PaymentOrder) {
  return (order.status === "failed" || order.status === "expired") && Boolean(order.email.trim()) && !order.paymentEmailSentAt;
}

export function buildPaymentSuccessEmailPayload(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
): ResendEmailPayload {
  const siteUrl = normalizeSiteUrl(options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL);
  const accessUrl = `${siteUrl}/vao-khoa-hoc`;
  const dashboardUrl = `${siteUrl}/dashboard`;
  const isFacebookEbookBundle = isFacebookAdsEbookBundle(order);
  const isFacebookEbook = isFacebookEbookOrder(order) && !isFacebookEbookBundle;
  const facebookEbookReaderUrl = `${siteUrl}${facebookEbookReaderPath}`;
  const facebookEbookPdfUrl = `${siteUrl}${facebookEbookPdfPath}`;
  const accessEmailUrl = buildEmailLink(accessUrl, siteUrl);
  const dashboardEmailUrl = buildEmailLink(dashboardUrl, siteUrl);
  const facebookEbookReaderEmailUrl = buildEmailLink(facebookEbookReaderUrl, siteUrl);
  const facebookEbookPdfEmailUrl = buildEmailLink(facebookEbookPdfUrl, siteUrl);
  const zaloEmailUrl = buildEmailLink(zaloGroupUrl, siteUrl);
  const courseList = getCourseList(order);
  const productTitle = getProductTitle(order);
  const benefitItems = getBenefitItems(order);
  const showAgentGuide = shouldShowAgentGuide(benefitItems);
  const showAdsSupportAgent = isFacebookAdsSupportPlan(order);
  const safeName = escapeHtml(order.studentName || (isFacebookEbook ? "anh/chị" : "bạn"));
  const safeEmail = escapeHtml(order.email);
  const safeOrderCode = escapeHtml(order.orderCode);
  const safeAmount = escapeHtml(order.amountLabel);
  const safeProductTitle = escapeHtml(productTitle);
  const safeAgentGuideUrl = escapeHtml(buildEmailLink(agentGuideUrl, siteUrl));
  const safeAdsSupportAgentUrl = escapeHtml(buildEmailLink(adsSupportAgentUrl, siteUrl));
  const benefitRows = renderBenefitRows(benefitItems);
  const agentGuideButton = showAgentGuide
    ? `
                    <a href="${safeAgentGuideUrl}" style="display:block;margin-top:14px;background:#159cfb;color:#ffffff;text-decoration:none;border-radius:10px;padding:15px 20px;font-size:15px;font-weight:900">
                      Hướng dẫn sử dụng AI Agent
                    </a>
      `
    : "";
  const adsSupportAgentButton = showAdsSupportAgent
    ? `
                    <a href="${safeAdsSupportAgentUrl}" style="display:block;margin-top:14px;background:#f66628;color:#111111;text-decoration:none;border-radius:10px;padding:15px 20px;font-size:15px;font-weight:900">
                      Mở ${escapeHtml(adsSupportAgentName)}
                    </a>
      `
    : "";
  const accountBlock = isFacebookEbook ? renderEbookAccountBlock(options.account) : renderAccountBlock(options.account);
  const accountIntro = options.account?.temporaryPassword
    ? `Hệ thống đã ghi nhận thanh toán và tạo tài khoản học cho bạn bằng email
                    <strong style="color:#ffffff">${safeEmail}</strong>.`
    : `Hệ thống đã ghi nhận thanh toán của bạn. Vui lòng dùng đúng email
                    <strong style="color:#ffffff">${safeEmail}</strong> để đăng nhập hoặc tạo tài khoản học.`;

  const ebookAccountIntro = options.account?.temporaryPassword
    ? `Hệ thống đã ghi nhận thanh toán và tạo tài khoản đọc ebook cho anh/chị bằng email
                    <strong style="color:#ffffff">${safeEmail}</strong>.`
    : `Hệ thống đã ghi nhận thanh toán của anh/chị. Vui lòng dùng đúng email
                    <strong style="color:#ffffff">${safeEmail}</strong> để đăng nhập và đọc ebook.`;

  const deliveryInstructionsHtml = isFacebookEbook
    ? `
                        <p style="margin:0 0 12px;color:#e9e3d5;font-size:14px;line-height:1.7">
                          <strong style="color:#d8b653">Bước 1:</strong> Đăng nhập bằng tài khoản học trong email này.
                        </p>
                        <p style="margin:0 0 12px;color:#e9e3d5;font-size:14px;line-height:1.7">
                          <strong style="color:#d8b653">Bước 2:</strong> Bấm “Đọc ebook online” để mở Chương 1.
                        </p>
                        <p style="margin:0;color:#e9e3d5;font-size:14px;line-height:1.7">
                          <strong style="color:#d8b653">Bước 3:</strong> Nếu muốn tải bản PDF, bấm “Tải file PDF”, đọc và tick đồng ý điều khoản trước khi tải.
                        </p>
                        <p style="margin:14px 0 0;color:#f6f1e7;font-size:14px;line-height:1.7;background:#2a2417;border:1px solid #514528;border-radius:10px;padding:12px">
                          <strong style="color:#d8b653">Lưu ý:</strong> File PDF chỉ dành cho tài khoản đã mua quyền truy cập. Không chia sẻ, đăng tải lại hoặc bán lại nội dung ebook.
                        </p>
      `
    : `
                        <p style="margin:0 0 12px;color:#e9e3d5;font-size:14px;line-height:1.7">
                          <strong style="color:#d8b653">Bước 1:</strong> Bấm nút bên dưới để vào nhóm Zalo nhận hướng dẫn.
                        </p>
                        <p style="margin:0 0 12px;color:#e9e3d5;font-size:14px;line-height:1.7">
                          <strong style="color:#d8b653">Bước 2:</strong> Đăng nhập hoặc tạo tài khoản bằng đúng email đã thanh toán.
                        </p>
                        <p style="margin:0;color:#e9e3d5;font-size:14px;line-height:1.7">
                          <strong style="color:#d8b653">Bước 3:</strong> Vào dashboard để mở khóa học, tài liệu và nhận hỗ trợ khi cần.
                        </p>
                        <p style="margin:14px 0 0;color:#f6f1e7;font-size:14px;line-height:1.7;background:#2a2417;border:1px solid #514528;border-radius:10px;padding:12px">
                          <strong style="color:#d8b653">Lưu ý:</strong> Nếu chưa thấy email hướng dẫn sau vài phút, bạn kiểm tra thêm mục Spam, Quảng cáo/Promotions hoặc Khuyến mãi trong hộp thư.
                        </p>
      `;
  const bundleEbookActionsHtml = isFacebookEbookBundle
    ? `
                    <a href="${escapeHtml(facebookEbookReaderEmailUrl)}" style="display:block;margin-top:14px;background:#159cfb;color:#ffffff;text-decoration:none;border-radius:10px;padding:15px 20px;font-size:15px;font-weight:900">
                      Đọc Ebook Facebook Ads online
                    </a>
                    <a href="${escapeHtml(facebookEbookPdfEmailUrl)}" style="display:block;margin-top:14px;background:#ffffff;color:#161616;text-decoration:none;border-radius:10px;padding:15px 20px;font-size:15px;font-weight:900">
                      Tải Ebook Facebook Ads PDF
                    </a>
      `
    : "";
  const primaryActionsHtml = isFacebookEbook
    ? `
                    <a href="${escapeHtml(facebookEbookReaderEmailUrl)}" style="display:block;background:#d8b653;color:#111111;text-decoration:none;border-radius:10px;padding:17px 20px;font-size:15px;font-weight:900;letter-spacing:0.02em;text-transform:uppercase">
                      Đọc ebook online
                    </a>
                    <a href="${escapeHtml(facebookEbookPdfEmailUrl)}" style="display:block;margin-top:14px;background:#f66628;color:#111111;text-decoration:none;border-radius:10px;padding:15px 20px;font-size:15px;font-weight:900">
                      Tải file PDF
                    </a>
                    <p style="margin:20px 0 0;color:#8f887c;font-size:13px;line-height:1.7">
                      Link đọc online: <a href="${escapeHtml(facebookEbookReaderEmailUrl)}" style="color:#d8b653">${escapeHtml(facebookEbookReaderUrl)}</a><br />
                      Link tải PDF: <a href="${escapeHtml(facebookEbookPdfEmailUrl)}" style="color:#d8b653">${escapeHtml(facebookEbookPdfUrl)}</a>
                    </p>
      `
    : `
                    <a href="${escapeHtml(zaloEmailUrl)}" style="display:block;background:#d8b653;color:#111111;text-decoration:none;border-radius:10px;padding:17px 20px;font-size:15px;font-weight:900;letter-spacing:0.02em;text-transform:uppercase">
                      Tham gia Zalo nhận hướng dẫn
                    </a>
                    <a href="${escapeHtml(accessEmailUrl)}" style="display:block;margin-top:14px;background:#f66628;color:#111111;text-decoration:none;border-radius:10px;padding:15px 20px;font-size:15px;font-weight:900">
                      Truy cập khu vực học viên
                    </a>
                    ${agentGuideButton}
                    ${adsSupportAgentButton}
                    ${bundleEbookActionsHtml}
                    <p style="margin:20px 0 0;color:#8f887c;font-size:13px;line-height:1.7">
                      Link dashboard: <a href="${escapeHtml(dashboardEmailUrl)}" style="color:#d8b653">${escapeHtml(dashboardUrl)}</a>
                    </p>
      `;

  const html = isFacebookEbook
    ? `
    <div style="margin:0;padding:0;background:#080808;font-family:${emailFontFamily};color:#f6f1e7">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808;margin:0;padding:42px 14px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#171717;border:1px solid #303030;border-radius:18px;overflow:hidden">
              <tr>
                <td align="center" style="padding:42px 34px 36px;background:#101827;border-bottom:1px solid #253653">
                  <div style="width:76px;height:76px;border-radius:50%;background:#d8b653;color:#101010;font-size:42px;line-height:76px;font-weight:400;margin:0 auto 24px">
                    ✓
                  </div>
                  <h1 style="margin:0;color:#d8b653;font-size:26px;line-height:1.25;font-weight:800">
                    Đã mở quyền Ebook Facebook Ads 2026
                  </h1>
                  <p style="margin:16px 0 0;color:#e9e3d5;font-size:15px;line-height:1.7">
                    Anh/chị có thể đọc online và tải file PDF sau khi đồng ý điều khoản.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:34px">
                  <p style="margin:0 0 18px;color:#e9e3d5;font-size:16px;line-height:1.7">
                    Xin chào <strong style="color:#d8b653">${safeName}</strong>,
                  </p>
                  <p style="margin:0;color:#bdb7a9;font-size:15px;line-height:1.8">
                    ${isFacebookEbook ? ebookAccountIntro : accountIntro}
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
                          Anh/chị nhận được:
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
                          Cách truy cập ebook:
                        </p>
                        ${deliveryInstructionsHtml}
                      </td>
                    </tr>
                  </table>

                  <div style="padding-top:30px;text-align:center">
                    ${primaryActionsHtml}
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
  `
    : `
    <div style="margin:0;padding:0;background:#080808;font-family:${emailFontFamily};color:#f6f1e7">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808;margin:0;padding:42px 14px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#171717;border:1px solid #303030;border-radius:18px;overflow:hidden">
              <tr>
                <td align="center" style="padding:42px 34px 36px;background:#161616;border-bottom:1px solid #39352a">
                  <div style="width:76px;height:76px;border-radius:50%;background:#d8b653;color:#101010;font-size:42px;line-height:76px;font-weight:400;margin:0 auto 24px">
                    ✓
                  </div>
                  <h1 style="margin:0;color:#d8b653;font-size:26px;line-height:1.25;font-weight:800">
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
                    ${isFacebookEbook ? ebookAccountIntro : accountIntro}
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
                        <p style="margin:14px 0 0;color:#f6f1e7;font-size:14px;line-height:1.7;background:#2a2417;border:1px solid #514528;border-radius:10px;padding:12px">
                          <strong style="color:#d8b653">Lưu ý:</strong> Nếu chưa thấy email hướng dẫn sau vài phút, bạn kiểm tra thêm mục Spam, Quảng cáo/Promotions hoặc Khuyến mãi trong hộp thư.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <div style="padding-top:30px;text-align:center">
                    <a href="${escapeHtml(zaloEmailUrl)}" style="display:block;background:#d8b653;color:#111111;text-decoration:none;border-radius:10px;padding:17px 20px;font-size:15px;font-weight:900;letter-spacing:0.02em;text-transform:uppercase">
                      Tham gia Zalo nhận hướng dẫn
                    </a>
                    <a href="${escapeHtml(accessEmailUrl)}" style="display:block;margin-top:14px;background:#f66628;color:#111111;text-decoration:none;border-radius:10px;padding:15px 20px;font-size:15px;font-weight:900">
                      Truy cập khu vực học viên
                    </a>
                    ${agentGuideButton}
                    ${adsSupportAgentButton}
                    ${bundleEbookActionsHtml}
                    <p style="margin:20px 0 0;color:#8f887c;font-size:13px;line-height:1.7">
                      Link dashboard: <a href="${escapeHtml(dashboardEmailUrl)}" style="color:#d8b653">${escapeHtml(dashboardUrl)}</a>
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

  const text = isFacebookEbook
    ? [
        "Đã mở quyền Ebook Facebook Ads 2026 tại The Anh Marketing",
        `Chào ${order.studentName || "bạn"},`,
        `Mã đơn: ${order.orderCode}`,
        `Số tiền: ${order.amountLabel}`,
        `Sản phẩm: ${courseList.join(", ") || order.courseTitle}`,
        `Bạn nhận được: ${benefitItems.join("; ")}`,
        options.account?.temporaryPassword
          ? `Tài khoản học: ${options.account.email}\nMật khẩu tạm: ${options.account.temporaryPassword}\nSau khi đăng nhập lần đầu, hệ thống sẽ yêu cầu bạn đổi mật khẩu.`
          : "",
        `Đọc online: ${facebookEbookReaderUrl}`,
        `Tải PDF: ${facebookEbookPdfUrl}`,
        "Trước khi tải PDF, vui lòng đọc và đồng ý điều khoản trên trang tải.",
        `Dashboard: ${dashboardUrl}`,
      ]
        .filter(Boolean)
        .join("\n")
    : [
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
    `Link truy cập khu vực học viên: ${accessUrl}`,
    showAgentGuide ? `Hướng dẫn sử dụng AI Agent: ${agentGuideUrl}` : "",
    showAdsSupportAgent ? `${adsSupportAgentName}: ${adsSupportAgentUrl}` : "",
    isFacebookEbookBundle ? `Đọc Ebook online: ${facebookEbookReaderUrl}` : "",
    isFacebookEbookBundle ? `Tải Ebook PDF: ${facebookEbookPdfUrl}` : "",
    `Dashboard: ${dashboardUrl}`,
    "Nếu chưa thấy email hướng dẫn sau vài phút, vui lòng kiểm tra mục Spam, Quảng cáo/Promotions hoặc Khuyến mãi.",
  ].join("\n");

  return {
    from: getSender(options),
    to: order.email,
    subject: `${productTitle} - Thanh toán thành công - ${order.orderCode}`,
    html: withEmailDocument(html),
    text,
  };
}

export function buildPaymentFailedEmailPayload(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
): ResendEmailPayload {
  const siteUrl = normalizeSiteUrl(options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL);
  const paymentUrl = `${siteUrl}/thanh-toan/${encodeURIComponent(order.orderCode)}`;
  const paymentEmailUrl = buildEmailLink(paymentUrl, siteUrl);
  const productTitle = getProductTitle(order);
  const statusTitle = getPaymentFailedTitle(order);
  const safeName = escapeHtml(order.studentName || "bạn");
  const safeOrderCode = escapeHtml(order.orderCode);
  const safeAmount = escapeHtml(order.amountLabel);
  const safeProductTitle = escapeHtml(productTitle);
  const safePaymentUrl = escapeHtml(paymentEmailUrl);
  const safeRawPaymentUrl = escapeHtml(paymentUrl);

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
                      Trang thanh toán: <a href="${safePaymentUrl}" style="color:#f66628">${safeRawPaymentUrl}</a>
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
    html: withEmailDocument(html),
    text,
  };
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim().replace(/^\uFEFF/, "") ?? "";
}

export async function sendPaymentSuccessEmail(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
) {
  if (!options.force && !shouldSendPaymentSuccessEmail(order)) {
    return { ok: true, skipped: true, reason: "Order is not eligible for payment success email." };
  }

  const apiKey = getResendApiKey();

  if (!apiKey) {
    return { ok: true, skipped: true, reason: "Missing RESEND_API_KEY" };
  }

  try {
    const payload = isAgentKitPreorderDepositOrder(order)
      ? buildPreorderDepositEmailPayload(order, options)
      : buildPaymentSuccessEmailPayload(order, options);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, skipped: false, reason: errorText || response.statusText };
    }
    const result = typeof response.json === "function" ? await response.json().catch(() => null) as { id?: unknown } | null : null;
    return { ok: true, skipped: false, reason: null, resendEmailId: typeof result?.id === "string" ? result.id : null };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "Could not send payment success email.",
    };
  }

}

export async function sendPaymentFailedEmail(
  order: PaymentOrder,
  options: PaymentEmailOptions = {},
) {
  if (!options.force && !shouldSendPaymentFailedEmail(order)) {
    return { ok: true, skipped: true, reason: "Order is not eligible for payment failed email." };
  }

  const apiKey = getResendApiKey();

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
