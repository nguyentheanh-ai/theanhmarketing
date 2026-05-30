import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentOfferCountdown } from "@/components/payment/payment-offer-countdown";
import { PaymentStatusPoller } from "@/components/payment/payment-status-poller";
import { TransferDetails } from "@/components/payment/transfer-details";
import {
  createSepayQrUrl,
  formatVnd,
  getBankDisplayName,
  getSepayConfig,
  isSepayConfigured,
} from "@/lib/payments/sepay";
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
  ["Giữ đúng giá 359K", "Đơn này đang khóa số tiền và nội dung chuyển khoản riêng để SePay đối soát tự động."],
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
  ["SePay tự đối soát", "Khi tiền vào đúng nội dung, hệ thống tự đổi trạng thái mà không cần gửi bill thủ công."],
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
  const haystack = `${order.courseSlug} ${order.courseTitle} ${order.orderItems
    .map((item) => `${item.slug} ${item.title}`)
    .join(" ")}`.toLowerCase();
  return haystack.includes(agentKitSlug) || haystack.includes("agent kit") || haystack.includes("ai agent business");
}

function getLocalDemoPaymentOrder(code: string): PaymentOrder | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const normalizedCode = code.toUpperCase();

  if (normalizedCode === "AGENTKITDEMO") {
    return {
      id: "local-agent-kit-demo",
      orderCode: "AGENTKITDEMO",
      studentName: "Khách đăng ký demo",
      email: "demo@gmail.com",
      phone: "0900000000",
      courseSlug: agentKitSlug,
      courseTitle: "Bộ Agent Kit X10 hiệu suất công việc - Gói private ads 359K",
      amount: 359000,
      amountLabel: "359.000đ",
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
          title: "Bộ Agent Kit X10 hiệu suất công việc - Gói private ads 359K",
          price: 359000,
        },
      ],
      paymentEmailSentAt: null,
      paymentEmailLastError: null,
    };
  }

  if (normalizedCode === "AIMASTERX10DEMO") {
    return {
      id: "local-ai-master-x10-demo",
      orderCode: "AIMASTERX10DEMO",
      studentName: "Khách đăng ký demo",
      email: "demo@gmail.com",
      phone: "0900000000",
      courseSlug: "ai-master-x10-hieu-suat",
      courseTitle: "AI Master X10 hiệu suất - Biến tri thức thành tiền",
      amount: 1299000,
      amountLabel: "1.299.000đ",
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
          price: 1299000,
        },
      ],
      paymentEmailSentAt: null,
      paymentEmailLastError: null,
    };
  }

  return null;
}

