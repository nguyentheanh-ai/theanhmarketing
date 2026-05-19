import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentStatusPoller } from "@/components/payment/payment-status-poller";
import { TransferDetails } from "@/components/payment/transfer-details";
import { PageShell } from "@/components/site/page-shell";
import { SoftCard } from "@/components/ui/soft-card";
import {
  createVietQrUrl,
  getBankDisplayName,
  getSepayConfig,
  isSepayConfigured,
} from "@/lib/payments/sepay";
import { getPaymentOrder } from "@/services/orderService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thanh toán khóa học",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const order = await getPaymentOrder(code);

  if (!order) {
    notFound();
  }

  const sepay = getSepayConfig();
  const configured = isSepayConfigured();
  const transferContent = (order.sepayReferenceCode || order.orderCode).toUpperCase();
  const bankName = getBankDisplayName(sepay.bankCode);
  const qrUrl = configured
    ? createVietQrUrl({
        amount: order.amount,
        orderCode: transferContent,
        accountName: sepay.bankAccountName,
      })
    : "";

  return (
    <PageShell>
      <section className="ai-shell grid gap-8 pb-24 pt-32 sm:pt-40 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="ai-kicker">Thanh toán SePay</p>
          <h1 className="ai-glow-text mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Quét QR để hoàn tất đăng ký.
          </h1>
          <p className="ai-muted mt-6 text-lg leading-9">
            Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống đối soát đúng đơn.
          </p>
          <div className="mt-8 grid gap-4 text-sm font-semibold text-white/70">
            <p>Mã đơn: {order.orderCode}</p>
            <p>Khóa học: {order.courseTitle}</p>
            <p>Học viên: {order.studentName}</p>
            <p>Số tiền: {order.amountLabel}</p>
          </div>
        </div>

        <SoftCard>
          {configured && qrUrl ? (
            <div className="grid gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`QR thanh toán ${order.orderCode}`}
                className="mx-auto aspect-square w-full max-w-[340px] rounded-xl border border-white/10 bg-white object-contain p-4"
                src={qrUrl}
              />
              <TransferDetails
                bankAccountName={sepay.bankAccountName}
                bankAccountNumber={sepay.bankAccountNumber}
                bankName={bankName}
                transferContent={transferContent}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-semibold leading-6 text-amber-100/85">
              Chưa cấu hình tài khoản nhận tiền SePay. Thêm `SEPAY_BANK_CODE` và
              `SEPAY_BANK_ACCOUNT_NUMBER` trong biến môi trường để hiện mã QR tự động.
            </div>
          )}

          <div className="mt-5">
            <PaymentStatusPoller initialOrder={order} />
          </div>
        </SoftCard>
      </section>
    </PageShell>
  );
}
