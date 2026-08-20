import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { after } from "next/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BankAppHandoff } from "@/components/payment/bank-app-handoff";
import { PaymentOfferCountdown } from "@/components/payment/payment-offer-countdown";
import { PaymentStatusPoller } from "@/components/payment/payment-status-poller";
import { TransferDetails } from "@/components/payment/transfer-details";
import { ZaloSupportProof } from "@/components/payment/zalo-support-proof";
import { loadVietQrBankApps } from "@/lib/payments/bank-app-handoff";
import {
  createSepayQrUrl,
  formatVnd,
  getBankDisplayName,
  getSepayConfig,
  isSepayConfigured,
} from "@/lib/payments/sepay";
import { normalizeAttribution } from "@/lib/tracking/attribution";
import { emptyInvoiceDetails } from "@/lib/orders/invoice";
import {
  SUPPORT_PRICE_VND,
  SUPPORT_PRICE_LABEL,
  SUPPORT_PRODUCT_SLUG,
  SUPPORT_PRODUCT_TITLE,
} from "@/lib/support-booking/constants";
import { CONSULTATION_POLICY, isConsultationOrder } from "@/lib/consultation/constants";
import { sendCheckoutEntryNotifications } from "@/services/checkoutNotificationService";
import { getPaymentOrder, type PaymentOrder } from "@/services/orderService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thanh toán | The Anh Marketing",
  robots: {
    index: false,
    follow: false,
  },
};

const agentKitSlug = "bo-agent-kit-x10-hieu-suat-cong-viec";

const agentKitIncludes = [
  "6 AI Agent theo vai trò: Growth, Insight, Content, Ads, CRM, Delivery",
  "12 command gọi việc để không phải viết prompt từ đầu",
  "10+ workflow cho research, content, ads, CRM, checklist và báo cáo",
  "Template brief, KPI, CRM field map, content calendar và offer checklist",
  "Folder context để copy dữ liệu doanh nghiệp vào cho agent đọc",
  "Hướng dẫn triển khai theo từng bước cho chủ doanh nghiệp nhỏ",
];

const agentKitSaleReasons = [
  ["Giữ đúng giá 990.000đ", "Đơn này đang khóa số tiền và nội dung chuyển khoản riêng để hệ thống xác nhận tự động."],
  ["Không phải tự setup lại từ đầu", "Nhận sẵn agent, command, workflow, template và folder context để bắt đầu giao việc cho AI."],
  ["Mua xong biết bước tiếp theo", "Trang sau thanh toán và email hướng dẫn giúp bạn biết copy dữ liệu vào đâu, gọi command nào trước."],
];

const aiMasterIncludes = [
  "Roadmap đóng gói offer và sản phẩm tri thức",
  "Content, landing, thanh toán và CRM mini",
  "6 Agent và SOP mẫu để triển khai hệ thống bán thử",
];

const defaultSaleReasons = [
  ["Giữ đúng đơn hiện tại", "Mã đơn và nội dung chuyển khoản được tạo riêng cho giao dịch này."],
  ["Tự động xác nhận giao dịch", "Khi tiền vào đúng nội dung, hệ thống tự đổi trạng thái mà không cần gửi bill thủ công."],
  ["Nhận hướng dẫn qua email", "Sau khi thanh toán, hệ thống gửi email hướng dẫn theo thông tin bạn đã đăng ký."],
];

function getDisplayCourseTitle(order: PaymentOrder) {
  const title = order.orderItems.length === 1 ? order.orderItems[0].title : order.courseTitle;
  return (title || "Khóa học The Anh Marketing").split(" - ")[0].trim();
}

function isAiMasterX10(order: PaymentOrder) {
  const haystack = `${order.courseSlug} ${order.courseTitle} ${order.orderItems
    .map((item) => item.title)
    .join(" ")}`.toLowerCase();
  return haystack.includes("ai-master-x10");
}

function isAgentKit(order: PaymentOrder) {
  const slugHaystack = `${order.courseSlug} ${order.orderItems
    .map((item) => item.slug)
    .join(" ")}`.toLowerCase();
  return slugHaystack.includes(agentKitSlug);
}

