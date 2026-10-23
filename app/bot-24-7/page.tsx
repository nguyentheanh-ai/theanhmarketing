import { BarChart3, CalendarClock, Clapperboard, Database, Globe, Lightbulb, MessagesSquare, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { Bot247BuyForm } from "@/components/bot247/bot247-buy-form";
import { PublicSectionHeading } from "@/components/marketing/public-section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Bot 24/7 · Đội ngũ trợ lý AI cho doanh nghiệp",
  description: "7 trợ lý AI chạy trên máy của bạn: chăm khách đa kênh, đăng bài, video, website, chiến lược và báo cáo quảng cáo. Bản quyền trọn đời 990.000đ.",
};

const bots = [
  { icon: MessagesSquare, title: "Chăm khách 24/7", text: "Trả lời Zalo, Messenger, Instagram, Telegram, web chat bằng tài liệu của bạn; chuyển người thật khi cần." },
  { icon: CalendarClock, title: "Dây chuyền nội dung", text: "Viết, lên lịch và đăng bài Facebook, Instagram, Threads, TikTok, X, YouTube." },
  { icon: Database, title: "Tri thức & dữ liệu", text: "Nối Google Drive, Notion, Sheets, thư mục máy; bot trả lời có dẫn nguồn." },
  { icon: Clapperboard, title: "Kịch bản & Reels", text: "Lên kịch bản, dựng video theo mẫu, cắt ghép, phụ đề tiếng Việt." },
  { icon: Globe, title: "Dựng web", text: "Dựng landing page từ mẫu, sửa theo yêu cầu, xem trước rồi mới đưa lên mạng." },
  { icon: Lightbulb, title: "Chiến lược marketing", text: "Kế hoạch 30–90 ngày, phân tích đối thủ, lịch nội dung." },
  { icon: BarChart3, title: "Báo cáo quảng cáo", text: "Báo cáo sáng Meta/Google/TikTok Ads, đề xuất tối ưu để bạn duyệt." },
];
const faqs: [string, string][] = [
  ["Bot 24/7 chạy ở đâu?", "Chạy trên máy của bạn (Mac chip Apple, Mac Intel hoặc Windows 10/11). Dữ liệu nằm trên máy bạn; có thể bật truy cập từ xa để dùng trên điện thoại."],
  ["Tôi cần chuẩn bị gì?", "Một máy tính để bật thường xuyên và một gói Claude hoặc ChatGPT của riêng bạn để làm \"bộ não\" AI. Gói Claude/ChatGPT không bao gồm trong giá Bot 24/7."],
  ["990.000đ là trả một lần?", "Đúng. Thanh toán một lần, dùng trọn đời trên máy đã kích hoạt; không phí hằng tháng từ The Anh Marketing."],
  ["Bao lâu thì nhận mã kích hoạt?", "Ngay khi chuyển khoản thành công, hệ thống tự gửi mã B247-… qua email bạn đăng ký. Mỗi mã dùng được 5 lần để cài lại máy."],
  ["Bot có tự đăng bài, tự tiêu tiền quảng cáo không?", "Không. Mọi việc tác động ra ngoài như đăng bài, đưa web lên mạng, thay đổi quảng cáo đều nằm ở mục Chờ duyệt cho tới khi bạn bấm duyệt."],
];

