import type { PaymentOrder } from "@/services/orderService";
import { buildEmailLink } from "@/lib/notifications/email-link-bridge";
import { bot247GuideUrl } from "@/lib/bot247/video-access";
import {
  AGENT_KIT_SLUG,
  AGENT_KIT_PREORDER_DEPOSIT_VND,
  AGENT_KIT_PREORDER_PRICE_VND,
  AGENT_KIT_PREORDER_REMAINING_VND,
  isAgentKitPreorderDepositOrder,
} from "@/lib/agent-kit-preorder";

type PaymentEmailOptions = {
  from?: string;
  siteUrl?: string;
  // Khóa ký link video hướng dẫn Bot 24/7 (mặc định secret BOT247_VIDEO_LINK_SECRET của Worker)
  bot247VideoSecret?: string;
  // Mã kích hoạt Bot 24/7 đã cấp cho đơn (lib/bot247/license-gateway.ts); thiếu thì email báo sẽ gửi riêng
  bot247ActivationCode?: string | null;
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

export function buildPreorderDepositEmailPayload(order: PaymentOrder, options: PaymentEmailOptions = {}): ResendEmailPayload {
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
  // Bot 24/7 (phần mềm): email riêng với link bộ cài + hướng dẫn, không có khóa học / tài khoản học viên
  if (isBot247Order(order)) {
    return buildBot247PaymentSuccessEmail(order, { from: getSender(options), siteUrl, videoSecret: options.bot247VideoSecret ?? process.env.BOT247_VIDEO_LINK_SECRET, activationCode: options.bot247ActivationCode });
  }
  const isAgentKit = !isAgentKitPreorderDepositOrder(order) && (
    order.courseSlug.split(",").some((slug) => slug.trim() === AGENT_KIT_SLUG)
    || order.orderItems.some((item) => item.slug === AGENT_KIT_SLUG)
  );
  const accessUrl = isAgentKit
    ? `${siteUrl}/learn/${AGENT_KIT_SLUG}/agents`
    : `${siteUrl}/vao-khoa-hoc`;
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
  const benefitItems = isAgentKit
    ? ["Quyền truy cập thư viện Agent Kit", "Tải toàn bộ bộ kit hoặc từng Agent theo nhu cầu", "Video hướng dẫn cài đặt và sử dụng", "Prompt thiết lập Codex trong thư viện"]
    : getBenefitItems(order);
  const showAgentGuide = !isAgentKit && shouldShowAgentGuide(benefitItems);
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
    : isAgentKit
      ? `Hệ thống đã ghi nhận thanh toán Bộ Agent Kit. Bạn dùng email <strong style="color:#ffffff">${safeEmail}</strong> và mật khẩu hiện tại để mở thư viện bên dưới.`
    : `Hệ thống đã ghi nhận thanh toán của bạn. Vui lòng dùng đúng email
                    <strong style="color:#ffffff">${safeEmail}</strong> để đăng nhập hoặc tạo tài khoản học.`;

  const ebookAccountIntro = options.account?.temporaryPassword
    ? `Hệ thống đã ghi nhận thanh toán và tạo tài khoản đọc ebook cho anh/chị bằng email
                    <strong style="color:#ffffff">${safeEmail}</strong>.`
    : `Hệ thống đã ghi nhận thanh toán của anh/chị. Vui lòng dùng đúng email
                    <strong style="color:#ffffff">${safeEmail}</strong> để đăng nhập và đọc ebook.`;

  const agentKitLoginInstruction = options.account?.temporaryPassword
    ? "Nếu được yêu cầu đăng nhập, dùng tài khoản và mật khẩu tạm trong email này; sau đó đổi mật khẩu theo hướng dẫn."
    : `Nếu được yêu cầu đăng nhập, dùng email ${order.email} và mật khẩu hiện tại.`;
  const deliveryInstructionsHtml = isAgentKit
    ? `<p style="color:#e9e3d5;font-size:14px;line-height:1.7"><strong>Bước 1:</strong> Bấm “Mở thư viện Agent Kit” bên dưới.</p>
       <p style="color:#e9e3d5;font-size:14px;line-height:1.7"><strong>Bước 2:</strong> ${escapeHtml(agentKitLoginInstruction)} Sau khi đăng nhập, mở lại link thư viện bên dưới nếu cần.</p>
       <p style="color:#e9e3d5;font-size:14px;line-height:1.7"><strong>Bước 3:</strong> Chọn “Thư viện Agent” để tải toàn bộ bộ kit hoặc từng Agent; chọn “Video hướng dẫn” để xem cách cài đặt và sử dụng.</p>`
    : isFacebookEbook
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
  const primaryActionsHtml = isAgentKit
    ? `<a href="${escapeHtml(accessEmailUrl)}" style="display:block;background:#d8b653;color:#111111;text-decoration:none;border-radius:10px;padding:17px 20px;font-size:15px;font-weight:900">Mở thư viện Agent Kit</a>
       <p style="margin:20px 0;color:#bdb7a9;font-size:13px;line-height:1.7">Link truy cập trực tiếp: <a href="${escapeHtml(accessEmailUrl)}" style="color:#d8b653;word-break:break-all">${escapeHtml(accessUrl)}</a><br />Nếu nút không mở được, sao chép đường dẫn trên và mở bằng Chrome.</p>
       <a href="${escapeHtml(zaloEmailUrl)}" style="display:block;color:#d8b653;font-size:14px">Tham gia nhóm Zalo để nhận hỗ trợ</a>`
    : isFacebookEbook
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
    isAgentKit ? agentKitLoginInstruction : `Vui lòng dùng đúng email ${order.email} để đăng nhập/tạo tài khoản và mở khóa học.`,
    `Nhóm Zalo: ${zaloGroupUrl}`,
    `${isAgentKit ? "Mở thư viện Agent Kit" : "Link truy cập khu vực học viên"}: ${accessUrl}`,
    isAgentKit ? "Chọn Thư viện Agent để tải toàn bộ bộ kit hoặc từng Agent; chọn Video hướng dẫn để xem cách cài đặt và sử dụng. Nếu nút không mở được, sao chép link thư viện và mở bằng Chrome." : "",
    showAgentGuide ? `Hướng dẫn sử dụng AI Agent: ${agentGuideUrl}` : "",
    showAdsSupportAgent ? `${adsSupportAgentName}: ${adsSupportAgentUrl}` : "",
    isFacebookEbookBundle ? `Đọc Ebook online: ${facebookEbookReaderUrl}` : "",
    isFacebookEbookBundle ? `Tải Ebook PDF: ${facebookEbookPdfUrl}` : "",
    isAgentKit ? "" : `Dashboard: ${dashboardUrl}`,
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
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
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

// Admin CRM › Bot 24/7 › Gửi mã cho khách (anh xem trước rồi mới bấm gửi).
export async function sendBot247LicenseEmail(input: Parameters<typeof buildBot247LicenseEmail>[0], options: PaymentEmailOptions = {}) {
  const apiKey = getResendApiKey();
  if (!apiKey) return { ok: false, reason: "Missing RESEND_API_KEY" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}) },
      body: JSON.stringify(buildBot247LicenseEmail(input, options)),
    });
    if (!response.ok) return { ok: false, reason: (await response.text()) || response.statusText };
    const result = await response.json().catch(() => null) as { id?: unknown } | null;
    return { ok: true, reason: null, resendEmailId: typeof result?.id === "string" ? result.id : null };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Could not send Bot 24/7 license email." };
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
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
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