function isFacebookAds2026(order: PaymentOrder) {
  const slugHaystack = `${order.courseSlug} ${order.orderItems
    .map((item) => item.slug)
    .join(" ")}`.toLowerCase();
  return slugHaystack.includes("facebook-ads-2026");
}

function isFacebookAdsEbook2026(order: PaymentOrder) {
  const slugHaystack = `${order.courseSlug} ${order.orderItems
    .map((item) => item.slug)
    .join(" ")}`.toLowerCase();
  return slugHaystack.includes("ebook-facebook-ads-2026");
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
    hasExactCourseSlug(order, "ebook-facebook-ads-2026")
  );
}

function getPaymentOffer(order: PaymentOrder, amountLabel: string) {
  if (isFacebookAdsEbookBundle(order)) {
    return {
      originalPriceLabel: "3.389.000đ",
      currentPriceLabel: "1.098.000đ",
    };
  }

  if (isFacebookAdsEbook2026(order)) {
    return {
      originalPriceLabel: "799.000đ",
      currentPriceLabel: "399.000đ",
    };
  }

  if (!isFacebookAds2026(order)) {
    return {
      originalPriceLabel: undefined,
      currentPriceLabel: amountLabel,
    };
  }

  if (order.amount === 799000) {
    return {
      originalPriceLabel: "2.590.000đ",
      currentPriceLabel: "799.000đ",
    };
  }

  if (order.amount === 1299000) {
    return {
      originalPriceLabel: undefined,
      currentPriceLabel: "1.299.000đ",
    };
  }

  if (order.amount === 399000) {
    return {
      originalPriceLabel: "2.290.000đ",
      currentPriceLabel: "399.000đ",
    };
  }

  return {
    originalPriceLabel: undefined,
    currentPriceLabel: amountLabel,
  };
}

function getFacebookAdsConversionMessage(order: PaymentOrder) {
  if (isFacebookAdsEbookBundle(order)) {
    return {
      title: "Thanh toán để vào khóa học và đọc Ebook ngay",
      description: "Hệ thống gửi tài khoản học tập và Ebook tự động sau 5 giây thanh toán.",
      proof: "Hơn 1.000 anh/chị học viên đang học và bạn nhận cả tài khoản học tập và Ebook.",
    };
  }

  if (isFacebookAdsEbook2026(order)) {
    return {
      title: "Thanh toán để đọc Ebook ngay",
      description: "Hệ thống gửi Ebook tự động sau 5 giây thanh toán.",
      proof: "Hơn 400 Ebook đã bán trong tháng này.",
    };
  }

  return {
    title: "Thanh toán để vào khóa học ngay",
    description: "Hệ thống gửi tài khoản học tập ngay sau 5 giây thanh toán.",
    proof: "Hơn 1.000 anh/chị học viên đang học.",
  };
}