export default async function Bot247Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const paid = (await searchParams)?.paid === "1";
  return (
    <PageShell>
      <section className="tam-grid-bg pb-16 pt-28 sm:pb-20 sm:pt-36">
        <div className="tam-container grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <Reveal><span className="tam-pill">Bot 24/7 · bản quyền trọn đời</span></Reveal>
            <Reveal delay={70}><h1 className="mt-6 text-4xl font-black tracking-[-0.055em] text-[var(--tam-ink)] sm:text-6xl">Một đội trợ lý AI làm việc 24/7 cho doanh nghiệp của bạn</h1></Reveal>
            <Reveal delay={140}><p className="mt-6 max-w-xl text-base font-medium leading-8 text-[var(--tam-muted)] sm:text-lg">7 bot chuyên trách: chăm khách đa kênh, đăng bài, video, website, chiến lược và báo cáo quảng cáo. Chạy trên máy của bạn, dùng gói Claude hoặc ChatGPT bạn đang có — không mua API.</p></Reveal>
            <Reveal delay={200}><div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="#mua">Mua bản quyền 990.000đ</ButtonLink><ButtonLink href="#tinh-nang" variant="secondary">Xem 7 bot làm gì</ButtonLink></div></Reveal>
          </div>
          <Reveal delay={120}><figure className="overflow-hidden rounded-3xl border border-[var(--tam-line)] bg-white shadow-xl"><Image src="/bot247/home.jpg" alt="Bảng điều khiển Bot 24/7" width={1440} height={900} priority /><figcaption className="px-4 py-2 text-xs text-[var(--tam-muted)]">Minh họa giao diện với dữ liệu mẫu</figcaption></figure></Reveal>
        </div>
      </section>

      {paid ? <div className="tam-container -mt-6 mb-6"><p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-base font-bold text-emerald-800" role="status">Đã nhận thanh toán. Mã kích hoạt Bot 24/7 đã được gửi tới email của bạn — kiểm tra cả hộp thư Quảng cáo/Spam nếu chưa thấy.</p></div> : null}

      <section id="tinh-nang" className="tam-container py-20 sm:py-24">
        <PublicSectionHeading eyebrow="7 bot chuyên trách" title="Mỗi việc lặp lại có một bot lo" description="Bật bot nào cần dùng. Bot làm theo tài liệu và giọng thương hiệu của bạn." />
        <div className="tam-stagger mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {bots.map(({ icon: Icon, title, text }) => <article key={title} className="tam-card p-6"><Icon className="size-6 text-[var(--tam-ink)]" /><h3 className="mt-4 text-xl font-black tracking-[-0.03em] text-[var(--tam-ink)]">{title}</h3><p className="mt-2 text-sm font-medium leading-7 text-[var(--tam-muted)]">{text}</p></article>)}
          <article className="tam-card p-6"><ShieldCheck className="size-6 text-[var(--tam-ink)]" /><h3 className="mt-4 text-xl font-black tracking-[-0.03em] text-[var(--tam-ink)]">Bạn duyệt trước khi bot làm</h3><p className="mt-2 text-sm font-medium leading-7 text-[var(--tam-muted)]">Đăng bài, đưa web lên mạng, đổi quảng cáo đều chờ bạn bấm duyệt.</p></article>
        </div>
      </section>

      <section className="tam-container pb-20 sm:pb-24">
        <PublicSectionHeading eyebrow="Giao diện" title="Gọn, rõ, toàn tiếng Việt" description="Ảnh chụp giao diện thật, chạy với dữ liệu mẫu." />
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {[{ src: "/bot247/bot-cskh-chat.jpg", title: "Chăm khách: hỏi về khách cũ, bot tóm tắt từ lịch sử hội thoại" }, { src: "/bot247/approvals.jpg", title: "Chờ duyệt: bài đăng, thay đổi quảng cáo, web — bạn quyết định" }, { src: "/bot247/connections.jpg", title: "Kênh & dữ liệu: nối Zalo, Messenger, Instagram, Telegram…" }, { src: "/bot247/home.jpg", title: "Bảng điều khiển: cả đội bot và số liệu trong một màn hình" }].map((s) => <figure key={s.src} className="overflow-hidden rounded-3xl border border-[var(--tam-line)] bg-white"><Image src={s.src} alt={s.title} width={1440} height={900} /><figcaption className="px-5 py-3 text-sm font-semibold text-[var(--tam-muted)]">{s.title}</figcaption></figure>)}
        </div>
      </section>

      <section className="tam-container grid gap-10 pb-24 lg:grid-cols-[1fr_.9fr]">
        <div>
          <PublicSectionHeading eyebrow="Hỏi đáp" title="Trước khi mua" />
          <div className="mt-8 grid gap-3">{faqs.map(([q, a]) => <details key={q} className="tam-card p-5"><summary className="cursor-pointer text-base font-black text-[var(--tam-ink)]">{q}</summary><p className="mt-3 text-sm font-medium leading-7 text-[var(--tam-muted)]">{a}</p></details>)}</div>
        </div>
        <div className="lg:sticky lg:top-28 lg:self-start"><Bot247BuyForm /></div>
      </section>
    </PageShell>
  );
}