/* ---------- Bot 24/7 (phần mềm, slug "bot-24-7" trong data/marketing-courses.ts) ---------- */
const BOT247_SLUG = "bot-24-7";

// Bot 24/7 là phần mềm cài trên máy khách (không phải khóa học): sau khi thanh toán, khách nhận link bộ cài + hướng dẫn;
// mã kích hoạt do Thế Anh Marketing cấp từ trang quản trị Bot 24/7 (connect-gateway/admin) và gửi riêng.
const BOT247_INSTALLERS = {
  macArm: "https://drive.google.com/file/d/1JvTaFJMhzYtI7LQVews2pyou2z6JYQ3R/view?usp=sharing",
  macIntel: "https://drive.google.com/file/d/1s6AJX7BlOZyXWWbovE9EWYn-q8UonTCD/view?usp=sharing",
  windows: "https://drive.google.com/file/d/1IFfRumCpDbD7Bu4Ovn0A0Rf4Ibdlg7kP/view?usp=sharing",
};
const supportUrl = "https://www.theanhmarketing.com/lien-he";   // trang liên hệ chung (nhóm Zalo hiện có là của học viên Facebook Ads)

export function isBot247Order(order: Pick<PaymentOrder, "courseSlug" | "orderItems">) {
  return order.courseSlug === BOT247_SLUG || (order.orderItems || []).some((item) => item.slug === BOT247_SLUG);
}

const escBot = (value: string) =>
  String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

type Bot247EmailInput = { from: string; siteUrl: string; videoSecret?: string; activationCode?: string | null; mode?: "paid" | "license" };

