"use client";

import Link from "next/link";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import type { Course } from "@/data/courses";

const navItems = [
  { label: "Khóa học", href: "#hero" },
  { label: "Nội dung học", href: "#lo-trinh" },
  { label: "Kết quả đầu ra", href: "#dau-ra" },
  { label: "Học phí", href: "#hoc-phi" },
  { label: "FAQ", href: "#faq" },
];

const stats = [
  { value: "2.000+", label: "học viên đã học cùng hệ sinh thái" },
  { value: "120+", label: "buổi đào tạo và workshop thực chiến" },
  { value: "80+", label: "dự án marketing từng triển khai/tư vấn" },
  { value: "4.8/5", label: "mức hài lòng từ học viên và khách hàng" },
];

const audiences = [
  ["Người mới học marketing", "Cần một lộ trình rõ ràng để hiểu khách hàng, nội dung, quảng cáo và cách dùng AI đúng chỗ."],
  ["Chủ doanh nghiệp nhỏ", "Muốn tự nắm cách làm marketing để không phụ thuộc hoàn toàn vào agency hoặc nhân sự bên ngoài."],
  ["Marketer muốn tăng tốc", "Đã làm marketing nhưng muốn dùng AI để research, viết, lên kế hoạch và tối ưu công việc nhanh hơn."],
  ["Người làm content/ads", "Cần quy trình rõ hơn để biến insight thành angle, thông điệp, landing page, email và quảng cáo."],
];

const skillGroups = [
  "Hiểu AI trong bối cảnh marketing, biết việc nào nên dùng AI và việc nào cần tư duy con người.",
  "Research khách hàng, thị trường, đối thủ và insight bằng AI theo quy trình có kiểm chứng.",
  "Xây dựng content angle, big idea và hệ thống thông điệp cho từng nhóm khách hàng.",
  "Viết quảng cáo, landing page, email và nội dung bán hàng theo insight thay vì viết cảm tính.",
  "Tạo workflow làm việc bằng AI để research, ideation, sản xuất và kiểm tra chất lượng đầu ra.",
  "Biết biên tập, phản biện và kiểm soát nội dung AI để không tạo ra nội dung chung chung.",
];

const lessons = [
  ["Buổi 1: AI trong marketing hiện đại", "Hiểu vai trò của AI trong quy trình marketing, những giới hạn cần biết và cách đặt mục tiêu học đúng.", "Có bản đồ năng lực AI Marketing cá nhân.", "Audit một quy trình marketing hiện tại và chọn điểm có thể cải thiện bằng AI."],
  ["Buổi 2: Research khách hàng bằng AI", "Học cách thu thập, phân nhóm và đọc insight khách hàng từ dữ liệu thô, review, bình luận và khảo sát.", "Tạo được chân dung khách hàng có insight dùng được.", "Xây bảng persona và pain point cho sản phẩm/dịch vụ của bạn."],
  ["Buổi 3: Thị trường, đối thủ và định vị", "Dùng AI để phân tích đối thủ, tìm khoảng trống thông điệp và xác định góc tiếp cận phù hợp.", "Có khung định vị và lợi thế truyền thông rõ hơn.", "Lập bảng so sánh đối thủ và đề xuất angle cạnh tranh."],
  ["Buổi 4: Big idea và content angle", "Biến insight thành ý tưởng nội dung, trụ cột nội dung và thông điệp nhất quán cho nhiều kênh.", "Có bộ angle nội dung theo từng nhóm khách hàng.", "Xây content map 30 ngày cho một chiến dịch cụ thể."],
  ["Buổi 5: Viết quảng cáo và landing page", "Học cách dùng AI để viết headline, ads, email, landing page nhưng vẫn giữ logic bán hàng và giọng thương hiệu.", "Có bản nháp nội dung bán hàng có thể chỉnh và dùng ngay.", "Viết một landing page ngắn hoặc bộ ads theo insight đã research."],
  ["Buổi 6: Workflow sản xuất nội dung", "Thiết kế quy trình từ research đến viết nháp, biên tập, kiểm tra và tái sử dụng nội dung.", "Có workflow làm việc lặp lại được cho cá nhân hoặc team.", "Tạo checklist sản xuất nội dung bằng AI cho tuần làm việc."],
  ["Buổi 7: Kiểm soát chất lượng đầu ra", "Biết cách phản biện nội dung AI, phát hiện lỗi, giảm sáo rỗng và đảm bảo nội dung phù hợp mục tiêu.", "Có bộ tiêu chí kiểm tra nội dung trước khi xuất bản.", "Chỉnh sửa một nội dung AI từ bản nháp thành bản có thể dùng."],
  ["Buổi 8: Ứng dụng vào kế hoạch thực tế", "Tổng hợp toàn bộ quy trình thành một kế hoạch marketing ứng dụng cho sản phẩm/dịch vụ thật.", "Hoàn thiện một mini marketing plan có research, angle, nội dung và workflow.", "Nộp bản kế hoạch 30 ngày và checklist triển khai."],
];

