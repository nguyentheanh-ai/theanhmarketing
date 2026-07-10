import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  KeyRound,
  LogIn,
  MailCheck,
  MessageCircle,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Thanh toán thành công - Facebook Ads Master 2026",
  description:
    "Hướng dẫn nhận tài khoản, đăng nhập và vào học khóa Facebook Ads Master 2026 sau khi thanh toán.",
  robots: {
    index: false,
    follow: false,
  },
};

const dashboardLoginHref = "/dang-nhap?next=%2Fdashboard";
const supportHref = "/vao-khoa-hoc";

const steps = [
  {
    title: "Thanh toán thành công",
    description:
      "Sau khi SePay báo tiền vào, website tự chuyển anh/chị sang trang hướng dẫn này.",
    icon: CheckCircle2,
  },
  {
    title: "Check mail",
    description:
      "Mở đúng email đã dùng khi mua khóa. Đây là nơi hệ thống gửi tài khoản học viên.",
    icon: MailCheck,
  },
  {
    title: "Mở email xác nhận thanh toán",
    description:
      "Tìm email xác nhận thanh toán Facebook Ads Master 2026. Nếu chưa thấy, kiểm tra Spam hoặc Promotions/Khuyến mãi.",
    icon: SearchCheck,
  },
  {
    title: "Lấy mật khẩu tạm",
    description:
      "Trong email sẽ có Email đã mua khóa và Mật khẩu tạm. Sao chép mật khẩu này để đăng nhập.",
    icon: KeyRound,
  },
  {
    title: "Đăng nhập và vào học",
    description:
      "Đăng nhập bằng email đã mua khóa và mật khẩu tạm, sau đó mở Dashboard để chọn Facebook Ads Master 2026.",
    icon: LogIn,
  },
];

export default function FacebookAdsCoursePaymentThanksPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#0b0b0c]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Thanh toán thành công
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-[-0.03em] sm:text-6xl">
              Hướng dẫn vào học Facebook Ads Master 2026
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-black/65 sm:text-lg">
              Khu học viên cần tài khoản mới mở được bài học. Anh/chị hãy bắt đầu từ email
              xác nhận thanh toán để lấy mật khẩu tạm, rồi đăng nhập vào Dashboard học viên.
            </p>

            <div className="mt-8 grid gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className="grid grid-cols-[52px_1fr] gap-4 rounded-3xl border border-black/8 bg-white p-5 shadow-[0_18px_60px_rgba(11,11,12,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(11,11,12,0.09)]"
                  >
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#0b0b0c] text-white">
                      <Icon aria-hidden="true" className="size-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#c77b20]">Bước {index + 1}</p>
                      <h2 className="mt-1 text-xl font-black">{step.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-black/62">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="rounded-3xl border border-black/8 bg-white p-6 shadow-[0_30px_90px_rgba(11,11,12,0.10)] lg:sticky lg:top-24">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#c77b20]">
              Khu học viên
            </p>
            <h2 className="mt-4 text-2xl font-black">Lấy mật khẩu rồi vào học</h2>
            <p className="mt-3 text-sm leading-7 text-black/62">
              Không tự tạo tài khoản mới nếu chưa kiểm tra email xác nhận thanh toán.
              Tài khoản học viên được gửi theo email anh/chị đã dùng khi mua khóa.
            </p>

            <div className="mt-5 rounded-3xl border border-dashed border-black/15 bg-[#fbfaf7] p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-black text-white">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/45">
                    Trong email sẽ có
                  </p>
                  <p className="text-base font-black">Thông tin đăng nhập</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-2xl border border-black/8 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-black/40">
                    Email đã mua khóa
                  </p>
                  <p className="mt-1 font-black text-black/80">email của anh/chị</p>
                </div>
                <div className="rounded-2xl border border-black/8 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-black/40">
                    Mật khẩu tạm
                  </p>
                  <p className="mt-1 font-black tracking-[0.16em] text-black/80">••••••••••••</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <Link
                aria-label="Vào học trong Dashboard"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-black px-5 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-black/85"
                href={dashboardLoginHref}
              >
                <BookOpenCheck aria-hidden="true" className="size-5" />
                Vào khóa học
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 text-center text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-black/[0.03]"
                href={supportHref}
              >
                <MessageCircle aria-hidden="true" className="size-5" />
                Cần hỗ trợ đăng nhập
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-[#c77b20]/20 bg-[#f2eadf] p-4 text-sm leading-7 text-black/68">
              Email thường đến sau 1-2 phút. Nếu chưa thấy, hãy kiểm tra Spam,
              Promotions/Khuyến mãi rồi mới nhắn hỗ trợ.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
