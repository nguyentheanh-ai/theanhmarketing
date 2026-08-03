import { notFound } from "next/navigation";
import { buildPaymentSuccessEmailPayload } from "@/lib/notifications/payment-success-email";
import { normalizeAttribution } from "@/lib/tracking/attribution";
import { emptyInvoiceDetails } from "@/lib/orders/invoice";
import type { PaymentOrder } from "@/services/orderService";

export const dynamic = "force-dynamic";

export default function GuideEmailDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const order: PaymentOrder = {
    id: "guide-demo-paid-order",
    leadId: null,
    orderCode: "TAMDEMO2026",
    studentName: "Nguyễn Minh Anh",
    email: "minhanh.demo@gmail.com",
    phone: "0900000000",
    courseSlug: "facebook-ads-2026,ebook-facebook-ads-2026",
    courseTitle: "Facebook Ads Master 2026 + Ebook Facebook Ads 2026",
    amount: 1_098_000,
    amountLabel: "1.098.000đ",
    currency: "VND",
    status: "paid",
    paymentMethod: "sepay",
    paymentQrUrl: "",
    paidAt: new Date().toISOString(),
    expiresAt: null,
    createdAt: new Date().toISOString(),
    sepayReferenceCode: "DEMO",
    orderItems: [
      { slug: "facebook-ads-2026", title: "Facebook Ads Master 2026", price: 799_000 },
      { slug: "ebook-facebook-ads-2026", title: "Ebook Facebook Ads 2026", price: 299_000 },
    ],
    paymentEmailSentAt: null,
    paymentEmailLastError: null,
    accountingEmailSentAt: null,
    accountingEmailLastError: null,
    purchaseEventSent: false,
    attribution: normalizeAttribution(),
    invoice: emptyInvoiceDetails,
  };
  const payload = buildPaymentSuccessEmailPayload(order, {
    siteUrl: "http://127.0.0.1:3025",
    account: {
      email: order.email,
      temporaryPassword: "MatKhauDemo2026",
      created: true,
      mustChangePassword: true,
    },
  });

  return (
    <main className="min-h-screen bg-[#f3f4f6] px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-[980px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Hộp thư đến</p><h1 className="mt-2 text-xl font-black">{payload.subject}</h1></div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Đã nhận</span>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm"><span className="grid size-10 place-items-center rounded-full bg-slate-950 font-black text-white">TA</span><div><p className="font-black">The Anh Marketing</p><p className="text-slate-500">noreply@theanhmarketing.com → {order.email}</p></div></div>
        </header>
        <iframe className="h-[1120px] w-full bg-[#111111]" srcDoc={payload.html} title="Email xác nhận thanh toán và tài khoản học viên" />
      </section>
    </main>
  );
}
