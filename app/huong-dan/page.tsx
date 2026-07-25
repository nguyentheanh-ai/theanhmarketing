import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Hướng dẫn nhận tài khoản và vào học",
  description: "Hướng dẫn thanh toán, nhận tài khoản qua email, đăng nhập khóa học và tải ebook.",
};

const steps = [
  {
    number: "01",
    title: "Hoàn tất thanh toán",
    text: "Sau khi chọn khóa học, anh/chị quét mã QR đúng số tiền và nội dung chuyển khoản hiển thị trên trang thanh toán.",
    visual: "QR thanh toán → Chờ hệ thống xác nhận",
    image: "/huong-dan/01-thanh-toan.webp",
    alt: "Màn hình thanh toán khóa học bằng mã QR",
  },
  {
    number: "02",
    title: "Kiểm tra email",
    text: "Mở Hộp thư đến (Inbox). Nếu chưa thấy email sau vài phút, kiểm tra thêm mục Spam, Thư rác hoặc Quảng cáo.",
    visual: "Email: Tài khoản học của anh/chị đã sẵn sàng",
    image: "/huong-dan/02-email-tai-khoan.webp",
    alt: "Email xác nhận thanh toán kèm tài khoản và mật khẩu học viên",
  },
  {
    number: "03",
    title: "Lấy tài khoản và Mật khẩu",
    text: "Trong email xác nhận có địa chỉ đăng nhập, email tài khoản và mật khẩu ban đầu. Không chia sẻ thông tin này cho người khác.",
    visual: "Tài khoản: email của anh/chị  •  Mật khẩu: ••••••••",
    image: "/huong-dan/03-dang-nhap.webp",
    alt: "Màn hình đăng nhập bằng email và mật khẩu nhận trong thư",
  },
  {
    number: "04",
    title: "Đăng nhập và vào khóa học",
    text: "Bấm nút đăng nhập trong email hoặc vào theanhmarketing.com/dang-nhap, nhập đúng tài khoản và mật khẩu rồi chọn khóa học đã sở hữu.",
    visual: "Đăng nhập → Dashboard → Vào phòng học",
    image: "/huong-dan/04-dashboard-khoa-hoc.webp",
    alt: "Dashboard học viên và nút vào khóa học",
  },
  {
    number: "05",
    title: "Đọc và tải ebook",
    text: "Trong Dashboard, mở khóa Ebook Facebook. Chọn Đọc online để xem ngay hoặc Tải PDF để lưu ebook về thiết bị.",
    visual: "Ebook Facebook → Đọc online  |  Tải PDF",
    image: "/huong-dan/05-ebook.webp",
    alt: "Khu vực ebook với nút đọc online và tải PDF",
  },
];

export default function CustomerGuidePage() {
  return (
    <PageShell showOfferPopup={false}>
      <section className="ai-shell pb-24 pt-32 sm:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <p className="ai-kicker">Hướng dẫn dành cho học viên</p>
          <h1 className="ai-glow-text mt-5 text-4xl font-black tracking-[-0.04em] sm:text-6xl">Từ thanh toán đến lúc vào học</h1>
          <p className="ai-muted mx-auto mt-5 max-w-2xl text-lg leading-8">Trang này xem công khai, không cần tài khoản. Anh/chị làm lần lượt theo 5 bước dưới đây.</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6">
          {steps.map((step) => (
            <article key={step.number} className="grid overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] md:grid-cols-[0.9fr_1.1fr]">
              <div className="p-7 sm:p-9">
                <span className="text-sm font-black text-[#75d79f]">BƯỚC {step.number}</span>
                <h2 className="mt-3 text-2xl font-black sm:text-3xl">{step.title}</h2>
                <p className="ai-muted mt-4 leading-7">{step.text}</p>
              </div>
              <div className="m-4 overflow-hidden rounded-[22px] border border-white/10 bg-[#12151b] shadow-2xl">
                <Image alt={step.alt} className="h-full min-h-56 w-full object-cover object-top" height={720} src={step.image} unoptimized width={1120} />
                <p className="border-t border-white/10 px-5 py-3 text-center text-sm font-bold text-white/75">{step.visual}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-5xl flex-col gap-3 rounded-[28px] bg-[#49b77a] p-7 text-[#07150e] sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xl font-black">Cần hỗ trợ trực tiếp?</p><p className="mt-1 text-sm font-semibold">Đặt lịch riêng để được tư vấn theo đúng nội dung anh/chị đang triển khai.</p></div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dang-nhap" className="rounded-full bg-white px-5 py-3 text-sm font-black text-black">Đăng nhập</Link>
            <Link href="/dat-lich-ho-tro" className="rounded-full bg-[#10241a] px-5 py-3 text-sm font-black text-white">Đặt lịch hỗ trợ</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