function getLocalDemoPaymentOrder(code: string): PaymentOrder | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const normalizedCode = code.toUpperCase();

  if (normalizedCode === "SUPPORTDEMO") {
    return {
      id: "local-support-demo",
      leadId: null,
      orderCode: "SUPPORTDEMO",
      studentName: "Nguyễn Minh Anh",
      email: "minhanh.demo@gmail.com",
      phone: "0900000000",
      courseSlug: SUPPORT_PRODUCT_SLUG,
      courseTitle: SUPPORT_PRODUCT_TITLE,
      amount: SUPPORT_PRICE_VND,
      amountLabel: SUPPORT_PRICE_LABEL,
      currency: "VND",
      status: "pending",
      paymentMethod: "sepay",
      paymentQrUrl: "",
      paidAt: null,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      sepayReferenceCode: null,
      orderItems: [{ slug: SUPPORT_PRODUCT_SLUG, title: SUPPORT_PRODUCT_TITLE, price: SUPPORT_PRICE_VND }],
      paymentEmailSentAt: null,
      paymentEmailLastError: null,
      accountingEmailSentAt: null,
      accountingEmailLastError: null,
      purchaseEventSent: false,
      attribution: normalizeAttribution(),
      invoice: emptyInvoiceDetails,
    };
  }

  if (normalizedCode === "AGENTKITDEMO") {
    return {
      id: "local-agent-kit-demo",
      leadId: null,
      orderCode: "AGENTKITDEMO",
      studentName: "Khách đăng ký demo",
      email: "demo@gmail.com",
      phone: "0900000000",
      courseSlug: agentKitSlug,
      courseTitle: "Bộ Agent Kit X10 hiệu suất công việc",
      amount: 990000,
      amountLabel: "990.000đ",
      currency: "VND",
      status: "pending",
      paymentMethod: "sepay",
      paymentQrUrl: "",
      paidAt: null,
      expiresAt: null,
      createdAt: new Date().toISOString(),
      sepayReferenceCode: null,
      orderItems: [
        {
          slug: agentKitSlug,
          title: "Bộ Agent Kit X10 hiệu suất công việc",
          price: 990000,
        },
      ],
      paymentEmailSentAt: null,
      paymentEmailLastError: null,
      accountingEmailSentAt: null,
      accountingEmailLastError: null,
      purchaseEventSent: false,
      attribution: normalizeAttribution(),
      invoice: emptyInvoiceDetails,
    };
  }

  if (normalizedCode === "AIMASTERX10DEMO") {
    return {
      id: "local-ai-master-x10-demo",
      leadId: null,
      orderCode: "AIMASTERX10DEMO",
      studentName: "Khách đăng ký demo",
      email: "demo@gmail.com",
      phone: "0900000000",
      courseSlug: "ai-master-x10-hieu-suat",
      courseTitle: "AI Master X10 hiệu suất - Biến tri thức thành tiền",
      amount: 990000,
      amountLabel: "990.000đ",
      currency: "VND",
      status: "pending",
      paymentMethod: "sepay",
      paymentQrUrl: "",
      paidAt: null,
      expiresAt: null,
      createdAt: new Date().toISOString(),
      sepayReferenceCode: null,
      orderItems: [
        {
          slug: "ai-master-x10-hieu-suat",
          title: "AI Master X10 hiệu suất - Biến tri thức thành tiền",
          price: 990000,
        },
      ],
      paymentEmailSentAt: null,
      paymentEmailLastError: null,
      accountingEmailSentAt: null,
      accountingEmailLastError: null,
      purchaseEventSent: false,
      attribution: normalizeAttribution(),
      invoice: emptyInvoiceDetails,
    };
  }

  return null;
}