function getCheckoutContent(order: PaymentOrder) {
  if (isAgentKit(order)) {
    return {
      eyebrow: "Bước cuối để nhận bộ kit",
      title: "Bộ Kit AI Agent Business",
      description:
        "Quét QR hoặc chuyển khoản đúng nội dung. Khi SePay xác nhận giao dịch, hệ thống sẽ mở quyền truy cập và gửi hướng dẫn theo email bạn đã đăng ký.",
      productLabel: "AI Agent Business",
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

  if (isAiMasterX10(order)) {
    return {
      eyebrow: "Bước cuối để mở khóa khóa học",
      title: "Hoàn tất thanh toán để nhận quyền truy cập AI Master X10.",
      description:
        "Kiểm tra đúng số tiền và nội dung chuyển khoản. Khi SePay xác nhận giao dịch, hệ thống sẽ gửi email hướng dẫn truy cập.",
      productLabel: "AI Master X10",
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
      "Kiểm tra đúng khóa học, số tiền và nội dung chuyển khoản. Hệ thống sẽ tự xác nhận sau khi SePay báo giao dịch thành công.",
    productLabel: "The Anh Marketing",
    includes:
      order.orderItems.length > 0
        ? order.orderItems.map((item) => item.title)
        : ["Quyền truy cập sản phẩm đã đăng ký", "Email hướng dẫn sau thanh toán", "Hỗ trợ kiểm tra nếu giao dịch chưa được xác nhận"],
    saleReasons: defaultSaleReasons,
    nextSteps: ["SePay xác nhận giao dịch", "Hệ thống gửi email hướng dẫn", "Bạn bắt đầu học hoặc dùng sản phẩm đã mua"],
    stickyCopy: "Hoàn tất thanh toán",
  };
}

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const order = (await getPaymentOrder(code)) ?? getLocalDemoPaymentOrder(code);

  if (!order) {
    notFound();
  }

  const sepay = getSepayConfig();
  const configured = isSepayConfigured();
  const transferContent = (order.sepayReferenceCode || order.orderCode).toUpperCase();
  const bankName = getBankDisplayName(sepay.bankCode);
  const qrUrl = configured ? createSepayQrUrl({ amount: order.amount, orderCode: transferContent }) : "";
  const amountLabel = order.amountLabel || formatVnd(order.amount);
  const courseTitle = getDisplayCourseTitle(order);
  const content = getCheckoutContent(order);
  const isLocalDemoOrder = order.id.startsWith("local-");
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

          .payment-checkout-page .payment-hero-title {
            font-size: 2.55rem !important;
            letter-spacing: -0.035em !important;
            line-height: 1.02 !important;
          }

        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-28 -top-32 size-[460px] rounded-full bg-blue-500/18 blur-3xl" />
        <div className="absolute -left-28 top-1/3 size-[390px] rounded-full bg-cyan-400/16 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-[320px] rounded-full bg-orange-300/12 blur-3xl" />
      </div>

      <div className="payment-topbar relative z-20 bg-gradient-to-r from-blue-600 to-cyan-400 px-5 py-2 text-center text-sm font-black text-white">
        Ưu đãi đang được giữ theo mã đơn của bạn. Chuyển khoản đúng nội dung để hệ thống mở quyền tự động.
      </div>

      <header className="payment-header relative z-10 border-b border-slate-900/8 bg-white/88 px-5 py-4 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link className="flex items-center gap-3 font-black text-slate-950" href="/khoa-hoc/bo-kit-agent-doanh-nghiep">
            <span className="grid size-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(15,23,42,0.12)]">
              <Image src="/brand/ta-mark.svg" alt="The Anh Marketing" width={44} height={44} priority />
            </span>
            <span>{content.productLabel}</span>
          </Link>
          <span className="hidden rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-600 sm:inline-flex">
            SePay tự đối soát
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
                  Sau khi SePay xác nhận giao dịch, hệ thống sẽ mở quyền truy cập và gửi hướng dẫn vào email bạn đã đăng ký.
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
        </div>

        <div className="payment-card order-1 mx-auto w-full max-w-5xl rounded-[26px] border border-blue-100 bg-white/94 p-2.5 shadow-[0_28px_90px_rgba(0,97,255,0.14)] backdrop-blur-2xl sm:rounded-[34px] sm:p-6" id="qr-payment-section">
          <div className="payment-qr-shell rounded-[24px] bg-gradient-to-br from-blue-500 to-cyan-300 p-0.5 sm:rounded-[28px] sm:p-1">
            <div className="payment-qr-inner rounded-[22px] bg-[#fbfdff] p-3 sm:rounded-[24px] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Thanh toán SePay</p>
                  <h2 className="mt-2 text-[1.7rem] font-black leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-3xl sm:tracking-[-0.045em]">
                    Thanh toán ngay - 3 bước đơn giản
                  </h2>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-right shadow-[0_12px_34px_rgba(0,97,255,0.12)]">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Cần thanh toán</p>
                  <p className="text-2xl font-black tracking-[-0.04em] text-blue-600">{amountLabel}</p>
                </div>
              </div>

              <div className="mt-5">
                <PaymentOfferCountdown deadline={offerDeadline} />
              </div>

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
                      Chưa cấu hình SePay để hiện mã QR tự động. Trang vẫn hiển thị thông tin chuyển khoản khi có cấu hình ngân hàng.
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

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {[
                    "Mở app ngân hàng và quét QR.",
                    `Giữ đúng nội dung chuyển khoản: ${transferContent}.`,
                    "Đợi trang tự đổi trạng thái khi SePay xác nhận.",
                  ].map((step, index) => (
                    <div className="payment-muted-card flex gap-3 rounded-2xl bg-slate-50 p-4" key={step}>
                      <span className="payment-step-number grid size-8 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">
                        {index + 1}
                      </span>
                      <p className="pt-1 text-sm font-bold leading-6 text-slate-600">{step}</p>
                    </div>
                  ))}
              </div>

              <div className="mt-6">
                <PaymentStatusPoller disablePolling={isLocalDemoOrder} initialOrder={order} variant="light" />
              </div>

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
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
