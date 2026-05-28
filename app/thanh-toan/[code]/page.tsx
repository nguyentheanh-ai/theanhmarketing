import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { PaymentStatusPoller } from "@/components/payment/payment-status-poller";
import { TransferDetails } from "@/components/payment/transfer-details";
import {
  createSepayQrUrl,
  getBankDisplayName,
  getSepayConfig,
  isSepayConfigured,
  formatVnd,
} from "@/lib/payments/sepay";
import { getPaymentOrder, type PaymentOrder } from "@/services/orderService";

export const dynamic = "force-dynamic";

const playfair = Playfair_Display({
  subsets: ["vietnamese"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Thanh toán AI Master X10",
  robots: {
    index: false,
    follow: false,
  },
};

const referenceModules = [
  {
    tag: "Phần 1",
    title: "Đóng gói sản phẩm trong 7 ngày",
    desc: "Nghiên cứu thị trường và market fit để có sản phẩm tri thức có thể bán thử ngay.",
  },
  {
    tag: "Phần 2",
    title: "6 Agent vận hành học tập",
    desc: "Research, Offer, Content, Lesson, Landing và CRM giúp bạn chạy một hệ thống đầy đủ, không cần đội ngũ lớn.",
  },
  {
    tag: "Phần 3",
    title: "Content & Visual 30 ngày",
    desc: "Làm việc đúng thứ tự với content plan, hình ảnh, video, và CTA để kéo lead đều đặn.",
  },
  {
    tag: "Phần 4",
    title: "Landing – Form – Thanh toán",
    desc: "Triển khai landing tối ưu với form và flow thanh toán để tránh rò rỉ khách.",
  },
  {
    tag: "Phần 5",
    title: "Website học viên & CRM mini",
    desc: "Nhận asset theo dõi lead, đơn và doanh thu theo một quy trình thống nhất.",
  },
  {
    tag: "Phần 6",
    title: "6 SOP mẫu để tái triển khai",
    desc: "Bản đồ sản phẩm, kế hoạch content, checklist landing, CRM pipeline, beta launch và roadmap scale.",
  },
];

const bonuses = [
  ["🎁", "Kho Prompt Chuyên Gia 150+", "150+ mẫu prompt copy-paste dùng ngay cho mọi tình huống kinh doanh."],
  ["🗓️", "Template Content 30 Ngày", "Lịch trình nội dung 30 ngày dẫn người xem về form đăng ký."],
  ["🎬", "Script Video Bán Hàng", "Hook – vấn đề – demo – CTA, đúng cấu trúc để message thuyết phục hơn."],
  ["📣", "Facebook Ads Cho Chuyên Gia", "Set up quảng cáo theo thông điệp, tệp và ngân sách đúng cho khóa học."],
  ["🤝", "Cộng Đồng Chuyên Gia", "Hệ thống hỏi đáp, phản hồi và chia sẻ tài nguyên triển khai thực tế."],
];

function getDisplayCourseTitle(order: PaymentOrder) {
  const title = order.orderItems.length === 1 ? order.orderItems[0].title : order.courseTitle;
  return (title || "AI Master X10").split(" - ")[0].trim();
}

function isAiMasterX10Title(title: string) {
  return (title || "").toLowerCase().includes("ai master x10");
}

function getLocalDemoPaymentOrder(code: string): PaymentOrder | null {
  if (process.env.NODE_ENV === "production" || code.toUpperCase() !== "AIMASTERX10DEMO") {
    return null;
  }

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
  const isLocalDemoOrder = order.id === "local-ai-master-x10-demo";
  const configured = isSepayConfigured();
  const transferContent = (order.sepayReferenceCode || order.orderCode).toUpperCase();
  const bankName = getBankDisplayName(sepay.bankCode);
  const qrUrl = configured ? createSepayQrUrl({ amount: order.amount, orderCode: transferContent }) : "";
  const amountLabel = formatVnd(order.amount);
  const courseTitle = getDisplayCourseTitle(order);
  const isAIMasterX10 = isAiMasterX10Title(courseTitle) || isAiMasterX10Title(order.courseTitle);
  const heroCopy = isAIMasterX10
    ? "Trong 7 ngày, đi từ ý tưởng và tri thức đang rời rạc thành hệ thống bán thử gồm offer, content, visual/video, landing, thanh toán, CRM mini, 6 Agent và SOP mẫu."
    : `Kiểm tra đúng khóa học, số tiền và nội dung chuyển khoản cho đơn ${order.orderCode}. Hệ thống sẽ tự xác nhận sau khi SePay báo giao dịch thành công.`;
  const orderModules =
    order.orderItems.length > 1
      ? order.orderItems.map((item, index) => ({
          tag: `Khóa ${index + 1}`,
          title: item.title,
          desc: "Trọn quyền truy cập sau khi SePay xác nhận thanh toán thành công.",
        }))
      : isAIMasterX10
        ? referenceModules
        : [
            {
              tag: "Gói khóa",
              title: courseTitle,
              desc: "Trọn quyền truy cập sau khi SePay xác nhận thanh toán thành công.",
            },
          ];

  const orderDisplayTitle =
    isAIMasterX10 || !courseTitle ? `AI Master X10` : courseTitle;
  const packageLabel =
    order.orderItems.length > 1
      ? `KHÓA HỌC CHÍNH (${order.orderItems.length} gói) : ${order.orderItems.map((item) => item.title).join(" + ")}`
      : order.orderItems.length === 1
        ? `KHÓA HỌC CHÍNH: ${courseTitle}`
        : `KHÓA HỌC CHÍNH: ${orderDisplayTitle}`;
  const bonusesTitle = "★ Quà Tặng Chỉ Dành Cho AI Master X10";

  return (
    <main className="min-h-screen bg-[#050607] pb-28 text-[#f8fafc] selection:bg-[#f4bd4f]/30">
      <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-[#d84a36] px-3 py-2 text-center text-xs font-bold text-white shadow-lg sm:text-sm">
        <span>Ưu đãi kết thúc hôm nay lúc 23:59</span>
        <span className="inline-flex items-center gap-1 rounded bg-black/18 px-2 py-0.5 font-mono">
          <span>◷</span>
          <span>23:59:59</span>
        </span>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <section className="space-y-4 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0f2c1b] px-3 py-1 text-sm font-bold text-[#49d17c]">
            <span>✓</span>
            <span>Bạn đang thanh toán khóa: <strong>{orderDisplayTitle}</strong></span>
          </div>
          <h1 className={`${playfair.className} mx-auto max-w-3xl text-[1.75rem] font-extrabold leading-[1.12] tracking-normal text-white sm:text-5xl sm:leading-tight`}>
            Hoàn Tất Thanh Toán Để Nhận Ngay{" "}
            <span className="text-[#f2b84b]">{courseTitle}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-8 text-white/55 sm:text-lg">
            {heroCopy}
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-[#f4bd4f]/15 bg-[#111016]/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.32)] sm:p-6">
          <h2 className={`${playfair.className} mb-5 flex items-center gap-2 text-xl font-extrabold text-white`}>
            <span className="text-[#f2b84b]">▰</span>
            Chi Tiết Đơn Hàng
          </h2>

          <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/48">
            <span>▱</span>
            {packageLabel}
          </p>

          <div className="space-y-3">
            {orderModules.map((item) => (
              <div className="flex items-start gap-3" key={`${item.tag}-${item.title}`}>
                <span className="mt-0.5 text-[#f2b84b]">✓</span>
                <div>
                  <span className="mr-2 rounded bg-[#f2b84b]/10 px-1.5 py-0.5 text-xs font-black text-[#f2b84b]">
                    {item.tag}
                  </span>
                  <span className="text-sm font-bold text-white">{item.title}</span>
                  <p className="mt-1 text-xs leading-5 text-white/42">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {isAIMasterX10 ? (
            <div className="mt-5 rounded-xl border border-[#f2b84b]/15 bg-[#201d17] p-4">
              <p className="mb-3 text-sm font-black uppercase tracking-wide text-[#f2b84b]">{bonusesTitle}</p>
              <div className="space-y-3">
                {bonuses.map(([icon, title, desc]) => (
                  <div className="flex items-start gap-3" key={title}>
                    <span className="mt-0.5">{icon}</span>
                    <div>
                      <p className="text-sm font-black text-[#f2b84b]">{title}</p>
                      <p className="text-xs leading-5 text-white/45">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 border-t border-white/8 pt-5">
            <div className="mb-4 flex items-end justify-between gap-4">
              <span className="text-lg font-black text-white">Bạn chỉ trả hôm nay:</span>
              <span className="text-3xl font-black text-[#f2b84b]">{amountLabel}</span>
            </div>
          </div>
        </section>

        <section
          className="mt-12 overflow-hidden rounded-2xl border border-[#f2b84b]/25 bg-gradient-to-b from-[#f2b84b]/18 to-transparent p-1 shadow-[0_20px_80px_rgba(242,184,75,0.08)]"
          id="qr-payment-section"
        >
          <div className="rounded-xl bg-[#111016] p-5 sm:p-8">
            <div className="mb-8 text-center">
              <h2 className={`${playfair.className} mb-2 text-3xl font-extrabold text-white`}>
                Thanh Toán Ngay - 3 Bước Đơn Giản
              </h2>
              <p className="text-white/48">Quét mã QR dưới đây bằng ứng dụng ngân hàng của bạn</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div className="flex flex-col items-center">
                {configured && qrUrl ? (
                  <div className="mb-4 rounded-2xl bg-white p-2 shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`QR thanh toán ${order.orderCode}`}
                      className="aspect-square w-[240px] rounded-xl object-contain md:w-[300px]"
                      src={qrUrl}
                    />
                  </div>
                ) : (
                  <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm font-bold leading-6 text-amber-100">
                    Chưa cấu hình SePay để hiện mã QR tự động.
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/45 sm:text-sm">
                  <span>🔒 Bảo mật</span>
                  <span>•</span>
                  <span>💬 Hỗ trợ 24/7</span>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f2b84b]/15 font-black text-[#f2b84b]">
                    1
                  </span>
                  <p className="pt-1 text-white/82">Mở app ngân hàng, chọn quét mã QR</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f2b84b]/15 font-black text-[#f2b84b]">
                    2
                  </span>
                  <div className="w-full space-y-3 pt-1">
                    <p className="text-white/82">Hoặc chuyển khoản thủ công theo thông tin:</p>
                    <TransferDetails
                      amountLabel={amountLabel}
                      bankAccountName={sepay.bankAccountName}
                      bankAccountNumber={sepay.bankAccountNumber}
                      bankName={bankName}
                      transferContent={transferContent}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f2b84b]/15 font-black text-[#f2b84b]">
                    3
                  </span>
                  <p className="pt-1 text-white/82">Trang sẽ tự xác nhận khi SePay báo giao dịch thành công</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <PaymentStatusPoller disablePolling={isLocalDemoOrder} initialOrder={order} />
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6 text-center">
            <h3 className={`${playfair.className} mb-2 text-2xl font-extrabold text-white`}>
              Ví dụ khách đăng ký
            </h3>
            <p className="text-white/48">
              Mẫu thông tin sau khi khách bấm thanh toán thành công:
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b0c0f] p-5">
            <ul className="grid gap-3 text-sm text-white/70 sm:grid-cols-2">
              <li className="rounded-md bg-[#101114] p-3">
                <span className="block text-xs text-white/45">Mã đơn</span>
                <span className="text-sm font-black text-white">{order.orderCode}</span>
              </li>
              <li className="rounded-md bg-[#101114] p-3">
                <span className="block text-xs text-white/45">Khóa đã đăng ký</span>
                <span className="text-sm font-black text-white">
                  {order.orderItems.length > 0 ? order.orderItems.map((item) => item.title).join(" | ") : orderDisplayTitle}
                </span>
              </li>
              <li className="rounded-md bg-[#101114] p-3">
                <span className="block text-xs text-white/45">Số tiền thanh toán</span>
                <span className="text-sm font-black text-white">{amountLabel}</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-12">
          <h3 className={`${playfair.className} mb-6 text-center text-xl font-extrabold text-white`}>
            Sau Khi Thanh Toán, Cái Gì Xảy Ra?
          </h3>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["1", "Hệ thống xác nhận", "SePay báo giao dịch thành công và mở quyền truy cập ngay"],
              ["2", "Nhận Email", "Bạn nhận email hướng dẫn + đường dẫn học viên/dashboard trong vài phút"],
              ["3", "Bắt đầu học ngay", isAIMasterX10 ? "Khởi động roadmap 7 ngày để có sản phẩm bán thử" : "Bắt đầu học theo hướng dẫn trong email kích hoạt"],
            ].map(([step, title, desc]) => (
              <div className="text-center" key={step}>
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border-2 border-[#f2b84b] bg-[#111016] text-xl font-black">
                  {step}
                </div>
                <h4 className="font-black text-white">{title}</h4>
                <p className="mt-2 text-sm leading-6 text-white/48">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-xl border border-[#d84a36]/20 bg-[#d84a36]/10 p-6 text-center">
          <p className="mb-2 text-xl">◷</p>
          <h3 className="text-xl font-black text-white">
            Chỉ còn <span className="text-[#ff6b5a]">7</span> suất cuối với giá này
          </h3>
          <p className="mt-2 text-white/50">Sau 23:59 hôm nay mức giá có thể thay đổi theo chương trình.</p>
        </section>

        <section className="mt-12 pb-8">
          <h3 className={`${playfair.className} mb-6 text-center text-xl font-extrabold text-white`}>
            Câu Hỏi Thường Gặp
          </h3>
          <div className="space-y-4">
            {[
              ["Sau khi chuyển khoản bao lâu tôi nhận được tài khoản học viên?", "Sau khi SePay xác nhận giao dịch, bạn nhận email mở khóa và quyền truy cập gần như ngay lập tức."],
              ["Nội dung chuyển khoản tôi cần điền gì?", `Giữ đúng nội dung: ${transferContent}. Đây là mã để hệ thống đối soát tự động.`],
              ["Nếu tôi không nhận được email thì sao?", "Kiểm tra lại email spam; nếu vẫn chưa có, liên hệ hỗ trợ theo thông tin bên dưới để kích hoạt lại quyền truy cập."],
            ].map(([question, answer]) => (
              <div className="rounded-xl border border-white/10 bg-[#0b0c0f] p-5" key={question}>
                <h4 className="mb-2 font-black text-white">{question}</h4>
                <p className="text-sm leading-6 text-white/50">{answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#111016] p-4 shadow-2xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-sm text-white/45">Chỉ thanh toán 1 lần duy nhất</p>
            <p className="text-xl font-black text-[#f2b84b]">{amountLabel}</p>
          </div>
          <a
            className="flex min-h-12 w-full items-center justify-center rounded-md bg-[#f2b84b] px-8 text-sm font-black text-[#171000] shadow-lg shadow-[#f2b84b]/10 transition hover:bg-[#ffca5d] sm:w-auto"
            href="#qr-payment-section"
          >
            Tôi Muốn Bắt Đầu Học Ngay <span className="ml-2">›</span>
          </a>
        </div>
      </div>
    </main>
  );
}
