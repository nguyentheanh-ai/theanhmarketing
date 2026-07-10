import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Download, LogIn, MailCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Thanh toán thành công - Ebook Facebook Ads 2026",
  description:
    "Hướng dẫn nhận tài khoản, đăng nhập và đọc hoặc tải Ebook Facebook Ads 2026 sau khi thanh toán.",
  robots: {
    index: false,
    follow: false,
  },
};

const readerLoginHref = "/dang-nhap?next=%2Fthu-vien%2Ffacebook-ads";
const pdfLoginHref = "/dang-nhap?next=%2Fthu-vien%2Ffacebook-ads%2Fpdf";

const steps = [
  {
    title: "Check mail",
    description:
      "Mở hộp thư email đã dùng khi đặt hàng. Hệ thống sẽ gửi email thanh toán thành công kèm thông tin đăng nhập.",
    icon: MailCheck,
  },
  {
    title: "Đăng nhập",
    description:
      "Dùng email và mật khẩu tạm trong email để đăng nhập. Nếu không thấy email, hãy kiểm tra Spam hoặc Promotions/Khuyến mãi.",
    icon: LogIn,
  },
  {
    title: "Tải Ebook hoặc học Online",
    description:
      "Sau khi đăng nhập, anh/chị có thể đọc ebook online hoặc tải file PDF về máy để tra cứu bất cứ lúc nào.",
    icon: BookOpenCheck,
  },
];

export default function FacebookEbookPaymentThanksPage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-14 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100">
              Thanh toán thành công
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
              Cảm ơn anh/chị đã đặt Ebook Facebook Ads 2026
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
              Để bảo vệ tài nguyên đã mua, khu vực đọc online và tải PDF cần
              đăng nhập. Anh/chị làm theo 3 bước bên dưới để vào khu vực lấy
              ebook.
            </p>

            <div className="mt-8 grid gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className="grid grid-cols-[52px_1fr] gap-4 rounded-xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#d8b653] text-[#07111f]">
                      <Icon aria-hidden="true" className="size-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#d8b653]">
                        Bước {index + 1}
                      </p>
                      <h2 className="mt-1 text-xl font-black">{step.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-white/68">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/12 bg-white/[0.07] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)]">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#d8b653]">
              Khu vực lấy ebook
            </p>
            <h2 className="mt-4 text-2xl font-black">
              Đăng nhập xong là vào được ngay
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/65">
              Nếu vừa thanh toán xong, hãy ưu tiên mở email trước để lấy đúng
              mật khẩu tạm. Hai nút bên dưới sẽ đưa anh/chị tới trang đăng nhập
              rồi tự quay về khu vực ebook.
            </p>

            <div className="mt-6 grid gap-3">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d8b653] px-5 text-center text-sm font-black text-[#07111f] transition hover:bg-[#f3d772]"
                href={readerLoginHref}
              >
                <BookOpenCheck aria-hidden="true" className="size-5" />
                Đọc ebook online
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/16 bg-white/8 px-5 text-center text-sm font-black text-white transition hover:bg-white/14"
                href={pdfLoginHref}
              >
                <Download aria-hidden="true" className="size-5" />
                Tải file PDF
              </Link>
            </div>

            <div className="mt-6 rounded-xl border border-blue-300/20 bg-blue-300/10 p-4 text-sm leading-7 text-blue-50/82">
              Chưa thấy email? Kiểm tra Spam, Promotions/Khuyến mãi, hoặc chờ
              thêm 1-2 phút vì email có thể đang được hệ thống gửi sau khi ngân
              hàng xác nhận tiền vào.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