// Admin CRM › Bot 24/7 › Gửi mã: cùng mẫu email, không có dòng "đã thanh toán" khi mã cấp tay không gắn đơn.
// Link video dùng mã đơn nếu có, không thì dùng chính mã kích hoạt làm khóa của link.
export function buildBot247LicenseEmail(input: { name: string; email: string; activationCode: string; orderCode?: string | null }, options: PaymentEmailOptions = {}) {
  const order = { orderCode: input.orderCode || input.activationCode, studentName: input.name, email: input.email, amountLabel: "", courseSlug: BOT247_SLUG, orderItems: [] } as unknown as PaymentOrder;
  return buildBot247PaymentSuccessEmail(order, { from: getSender(options), siteUrl: normalizeSiteUrl(options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL), videoSecret: options.bot247VideoSecret ?? process.env.BOT247_VIDEO_LINK_SECRET, activationCode: input.activationCode, mode: input.orderCode ? "paid" : "license" });
}

function buildBot247PaymentSuccessEmail(order: PaymentOrder, { from, siteUrl, videoSecret, activationCode, mode = "paid" }: Bot247EmailInput) {
  const site = String(siteUrl || "https://www.theanhmarketing.com").replace(/\/$/, "");
  // Link bộ video hướng dẫn riêng của đơn này (thiếu khóa ký thì bỏ mục video, email vẫn gửi)
  const videoUrl = bot247GuideUrl(site, videoSecret, order.orderCode);
  const guideUrl = `${site}/bot-24-7/tai-ve`;
  const termsUrl = `${site}/bot-24-7/dieu-khoan`;
  const name = escBot(order.studentName || "bạn");
  const code = escBot(order.orderCode);
  const amount = escBot(order.amountLabel);
  const font = `'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`;
  const btn = (href: string, label: string, dark = false) =>
    `<a href="${escBot(href)}" style="display:block;margin-top:10px;background:${dark ? "#111111" : "#ffffff"};color:${dark ? "#ffffff" : "#111111"};border:1.5px solid #111111;text-decoration:none;border-radius:10px;padding:13px 18px;font-size:15px;font-weight:700;text-align:center">${label}</a>`;
  const step = (n: number, title: string, body: string) =>
    `<tr><td style="padding:10px 0;vertical-align:top;width:34px"><div style="width:26px;height:26px;border-radius:13px;background:#111;color:#fff;font-size:13px;font-weight:800;text-align:center;line-height:26px">${n}</div></td><td style="padding:10px 0;font-size:14.5px;line-height:1.6;color:#222"><b>${title}</b><br/>${body}</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="UTF-8" /></head><body style="margin:0;padding:0;background:#f4f4f2">
<div style="max-width:560px;margin:0 auto;padding:28px 16px;font-family:${font};color:#111">
  <div style="background:#ffffff;border-radius:18px;padding:28px 26px;border:1px solid #e6e6e2">
    <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#777;font-weight:700">Bot 24/7 · Thế Anh Marketing</div>
    <h1 style="font-size:24px;margin:10px 0 6px">${mode === "license" ? `Chào ${name}, đây là mã kích hoạt Bot 24/7 của bạn` : `Cảm ơn ${name}, đơn đã thanh toán thành công`}</h1>
    <p style="font-size:14.5px;line-height:1.6;color:#444;margin:0">${mode === "license" ? "" : `Mã đơn <b>${code}</b>${amount ? ` · ${amount}` : ""}. `}Dưới đây là bộ cài và cách cài Bot 24/7.</p>

    ${activationCode ? `<div style="margin-top:20px;padding:18px;border-radius:14px;background:#111;color:#fff;text-align:center">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#bbb;font-weight:700">Mã kích hoạt</div>
      <div style="font-size:24px;font-weight:800;letter-spacing:2px;margin-top:6px;font-family:Menlo,Consolas,monospace">${escBot(activationCode)}</div>
      <div style="font-size:13px;color:#bbb;margin-top:6px">Dán mã này ở bước đầu tiên khi Bot mở lần đầu. Mỗi mã cài được tối đa 5 lần.</div>
    </div>` : `<div style="margin-top:20px;padding:16px 18px;border-radius:14px;background:#f7f7f5;border:1px solid #e6e6e2;font-size:14.5px;line-height:1.6">
      <b>Mã kích hoạt</b> (dạng B247-XXXX-XXXX-XXXX) sẽ được Thế Anh Marketing gửi riêng qua email này hoặc Zalo. Bạn cứ cài trước, khi có mã thì nhập ở bước đầu tiên.
    </div>`}

    <h2 style="font-size:17px;margin:24px 0 4px">1. Tải bộ cài</h2>
    <p style="font-size:13.5px;color:#666;margin:0">Mac: bấm biểu tượng Apple › Giới thiệu về máy Mac, xem dòng "Chip". Mở link › Tải xuống › Vẫn tải xuống.</p>
    ${btn(BOT247_INSTALLERS.windows, "Windows 10/11 · Bot247-Setup.exe", true)}
    ${btn(BOT247_INSTALLERS.macArm, "Mac chip Apple (M1–M4)")}
    ${btn(BOT247_INSTALLERS.macIntel, "Mac chip Intel")}
    <p style="font-size:13.5px;color:#666;margin:10px 0 0">Hướng dẫn chi tiết có ảnh và lỗi thường gặp: <a href="${escBot(guideUrl)}" style="color:#111;font-weight:700">trang Tải về Bot 24/7</a>.</p>

    <h2 style="font-size:17px;margin:26px 0 4px">2. Cài đặt (khoảng 1 phút)</h2>
    <table style="width:100%;border-collapse:collapse">
      ${step(1, "Windows", "Bấm đúp <b>Bot247-Setup.exe</b> › Cài đặt › Hoàn tất. Nếu Windows báo chặn: More info › Run anyway.")}
      ${step(2, "Mac", "Bấm đúp tệp <b>.pkg</b> › Cài đặt › nhập mật khẩu máy. Nếu máy báo chưa xác minh: chuột phải › Mở.")}
      ${step(3, "Bot tự mở", "Bot tải tiếp bộ não AI ở nền (5–30 phút lần đầu), có thanh tiến trình ở góc màn hình.")}
      ${step(4, "Kích hoạt & đăng nhập AI", "Dán mã kích hoạt › Kích hoạt. Đăng nhập Claude (gói Pro/Max) hoặc ChatGPT (gói Plus/Pro) › Xong. Rồi vào mục Bắt đầu.")}
    </table>

    ${videoUrl ? `<h2 style="font-size:17px;margin:22px 0 4px">3. Xem video hướng dẫn</h2>
    <p style="font-size:14.5px;line-height:1.6;color:#444;margin:0">Bộ video ngắn, có phụ đề: bắt đầu, kết nối kênh, giao việc, chăm khách, lịch đăng, làm video, làm website. Link này là của riêng bạn, vui lòng không chia sẻ.</p>
    ${btn(videoUrl, "Xem bộ video hướng dẫn", true)}` : ""}

    <h2 style="font-size:17px;margin:22px 0 4px">Cần hỗ trợ cài đặt?</h2>
    <p style="font-size:14.5px;line-height:1.6;color:#444;margin:0">Nhắn nhóm hỗ trợ, gửi kèm mã đơn <b>${code}</b>.</p>
    ${btn(supportUrl, "Liên hệ hỗ trợ")}
  </div>
  <p style="font-size:12px;color:#888;text-align:center;margin-top:14px">Dữ liệu và tri thức của bạn nằm trên máy của bạn. Bot dùng gói Claude/ChatGPT bạn tự đăng ký. <a href="${escBot(termsUrl)}" style="color:#888">Điều khoản dịch vụ</a></p>
</div></body></html>`;

  const text = [
    mode === "license" ? `Chào ${order.studentName || "bạn"}, đây là mã kích hoạt Bot 24/7 của bạn.` : `Cảm ơn ${order.studentName || "bạn"}, đơn ${order.orderCode}${order.amountLabel ? ` (${order.amountLabel})` : ""} đã thanh toán thành công.`,
    "",
    activationCode ? `Mã kích hoạt: ${activationCode} (dán ở bước đầu tiên khi Bot mở lần đầu, cài tối đa 5 lần).` : "Mã kích hoạt Bot 24/7 sẽ được Thế Anh Marketing gửi riêng qua email hoặc Zalo.",
    "",
    "Tải bộ cài:",
    `- Windows 10/11: ${BOT247_INSTALLERS.windows}`,
    `- Mac chip Apple: ${BOT247_INSTALLERS.macArm}`,
    `- Mac chip Intel: ${BOT247_INSTALLERS.macIntel}`,
    "",
    "Windows: bấm đúp Bot247-Setup.exe › Cài đặt › Hoàn tất. Mac: bấm đúp tệp .pkg › Cài đặt.",
    "Bot tự mở và tải tiếp bộ não AI ở nền. Dán mã kích hoạt, đăng nhập Claude hoặc ChatGPT, rồi vào mục Bắt đầu.",
    "",
    `Hướng dẫn chi tiết: ${guideUrl}`,
    ...(videoUrl ? [`Video hướng dẫn (link riêng của bạn, không chia sẻ): ${videoUrl}`] : []),
    `Hỗ trợ: ${supportUrl}`,
    `Điều khoản dịch vụ: ${termsUrl}`,
  ].join("\n");

  const subject = mode === "license" ? "Bot 24/7 · Mã kích hoạt, bộ cài và video hướng dẫn" : `Bot 24/7 · Đã thanh toán đơn ${order.orderCode} · ${activationCode ? "Mã kích hoạt và bộ cài" : "Bộ cài và hướng dẫn"}`;
  return { from, to: order.email, subject, html, text };
}