const differences = [
  "Học theo tình huống thực tế, không học prompt rời rạc.",
  "Có framework để tự làm, không phụ thuộc template có sẵn.",
  "Tập trung vào đầu ra dùng được trong công việc.",
  "Phù hợp với người không biết kỹ thuật.",
];

const outcomes = [
  "Tự tạo chân dung khách hàng và đọc insight rõ hơn.",
  "Lên kế hoạch nội dung 30 ngày có logic.",
  "Viết landing page, email, ads theo đúng insight.",
  "Xây workflow research và ideation bằng AI.",
  "Dùng AI như trợ lý marketing, không chỉ là công cụ hỏi đáp.",
];

const benefits = [
  "Video bài giảng hoặc học live tùy cấu hình lớp.",
  "Template thực hành và checklist triển khai.",
  "Bài tập ứng dụng theo sản phẩm/dự án thật.",
  "Cộng đồng và hỗ trợ trong quá trình học.",
  "Cập nhật nội dung khi công cụ AI thay đổi.",
  "Có thể bổ sung chứng nhận hoàn thành khi vận hành lớp chính thức.",
];

const faqs = [
  ["Người mới có học được không?", "Có. Khóa học bắt đầu từ tư duy marketing nền tảng rồi mới đi vào cách dùng AI trong từng bước công việc."],
  ["Có cần biết kỹ thuật không?", "Không. Bạn chỉ cần biết dùng máy tính cơ bản và sẵn sàng thực hành với sản phẩm hoặc dự án của mình."],
  ["Khóa học khác gì học prompt miễn phí?", "Prompt chỉ là một phần nhỏ. Khóa học tập trung vào tư duy marketing, quy trình làm việc và cách kiểm soát chất lượng đầu ra."],
  ["Có bài tập thực hành không?", "Có. Mỗi buổi đều có bài thực hành để biến nội dung học thành tài sản dùng được trong công việc."],
  ["Có được cập nhật nội dung không?", "Có. Nội dung có thể được cập nhật khi công cụ AI và cách ứng dụng thay đổi."],
  ["Học xong có ứng dụng được ngay không?", "Có, nếu bạn làm bài tập theo sản phẩm hoặc dự án thật trong quá trình học."],
  ["Có phù hợp cho chủ doanh nghiệp không?", "Phù hợp, đặc biệt với chủ doanh nghiệp nhỏ muốn hiểu marketing và tự kiểm soát quy trình làm việc."],
  ["Học online hay offline?", "Tùy cấu hình lớp. Có thể học qua video, live online hoặc lớp triển khai riêng cho team."],
];

