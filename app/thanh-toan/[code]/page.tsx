import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentStatusPoller } from "@/components/payment/payment-status-poller";
import { PageShell } from "@/components/site/page-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getSepayConfig, isSepayConfigured } from "@/lib/payments/sepay";
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

  return (
    <PageShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-24 pt-40 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-semibold text-[#c77b20]">Thanh toán Sepay</p>
          <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Quét QR để hoàn tất đăng ký.
          </h1>
          <p className="mt-6 text-lg leading-9 text-black/65">
            Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự đối soát đúng đơn.
          </p>
          <div className="mt-8 grid gap-4 text-sm font-semibold text-black/70">
            <p>Mã đơn: {order.orderCode}</p>
            <p>Khóa học: {order.courseTitle}</p>
            <p>Học viên: {order.studentName}</p>
            <p>Số tiền: {order.amountLabel}</p>
          </div>
        </div>

        <SoftCard>
          {configured && order.paymentQrUrl ? (
            <div className="grid gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`QR thanh toán ${order.orderCode}`}
                className="mx-auto aspect-square w-full max-w-sm rounded-3xl border border-black/10 bg-white object-contain p-4"
                src={order.paymentQrUrl}
              />
              <div className="grid gap-3 rounded-2xl border border-black/10 bg-[#fbfaf7] p-4 text-sm leading-6 text-black/65">
                <p>
                  Ngân hàng: <span className="font-bold text-black">{sepay.bankCode}</span>
                </p>
                <p>
                  Số tài khoản:{" "}
                  <span className="font-bold text-black">{sepay.bankAccountNumber}</span>
                </p>
                {sepay.bankAccountName ? (
                  <p>
                    Chủ tài khoản:{" "}
                    <span className="font-bold text-black">{sepay.bankAccountName}</span>
                  </p>
                ) : null}
                <p>
                  Nội dung: <span className="font-bold text-black">{order.orderCode}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#f2eadf] p-4 text-sm font-semibold leading-6 text-black/65">
              Chưa cấu hình tài khoản nhận tiền Sepay. Thêm `SEPAY_BANK_CODE` và
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