function getCheckoutContent(order: PaymentOrder) {
  if (isConsultationOrder(order)) {
    return {
      eyebrow: "Phí giữ yêu cầu tư vấn",
      title: "Hoàn tất thanh toán phí tư vấn Marketing & AI",
      description: "Sau khi thanh toán thành công, The Anh sẽ chủ động liên hệ để sắp xếp buổi tư vấn.",
      productLabel: "Tư vấn Marketing & AI",
      productHref: "/dich-vu",
      includes: ["The Anh xem trước nhu cầu đã gửi", "Chủ động liên hệ để sắp xếp thời gian", CONSULTATION_POLICY],
      saleReasons: defaultSaleReasons,
      nextSteps: ["Hệ thống xác nhận thanh toán", "Nhận email xác nhận", "The Anh chủ động liên hệ để sắp xếp buổi tư vấn"],
      stickyCopy: "Thanh toán phí tư vấn",
    };
  }

  if (isAgentKit(order)) {
    return {
      eyebrow: "Bước cuối để nhận bộ kit",
      title: "Bộ Kit AI Agent Business",
      description:
        "Quét QR hoặc chuyển khoản đúng nội dung. Khi giao dịch được xác nhận, hệ thống sẽ mở quyền truy cập và gửi hướng dẫn theo email bạn đã đăng ký.",
      productLabel: "AI Agent Business",
      productHref: "/academy/bo-kit-agent-doanh-nghiep",
      includes: agentKitIncludes,
      saleReasons: agentKitSaleReasons,
      nextSteps: [
        "Nhận hướng dẫn truy cập bộ AI Growth Kit",
        "Copy dữ liệu doanh nghiệp vào folder context",
        "Chọn command phù hợp để bắt đầu giao việc cho AI Agent",
      ],
      stickyCopy: "Nhận bộ kit AI Agent",
    };
  }

  if (isFacebookAds2026(order)) {
    if (isFacebookAdsEbook2026(order) && !isFacebookAdsEbookBundle(order)) {
      return {
        eyebrow: "Bước cuối để mở khóa thư viện",
        title: "Thư viện kiến thức Facebook Ads 2026",
        description:
          "Kiểm tra đúng số tiền và nội dung chuyển khoản. Khi giao dịch được xác nhận, hệ thống sẽ gửi email hướng dẫn truy cập thư viện và tài nguyên thực hành đi kèm.",
        productLabel: "Thư viện Facebook Ads 2026",
        productHref: "/academy/ebook-facebook-ads-2026",
        includes: [
          "Truy cập website thư viện Facebook Ads 2026",
          "Bản đồ 10 phần nội dung từ nền tảng đến vận hành thực tế",
          "Tài nguyên thực hành, checklist và template đi kèm",
        ],
        saleReasons: defaultSaleReasons,
        nextSteps: [
          "Nhận email xác nhận thanh toán",
          "Kiểm tra mục Spam hoặc Promotions/Khuyến mãi nếu chưa thấy email sau vài phút",
          "Đăng nhập vào dashboard học viên",
          "Mở thư viện Facebook Ads 2026 và tra cứu theo nhu cầu",
        ],
        stickyCopy: "Mở khóa thư viện Facebook Ads",
      };
    }

    return {
      eyebrow: "Bước cuối để hoàn tất đăng ký",
      title: "Quảng cáo Facebook Master 2026",
      description:
        "Kiểm tra đúng số tiền và nội dung chuyển khoản. Khi giao dịch được xác nhận, hệ thống sẽ gửi email hướng dẫn truy cập khóa học. Nếu chưa thấy email, hãy kiểm tra mục Spam hoặc Promotions/Khuyến mãi.",
      productLabel: "Facebook Ads Master 2026",
      productHref: "/academy/facebook-ads-master-2026",
      includes:
        order.orderItems.length > 0
          ? order.orderItems.map((item) => item.title)
          : ["Quảng cáo Facebook Master 2026", "Email hướng dẫn sau thanh toán", "Hỗ trợ kiểm tra nếu giao dịch chưa được xác nhận"],
      saleReasons: defaultSaleReasons,
      nextSteps: [
        "Nhận email xác nhận thanh toán",
        "Kiểm tra mục Spam hoặc Promotions/Khuyến mãi nếu chưa thấy email sau vài phút",
        "Đăng nhập vào dashboard học viên",
        "Bắt đầu học theo lộ trình Facebook Ads 2026",
      ],
      stickyCopy: "Hoàn tất đăng ký Facebook Ads",
    };
  }

  if (isAiMasterX10(order)) {
    return {
      eyebrow: "Bước cuối để mở khóa khóa học",
      title: "Hoàn tất thanh toán để nhận quyền truy cập AI Master X10.",
      description:
        "Kiểm tra đúng số tiền và nội dung chuyển khoản. Khi giao dịch được xác nhận, hệ thống sẽ gửi email hướng dẫn truy cập.",
      productLabel: "AI Master X10",
      productHref: "/academy/ai-master-x10-hieu-suat",
      includes: aiMasterIncludes,
      saleReasons: defaultSaleReasons,
      nextSteps: [
        "Nhận email xác nhận thanh toán",
        "Đăng nhập vào dashboard học viên",
        "Bắt đầu theo roadmap triển khai đầu tiên",
      ],
      stickyCopy: "Mở khóa khóa học",
    };
  }

  return {
    eyebrow: "Bước cuối để hoàn tất đăng ký",
    title: `Thanh toán để nhận quyền truy cập ${getDisplayCourseTitle(order)}.`,
    description:
      "Kiểm tra đúng khóa học, số tiền và nội dung chuyển khoản. Hệ thống sẽ tự xác nhận sau khi giao dịch thành công.",
    productLabel: "The Anh Marketing",
    productHref: "/khoa-hoc",
    includes:
      order.orderItems.length > 0
        ? order.orderItems.map((item) => item.title)
        : ["Quyền truy cập sản phẩm đã đăng ký", "Email hướng dẫn sau thanh toán", "Hỗ trợ kiểm tra nếu giao dịch chưa được xác nhận"],
    saleReasons: defaultSaleReasons,
    nextSteps: ["Hệ thống xác nhận giao dịch", "Hệ thống gửi email hướng dẫn", "Bạn bắt đầu học hoặc dùng sản phẩm đã mua"],
    stickyCopy: "Hoàn tất thanh toán",
  };
}

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const resolvedSearchParams = await searchParams;
  const openBank = resolvedSearchParams.openBank === "1";
  const order = (await getPaymentOrder(code)) ?? getLocalDemoPaymentOrder(code);

  if (!order) {
    notFound();
  }

  const isLocalDemoOrder = order.id.startsWith("local-");
  const sepay = getSepayConfig();
  const configured = isLocalDemoOrder || isSepayConfigured();
  const transferContent = (order.sepayReferenceCode || order.orderCode).toUpperCase();
  const bankName = getBankDisplayName(sepay.bankCode);
  const qrUrl = isLocalDemoOrder
    ? "/huong-dan/demo-payment-qr.svg"
    : configured
      ? createSepayQrUrl({ amount: order.amount, orderCode: transferContent })
      : "";
  const amountLabel = order.amountLabel || formatVnd(order.amount);
  const requestHeaders = await headers();
  const bankApps = openBank
    ? await loadVietQrBankApps({ userAgent: requestHeaders.get("user-agent") ?? "" })
    : [];
  const paymentReturnUrl = `https://www.theanhmarketing.com/thanh-toan/${encodeURIComponent(order.orderCode)}`;
  const courseTitle = getDisplayCourseTitle(order);
  const content = getCheckoutContent(order);
  const paymentOffer = getPaymentOffer(order, amountLabel);
  const isFacebookAdsConversionCheckout = isFacebookAds2026(order);
  const conversionMessage = isFacebookAdsConversionCheckout ? getFacebookAdsConversionMessage(order) : null;
  if (!isLocalDemoOrder) {
    after(async () => {
      const notifications = await sendCheckoutEntryNotifications(order);

      if (!notifications.ok) {
        console.warn("[checkout] Entry notifications failed:", {
          orderCode: order.orderCode,
          email: notifications.email.reason,
          telegram: notifications.telegram.reason,
        });
      }
    });
  }
  const createdTimestamp = Date.parse(order.createdAt);
  const fallbackDeadline = Number.isNaN(createdTimestamp)
    ? ""
    : new Date(createdTimestamp + 20 * 60 * 1000).toISOString();
  const offerDeadline = order.expiresAt || fallbackDeadline;

  return (
    <main className="payment-checkout-page min-h-screen overflow-x-hidden bg-[#f4f9ff] pb-16 text-slate-950">
      <style>{`
        html,
        body {
          height: auto !important;
          min-height: 100%;
          overflow-y: auto !important;
        }

        .payment-checkout-page {
          background:
            radial-gradient(circle at 82% 0%, rgba(0, 97, 255, 0.16), transparent 28rem),
            radial-gradient(circle at 0% 40%, rgba(0, 194, 255, 0.12), transparent 25rem),
            linear-gradient(180deg, #f7fbff 0%, #eef7ff 48%, #fbfdff 100%) !important;
          color: #0f172a !important;
          color-scheme: light;
          max-width: 100vw;
          overflow-x: hidden;
          overflow-y: visible;
          overscroll-behavior-y: auto;
          touch-action: pan-y;
        }

        .payment-checkout-page * {
          box-sizing: border-box;
          min-width: 0;
        }

        .payment-checkout-page .payment-hero-title {
          max-width: 100%;
          overflow-wrap: break-word;
        }

        .payment-checkout-page .payment-topbar {
          background: linear-gradient(90deg, #0061ff 0%, #00b7ff 100%) !important;
          color: #ffffff !important;
          line-height: 1.35;
        }

        .payment-checkout-page .payment-header,
        .payment-checkout-page .payment-card {
          background: rgba(255, 255, 255, 0.92) !important;
          border-color: rgba(15, 23, 42, 0.08) !important;
        }

        .payment-checkout-page .payment-card {
          box-shadow: 0 26px 90px rgba(0, 97, 255, 0.13) !important;
        }

        .payment-checkout-page .payment-countdown-card,
        .payment-checkout-page .payment-soft-card {
          background: rgba(255, 255, 255, 0.94) !important;
          border-color: #dbeafe !important;
          box-shadow: 0 18px 60px rgba(0, 97, 255, 0.11) !important;
        }

        .payment-checkout-page .payment-countdown-timer,
        .payment-checkout-page .payment-gradient,
        .payment-checkout-page .payment-step-number {
          background: linear-gradient(90deg, #0061ff 0%, #00b7ff 100%) !important;
          color: #ffffff !important;
        }

        .payment-checkout-page .payment-urgency {
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%) !important;
          border-color: #fed7aa !important;
        }

        .payment-checkout-page .payment-qr-shell {
          background: linear-gradient(135deg, #0061ff 0%, #00c2ff 100%) !important;
        }

        .payment-checkout-page .payment-qr-inner,
        .payment-checkout-page .payment-muted-card {
          background: #fbfdff !important;
          color: #0f172a !important;
        }

        .payment-checkout-page .payment-focus-grid,
        .payment-checkout-page .payment-after-grid {
          grid-template-columns: 1fr !important;
        }

        @media (min-width: 768px) {
          .payment-checkout-page .payment-focus-grid {
            grid-template-columns: minmax(320px, 420px) minmax(360px, 1fr) !important;
          }
        }

        @media (min-width: 1024px) {
          .payment-checkout-page .payment-after-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          .payment-checkout-page {
            padding-bottom: 4rem;
          }

          .payment-checkout-page .payment-topbar {
            padding-left: 1rem;
            padding-right: 1rem;
            font-size: 0.72rem;
          }

          .payment-checkout-page section {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }

          .payment-checkout-page .payment-hero-title {
            font-size: 2.55rem !important;
            letter-spacing: -0.035em !important;
            line-height: 1.02 !important;
          }

          .payment-checkout-page .payment-qr-title {
            font-size: 1.45rem !important;
            letter-spacing: -0.03em !important;
            line-height: 1.12 !important;
            overflow-wrap: anywhere;
          }

          .payment-checkout-page .payment-offer-title {
            font-size: 1.36rem !important;
            letter-spacing: -0.035em !important;
            line-height: 1.12 !important;
            overflow-wrap: anywhere;
          }

          .payment-checkout-page .payment-focus-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            justify-items: stretch !important;
            width: 100% !important;
            max-width: calc(100vw - 3rem) !important;
            overflow-x: hidden !important;
          }

          .payment-checkout-page .payment-focus-grid > * {
            max-width: 100% !important;
            min-width: 0 !important;
            width: 100% !important;
          }

          .payment-checkout-page .payment-card,
          .payment-checkout-page .payment-soft-card {
            width: min(100%, calc(100vw - 1.5rem)) !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          .payment-checkout-page .payment-qr-shell,
          .payment-checkout-page .payment-qr-inner,
          .payment-checkout-page .payment-focus-grid img {
            max-width: 100% !important;
            min-width: 0 !important;
            width: 100% !important;
          }

          .payment-checkout-page .payment-current-price {
            display: block !important;
          }

          .payment-checkout-page .payment-countdown-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-28 -top-32 size-[460px] rounded-full bg-blue-500/18 blur-3xl" />
        <div className="absolute -left-28 top-1/3 size-[390px] rounded-full bg-cyan-400/16 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-[320px] rounded-full bg-orange-300/12 blur-3xl" />
      </div>

      <div className="payment-topbar sticky top-0 z-30 bg-gradient-to-r from-blue-600 to-cyan-400 px-5 py-2 text-center text-sm font-black text-white shadow-lg">
        Lưu ý: Thế Anh không gọi điện cho bạn để thúc bạn thanh toán, mình chỉ nhắn tin để hỗ trợ học viên sau khi đăng ký học thành công. Nếu bạn cần học nghiêm túc - Hãy đăng ký luôn ở trang này.
      </div>

      <header className="payment-header relative z-10 border-b border-slate-900/8 bg-white/88 px-5 py-4 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link className="flex items-center gap-3 font-black text-slate-950" href={content.productHref}>
            <span className="grid size-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(15,23,42,0.12)]">
              <Image src="/brand/ta-mark.svg" alt="The Anh Marketing" width={44} height={44} priority />
            </span>
            <span>{content.productLabel}</span>
          </Link>
          <span className="hidden rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-600 sm:inline-flex">
            Tự động xác nhận giao dịch
          </span>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col gap-7 px-3 pb-16 pt-8 sm:px-5 lg:pt-10">
        <div className="order-2 mx-auto w-full max-w-5xl">
          <div className="payment-soft-card rounded-[28px] border border-white/80 bg-white/82 p-5 shadow-[0_16px_54px_rgba(0,97,255,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Thông tin đơn hàng</p>
                <h1 className="payment-hero-title mt-3 text-2xl font-black leading-tight tracking-[-0.035em] text-slate-950 sm:text-3xl">
                  {content.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
                  Sau khi giao dịch được xác nhận, hệ thống sẽ mở quyền truy cập và gửi hướng dẫn vào email bạn đã đăng ký.
                </p>
              </div>
              <div className="w-fit rounded-2xl border border-blue-100 bg-white px-5 py-3 shadow-[0_12px_34px_rgba(0,97,255,0.1)]">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Cần thanh toán</p>
                <p className="text-2xl font-black tracking-[-0.04em] text-blue-600">{amountLabel}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Sản phẩm", courseTitle],
                ["Mã đơn", order.orderCode],
                ["Nội dung CK", transferContent],
              ].map(([label, value]) => (
                <div className="rounded-2xl border border-slate-900/8 bg-white px-4 py-3" key={label}>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</span>
                  <p className="mt-2 break-words text-sm font-black leading-6 tracking-[-0.02em] text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold leading-6 text-orange-900">
            Hoàn tất đúng nội dung chuyển khoản để hệ thống tự mở quyền. Nếu chuyển sai nội dung, đơn có thể cần kiểm tra thủ công.
          </p>
          {order.invoice.requested ? (
            <p className="mt-3 text-center text-xs font-semibold text-slate-500">Đã ghi nhận yêu cầu xuất hóa đơn.</p>
          ) : null}
        </div>

        <div className="payment-card order-1 mx-auto w-full max-w-5xl rounded-[26px] border border-blue-100 bg-white/94 p-2.5 shadow-[0_28px_90px_rgba(0,97,255,0.14)] backdrop-blur-2xl sm:rounded-[34px] sm:p-6" id="qr-payment-section">
          <div className="payment-qr-shell rounded-[24px] bg-gradient-to-br from-blue-500 to-cyan-300 p-0.5 sm:rounded-[28px] sm:p-1">
            <div className="payment-qr-inner rounded-[22px] bg-[#fbfdff] p-3 sm:rounded-[24px] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Thanh toán chuyển khoản</p>
                  <h2 className="payment-qr-title mt-2 text-[1.7rem] font-black leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-3xl sm:tracking-[-0.045em]">
                    {conversionMessage?.title ?? "Thanh toán ngay - 3 bước đơn giản"}
                  </h2>
                  {conversionMessage ? (
                    <div className="mt-3 max-w-2xl">
                      <p className="text-sm font-bold leading-6 text-slate-600">{conversionMessage.description}</p>
                      <p className="mt-2 text-sm font-black leading-6 text-blue-600">{conversionMessage.proof}</p>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-right shadow-[0_12px_34px_rgba(0,97,255,0.12)]">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Cần thanh toán</p>
                  <p className="text-2xl font-black tracking-[-0.04em] text-blue-600">{amountLabel}</p>
                </div>
              </div>

              {isFacebookAdsConversionCheckout ? null : (
                <div className="mt-5">
                  <PaymentOfferCountdown
                    currentPriceLabel={paymentOffer.currentPriceLabel}
                    deadline={offerDeadline}
                    originalPriceLabel={paymentOffer.originalPriceLabel}
                  />
                </div>
              )}

              <BankAppHandoff
                amount={order.amount}
                apps={bankApps}
                bankAccountName={sepay.bankAccountName}
                bankAccountNumber={sepay.bankAccountNumber}
                bankCode={sepay.bankCode}
                requested={openBank}
                returnUrl={paymentReturnUrl}
                transferContent={transferContent}
              />

              <div className="payment-focus-grid mt-7 grid justify-center gap-5 md:items-stretch">
                <div className="mx-auto w-full max-w-[420px] rounded-[30px] border border-blue-100 bg-white p-3 shadow-[0_18px_58px_rgba(0,97,255,0.12)]">
                  {configured && qrUrl ? (
                    <div className="rounded-[24px] border border-slate-900/8 bg-slate-50 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={`QR thanh toán ${order.orderCode}`}
                        className="aspect-square w-full rounded-[18px] bg-white object-contain"
                        src={qrUrl}
                      />
                    </div>
                  ) : (
                    <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-800">
                      Chưa có cấu hình ngân hàng để hiện mã QR tự động. Trang sẽ hiển thị thông tin chuyển khoản khi cấu hình hoàn tất.
                    </div>
                  )}
                  <p className="mt-3 text-center text-xs font-bold leading-5 text-slate-400">
                    Quét QR bằng app ngân hàng hoặc chuyển khoản theo thông tin bên cạnh.
                  </p>
                </div>

                <div className="mx-auto w-full max-w-[520px]">
                  <TransferDetails
                    amount={order.amount}
                    amountLabel={amountLabel}
                    bankAccountName={sepay.bankAccountName}
                    bankAccountNumber={sepay.bankAccountNumber}
                    bankName={bankName}
                    transferContent={transferContent}
                    variant="light"
                    prominent
                  />
                </div>
              </div>

              {isFacebookAdsConversionCheckout ? null : (
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {[
                    "Mở app ngân hàng và quét QR.",
                    `Giữ đúng nội dung chuyển khoản: ${transferContent}.`,
                    "Đợi trang tự đổi trạng thái khi giao dịch được xác nhận.",
                  ].map((step, index) => (
                    <div className="payment-muted-card flex gap-3 rounded-2xl bg-slate-50 p-4" key={step}>
                      <span className="payment-step-number grid size-8 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">
                        {index + 1}
                      </span>
                      <p className="pt-1 text-sm font-bold leading-6 text-slate-600">{step}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className={isFacebookAdsConversionCheckout ? "sr-only" : "mt-6"}>
                <PaymentStatusPoller disablePolling={isLocalDemoOrder} initialOrder={order} variant="light" />
              </div>

              {isFacebookAdsConversionCheckout ? (
                <>
                  <ZaloSupportProof />
                  <a
                    className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#0068ff] px-5 text-center text-sm font-black text-white shadow-[0_16px_40px_rgba(0,104,255,.28)] transition hover:-translate-y-0.5 hover:bg-[#0057d9]"
                    href="https://zalo.me/0367928921"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Nhắn Zalo Thế Anh - 0367 928 921
                  </a>
                </>
              ) : (
                <div className="payment-after-grid mt-5 grid gap-3">
                  {content.nextSteps.map((step, index) => (
                    <div className="payment-muted-card flex items-start gap-3 rounded-2xl border border-slate-900/6 bg-slate-50 p-4" key={step}>
                      <span className="payment-step-number grid size-8 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-[0.08em] text-blue-600">
                          Sau thanh toán {index + 1}
                        </span>
                        <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