export function AiMarketingSalesPage({ course }: { course: Course }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(true);
  const [openLesson, setOpenLesson] = useState(0);

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#111111]">
      <header className="sticky top-0 z-50 border-b-2 border-black bg-[#fbfaf7]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-lg font-black tracking-[-0.04em]">
            Thế Anh Marketing<span className="text-[#b45f22]">.</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-bold text-black/62 lg:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-black">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <ButtonLink href="/dang-ky">Đăng ký tư vấn</ButtonLink>
          </div>
          <button
            className="grid size-11 place-items-center rounded-full border-2 border-black bg-white text-xl font-black lg:hidden"
            type="button"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? "×" : "☰"}
          </button>
        </div>
        {isMenuOpen ? (
          <nav className="grid gap-2 border-t-2 border-black bg-[#fbfaf7] px-5 py-4 text-sm font-bold lg:hidden">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="rounded-2xl bg-white px-4 py-3" onClick={() => setIsMenuOpen(false)}>
                {item.label}
              </a>
            ))}
            <ButtonLink href="/dang-ky" className="mt-2">Đăng ký tư vấn</ButtonLink>
          </nav>
        ) : null}
      </header>

      <section id="hero" className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
        <div>
          <p className="inline-flex rounded-full border-2 border-black bg-[#f4e0c7] px-4 py-2 text-sm font-black text-[#8d4318]">
            Khóa học AI Marketing 2026
          </p>
          <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">
            Dùng AI để nghiên cứu khách hàng, viết quảng cáo và xây workflow marketing.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-9 text-black/68">
            Khóa học giúp bạn hiểu cách đưa AI vào công việc marketing hằng ngày:
            từ research, lên chiến lược nội dung, viết thông điệp đến kiểm tra chất
            lượng đầu ra. Không chạy theo mẹo lẻ, mà xây một quy trình có thể lặp lại.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dang-ky">Đăng ký tư vấn</ButtonLink>
            <ButtonLink href="#lo-trinh" variant="secondary">Xem lộ trình học</ButtonLink>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {["8 buổi học", "Video/live tùy lớp", "Người mới, chủ shop, marketer", "Có kế hoạch 30 ngày"].map((item) => (
              <div key={item} className="rounded-2xl border-2 border-black bg-white p-4 text-sm font-black">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.75rem] border-2 border-black bg-white p-5 shadow-[10px_10px_0_#111]">
          <div className="rounded-2xl bg-[#111111] p-5 text-white">
            <p className="text-sm font-bold text-[#f4b56f]">Marketing workflow dashboard</p>
            <div className="mt-5 grid gap-3">
              {["Customer research", "Content angle", "Ads copy", "Quality check"].map((item, index) => (
                <div key={item} className="rounded-2xl bg-white p-4 text-black">
                  <div className="flex items-center justify-between">
                    <p className="font-black">{item}</p>
                    <span className="rounded-full bg-[#f4e0c7] px-3 py-1 text-xs font-black text-[#8d4318]">
                      Step {index + 1}
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-black/10">
                    <div className="h-full rounded-full bg-[#b45f22]" style={{ width: `${55 + index * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Section id="proof" eyebrow="Social proof" title="Những con số vừa đủ để bạn hình dung năng lực triển khai.">
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((item) => (
            <Card key={item.label}>
              <p className="text-4xl font-black tracking-[-0.05em] text-[#b45f22]">{item.value}</p>
              <p className="mt-3 text-sm font-bold leading-6 text-black/62">{item.label}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="doi-tuong" eyebrow="Phù hợp với ai" title="Khóa học này dành cho người muốn dùng AI vào việc thật.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {audiences.map(([title, desc]) => <Card key={title} title={title}>{desc}</Card>)}
        </div>
      </Section>

      <Section id="noi-dung" eyebrow="Bạn sẽ học được gì" title="Học theo nhóm năng lực, không học theo danh sách công cụ.">
        <div className="grid gap-3 md:grid-cols-2">
          {skillGroups.map((item, index) => (
            <div key={item} className="flex gap-4 rounded-2xl border-2 border-black bg-white p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-black text-sm font-black text-white">{index + 1}</span>
              <p className="leading-7 text-black/68">{item}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="lo-trinh" eyebrow="Lộ trình" title="8 buổi học mẫu, đi từ tư duy đến kế hoạch triển khai.">
        <div className="grid gap-3">
          {lessons.map(([title, desc, result, practice], index) => (
            <div key={title} className="rounded-2xl border-2 border-black bg-white">
              <button
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
                type="button"
                onClick={() => setOpenLesson(openLesson === index ? -1 : index)}
              >
                <span className="text-xl font-black tracking-[-0.03em]">{title}</span>
                <span className="text-2xl font-black">{openLesson === index ? "−" : "+"}</span>
              </button>
              {openLesson === index ? (
                <div className="grid gap-4 border-t-2 border-black p-5 text-sm leading-7 text-black/68 md:grid-cols-3">
                  <p>{desc}</p>
                  <p><strong className="text-black">Kết quả:</strong> {result}</p>
                  <p><strong className="text-black">Thực hành:</strong> {practice}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section id="khac-biet" eyebrow="Khác biệt" title="Không dạy prompt rời rạc, mà dạy marketing + quy trình ứng dụng AI.">
        <div className="grid gap-4 md:grid-cols-4">
          {differences.map((item) => <Card key={item}>{item}</Card>)}
        </div>
      </Section>

      <Section id="dau-ra" eyebrow="Sau khóa học" title="Bạn có thể biến AI thành trợ lý marketing có quy trình.">
        <div className="grid gap-3 md:grid-cols-2">
          {outcomes.map((item) => (
            <div key={item} className="rounded-2xl border-2 border-black bg-[#f4e0c7] p-5 font-bold leading-7">
              {item}
            </div>
          ))}
        </div>
      </Section>

      <Section id="quyen-loi" eyebrow="Quyền lợi học viên" title="Những gì đi cùng khóa học.">
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((item) => <Card key={item}>{item}</Card>)}
        </div>
      </Section>

      <Section id="hoc-phi" eyebrow="Học phí" title="Một gói học rõ ràng, không dùng countdown ảo.">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <Card>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#b45f22]">AI Marketing 2026</p>
            <p className="mt-4 text-5xl font-black tracking-[-0.05em]">{course.price}</p>
            {course.originalPrice ? <p className="mt-2 text-lg font-bold text-black/42 line-through">{course.originalPrice}</p> : null}
            <div className="mt-6 grid gap-3 text-sm font-bold text-black/68">
              {["Toàn bộ bài học và tài liệu", "Template thực hành", "Bài tập ứng dụng", "Cập nhật nội dung khi cần"].map((item) => <p key={item}>• {item}</p>)}
            </div>
            <ButtonLink href="/dang-ky" className="mt-8 w-full">Đăng ký tư vấn</ButtonLink>
          </Card>
          <Card title="Giảng viên: Thế Anh Marketing">
            Thế Anh Marketing tập trung vào đào tạo marketing theo hướng thực chiến:
            dễ hiểu, có quy trình, có ví dụ gần với công việc thật. Khóa học được
            thiết kế để người học không chỉ biết dùng công cụ, mà biết biến kiến thức
            thành hệ thống làm việc có thể lặp lại.
          </Card>
        </div>
      </Section>

      <Section id="faq" eyebrow="FAQ" title="Câu hỏi thường gặp.">
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map(([question, answer]) => <Card key={question} title={question}>{answer}</Card>)}
        </div>
      </Section>

      <footer className="border-t-2 border-black px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 text-sm font-bold text-black/62 md:flex-row md:items-center md:justify-between">
          <p><span className="text-black">Thế Anh Marketing.</span> Học marketing thực chiến, ứng dụng AI có quy trình.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/khoa-hoc">Khóa học</Link>
            <Link href="/lien-he">Liên hệ</Link>
            <Link href="/lien-he">Chính sách</Link>
            <a href="https://facebook.com" rel="noreferrer" target="_blank">Facebook</a>
            <a href="https://tiktok.com" rel="noreferrer" target="_blank">TikTok</a>
          </div>
        </div>
      </footer>

      <OfferPopup isOpen={isOfferOpen} onToggle={() => setIsOfferOpen((current) => !current)} />
    </main>
  );
}

function Section({ children, eyebrow, id, title }: { children: React.ReactNode; eyebrow: string; id: string; title: string }) {
  return (
    <section id={id} className="mx-auto max-w-[1440px] scroll-mt-28 px-5 py-16 sm:px-8">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#b45f22]">{eyebrow}</p>
      <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-[-0.045em] sm:text-6xl">{title}</h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-2xl border-2 border-black bg-white p-5">
      {title ? <h3 className="mb-3 text-xl font-black tracking-[-0.03em]">{title}</h3> : null}
      <div className="leading-7 text-black/68">{children}</div>
    </div>
  );
}

function OfferPopup({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  if (!isOpen) {
    return (
      <button
        className="fixed bottom-6 left-5 z-50 rounded-full border-2 border-black bg-[#f4e0c7] px-5 py-3 text-sm font-black shadow-[6px_6px_0_#111]"
        type="button"
        onClick={onToggle}
      >
        Ưu đãi
      </button>
    );
  }

  return (
    <aside className="fixed bottom-5 left-5 z-50 w-[min(380px,calc(100vw-2.5rem))] rounded-3xl border-2 border-black bg-white p-4 shadow-[8px_8px_0_#111]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-black tracking-[-0.04em]">Ưu đãi dành cho bạn</p>
          <p className="mt-1 text-sm font-semibold text-black/55">Nhận tư vấn lộ trình và tài liệu AI Marketing.</p>
        </div>
        <button className="text-2xl font-black" type="button" onClick={onToggle}>×</button>
      </div>
      <div className="mt-4 grid gap-3">
        {["Tặng checklist research khách hàng bằng AI", "Tặng template kế hoạch nội dung 30 ngày", "Tư vấn chọn lộ trình phù hợp"].map((item) => (
          <div key={item} className="rounded-2xl border border-black/10 bg-[#fbfaf7] p-3">
            <p className="text-sm font-bold">{item}</p>
            <ButtonLink href="/dang-ky" size="sm" className="mt-3">Nhận ưu đãi</ButtonLink>
          </div>
        ))}
      </div>
    </aside>
  );
}
