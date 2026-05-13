import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentStatusPoller } from "@/components/payment/payment-status-poller";
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
  title: "Thanh toan khoa hoc",
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
  const qrUrl =
    order.paymentQrUrl ||
    createVietQrUrl({
      amount: order.amount,
      orderCode: transferContent,
      accountName: sepay.bankAccountName,
    });
  const bankName = getBankDisplayName(sepay.bankCode);

  return (
    <PageShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-24 pt-40 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-semibold text-[#c77b20]">Thanh toan SePay</p>
          <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Quet QR de hoan tat dang ky.
          </h1>
          <p className="mt-6 text-lg leading-9 text-black/65">
            Vui long giu nguyen noi dung chuyen khoan de he thong doi soat dung don.
          </p>
          <div className="mt-8 grid gap-4 text-sm font-semibold text-black/70">
            <p>Ma don: {order.orderCode}</p>
            <p>Khoa hoc: {order.courseTitle}</p>
            <p>Hoc vien: {order.studentName}</p>
            <p>So tien: {order.amountLabel}</p>
          </div>
        </div>

        <SoftCard>
          {configured && qrUrl ? (
            <div className="grid gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`QR thanh toan ${order.orderCode}`}
                className="mx-auto aspect-square w-full max-w-[340px] rounded-3xl border border-black/10 bg-white object-contain p-4"
                src={qrUrl}
              />
              <div className="grid gap-3 rounded-2xl border border-black/10 bg-[#fbfaf7] p-4 text-sm leading-6 text-black/65">
                <p>
                  Ngan hang: <span className="font-bold text-black">{bankName}</span>
                </p>
                <p>
                  So tai khoan:{" "}
                  <span className="font-bold text-black">{sepay.bankAccountNumber}</span>
                </p>
                {sepay.bankAccountName ? (
                  <p>
                    Chu tai khoan:{" "}
                    <span className="font-bold text-black">{sepay.bankAccountName}</span>
                  </p>
                ) : null}
                <p>
                  Noi dung: <span className="font-bold text-black">{transferContent}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#f2eadf] p-4 text-sm font-semibold leading-6 text-black/65">
              Chua cau hinh tai khoan nhan tien SePay. Them `SEPAY_BANK_CODE` va
              `SEPAY_BANK_ACCOUNT_NUMBER` trong bien moi truong de hien ma QR tu dong.
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
