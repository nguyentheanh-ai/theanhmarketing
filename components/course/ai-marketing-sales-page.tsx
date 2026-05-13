"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ButtonLink } from "@/components/ui/button-link";
import { SiteOfferPopup } from "@/components/site/offer-popup";
import type { Course } from "@/data/courses";
import type { OfferSettings } from "@/services/offerService";

const navItems = [
  { label: "Khóa học", href: "#hero" },
  { label: "Nội dung học", href: "#lo-trinh" },
  { label: "Kết quả đầu ra", href: "#dau-ra" },
  { label: "Học phí", href: "#hoc-phi" },
  { label: "FAQ", href: "#faq" },
];

type LessonPlan = {
  title: string;
  description: string;
  result: string;
  practice: string;
};

type LandingContent = {
  badge: string;
  headline: string;
  subheadline: string;
  quickInfo: string[];
  audiences: [string, string][];
  skillGroups: string[];
  lessons: LessonPlan[];
  differences: string[];
  outcomes: string[];
  benefits: string[];
  faqs: [string, string][];
  instructorCopy: string;
  dashboardTitle: string;
};

const aiLessons: LessonPlan[] = [
  {
    title: "Buổi 1: AI trong marketing hiện đại",
    description:
      "Hiểu vai trò của AI trong quy trình marketing, những giới hạn cần biết và cách đặt mục tiêu học đúng.",
    result: "Có bản đồ năng lực AI Marketing cá nhân.",
    practice: "Audit một quy trình marketing hiện tại và chọn điểm có thể cải thiện bằng AI.",
  },
  {
    title: "Buổi 2: Research khách hàng bằng AI",
    description:
      "Học cách thu thập, phân nhóm và đọc insight khách hàng từ dữ liệu thô, review, bình luận và khảo sát.",
    result: "Tạo được chân dung khách hàng có insight dùng được.",
    practice: "Xây bảng persona và pain point cho sản phẩm hoặc dịch vụ của bạn.",
  },
  {
    title: "Buổi 3: Thị trường, đối thủ và định vị",
    description:
      "Dùng AI để phân tích đối thủ, tìm khoảng trống thông điệp và xác định góc tiếp cận phù hợp.",
    result: "Có khung định vị và lợi thế truyền thông rõ hơn.",
    practice: "Lập bảng so sánh đối thủ và đề xuất angle cạnh tranh.",
  },
  {
    title: "Buổi 4: Big idea và content angle",
    description:
      "Biến insight thành ý tưởng nội dung, trụ cột nội dung và thông điệp nhất quán cho nhiều kênh.",
    result: "Có bộ angle nội dung theo từng nhóm khách hàng.",
    practice: "Xây content map 30 ngày cho một chiến dịch cụ thể.",
  },
  {
    title: "Buổi 5: Viết quảng cáo và landing page",
    description:
      "Dùng AI để viết headline, ads, email, landing page nhưng vẫn giữ logic bán hàng và giọng thương hiệu.",
    result: "Có bản nháp nội dung bán hàng có thể chỉnh và dùng ngay.",
    practice: "Viết một landing page ngắn hoặc bộ ads theo insight đã research.",
  },
  {
    title: "Buổi 6: Workflow sản xuất nội dung",
    description:
      "Thiết kế quy trình từ research đến viết nháp, biên tập, kiểm tra và tái sử dụng nội dung.",
    result: "Có workflow làm việc lặp lại được cho cá nhân hoặc team.",
    practice: "Tạo checklist sản xuất nội dung bằng AI cho tuần làm việc.",
  },
  {
    title: "Buổi 7: Kiểm soát chất lượng đầu ra",
    description:
      "Biết cách phản biện nội dung AI, phát hiện lỗi, giảm sáo rỗng và đảm bảo nội dung phù hợp mục tiêu.",
    result: "Có bộ tiêu chí kiểm tra nội dung trước khi xuất bản.",
    practice: "Chỉnh sửa một nội dung AI từ bản nháp thành bản có thể dùng.",
  },
  {
    title: "Buổi 8: Ứng dụng vào kế hoạch thực tế",
    description:
      "Tổng hợp toàn bộ quy trình thành một kế hoạch marketing ứng dụng cho sản phẩm hoặc dịch vụ thật.",
    result: "Hoàn thiện một mini marketing plan có research, angle, nội dung và workflow.",
    practice: "Nộp bản kế hoạch 30 ngày và checklist triển khai.",
  },
];

const defaultAudiences: [string, string][] = [
  [
    "Người mới muốn học bài bản",
    "Cần một lộ trình rõ ràng để hiểu nền tảng, biết phải làm gì trước và tránh học theo các mẹo rời rạc.",
  ],
  [
    "Chủ doanh nghiệp nhỏ",
    "Muốn tự nắm cách triển khai để kiểm soát chất lượng marketing, chi phí và hiệu quả thực tế.",
  ],
  [
    "Marketer muốn tăng tốc",
    "Đã làm marketing nhưng muốn hệ thống lại quy trình, ra quyết định dựa trên dữ liệu và làm nhanh hơn.",
  ],
  [
    "Người làm content, ads hoặc sales",
    "Cần biến insight thành thông điệp, nội dung, chiến dịch và hành động cụ thể hơn trong công việc.",
  ],
];

const defaultDifferences = [
  "Học theo tình huống thực tế, không học mẹo rời rạc.",
  "Có framework để tự làm, không phụ thuộc template có sẵn.",
  "Tập trung vào đầu ra dùng được trong công việc.",
  "Phù hợp với người không biết kỹ thuật hoặc chưa có nền tảng sâu.",
];

const defaultBenefits = [
  "Video bài giảng hoặc học live tùy cấu hình lớp.",
  "Template thực hành và checklist triển khai.",
  "Bài tập ứng dụng theo sản phẩm hoặc dự án thật.",
  "Cộng đồng và hỗ trợ trong quá trình học.",
  "Cập nhật nội dung khi công cụ và thị trường thay đổi.",
  "Có thể bổ sung chứng nhận hoàn thành khi vận hành lớp chính thức.",
];

function compactList(items: string[], fallback: string[], max = 6) {
  const list = [...items, ...fallback].filter(Boolean);
  return Array.from(new Set(list)).slice(0, max);
}

function buildLessons(course: Course, isAiCourse: boolean): LessonPlan[] {
  if (isAiCourse) {
    return aiLessons;
  }

  const moduleLessons = course.modules
    .flatMap((module, moduleIndex) =>
      module.lessons.map((lesson, lessonIndex) => ({
        title: `Buổi ${moduleIndex + lessonIndex + 1}: ${lesson.title}`,
        description:
          module.description ||
          "Đi vào một phần quan trọng trong quy trình triển khai, có ví dụ và cách áp dụng vào công việc thật.",
        result: `Hiểu và áp dụng được phần "${module.title}" vào bối cảnh của bạn.`,
        practice: "Hoàn thành một checklist hoặc bản nháp triển khai để dùng lại sau buổi học.",
      })),
    )
    .slice(0, 8);

  if (moduleLessons.length >= 4) {
    return moduleLessons;
  }

  return [
    {
      title: `Buổi 1: Nền tảng ${course.title}`,
      description: "Làm rõ vai trò của khóa học, các khái niệm cần nắm và cách học để tạo ra đầu ra thực tế.",
      result: "Có bản đồ kiến thức và mục tiêu học tập rõ ràng.",
      practice: "Audit tình trạng hiện tại của sản phẩm, dự án hoặc kỹ năng cá nhân.",
    },
    {
      title: "Buổi 2: Khách hàng, thị trường và mục tiêu",
      description: "Học cách đọc bối cảnh, xác định nhóm khách hàng và ưu tiên vấn đề cần giải quyết.",
      result: "Có chân dung khách hàng và mục tiêu triển khai cụ thể.",
      practice: "Viết một bản phân tích ngắn cho sản phẩm hoặc dự án thật.",
    },
    {
      title: "Buổi 3: Quy trình triển khai từng bước",
      description: "Biến kiến thức thành quy trình làm việc có thứ tự, tránh nhảy bước và giảm sai sót.",
      result: "Có checklist triển khai dùng được sau khóa học.",
      practice: "Xây một workflow ngắn cho tuần làm việc đầu tiên.",
    },
    {
      title: "Buổi 4: Tối ưu và đo lường",
      description: "Biết nhìn vào dữ liệu, phản hồi và kết quả để điều chỉnh thay vì làm theo cảm tính.",
      result: "Có bộ tiêu chí đánh giá hiệu quả.",
      practice: "Tạo bảng theo dõi kết quả và đề xuất hướng tối ưu.",
    },
    {
      title: "Buổi 5: Ứng dụng vào dự án thật",
      description: "Tổng hợp kiến thức thành một bản kế hoạch có thể triển khai ngay sau khóa học.",
      result: "Hoàn thiện bản kế hoạch hành động cá nhân.",
      practice: "Nộp kế hoạch triển khai và checklist kiểm tra chất lượng.",
    },
    ...moduleLessons,
  ].slice(0, 8);
}

function buildLandingContent(course: Course): LandingContent {
  const isAiCourse = course.slug.includes("ai") || course.title.toLowerCase().includes("ai");
  const lessons = buildLessons(course, isAiCourse);
  const skillFallback = isAiCourse
    ? [
        "Hiểu AI trong bối cảnh marketing, biết việc nào nên dùng AI và việc nào cần tư duy con người.",
        "Research khách hàng, thị trường, đối thủ và insight bằng AI theo quy trình có kiểm chứng.",
        "Xây dựng content angle, big idea và hệ thống thông điệp cho từng nhóm khách hàng.",
        "Viết quảng cáo, landing page, email và nội dung bán hàng theo insight thay vì viết cảm tính.",
        "Tạo workflow làm việc bằng AI để research, ideation, sản xuất và kiểm tra chất lượng đầu ra.",
        "Biết biên tập, phản biện và kiểm soát nội dung AI để tránh nội dung chung chung.",
      ]
    : [
        `Hiểu nền tảng của ${course.title} theo cách dễ áp dụng vào công việc thật.`,
        "Biết research khách hàng, thị trường và bối cảnh trước khi triển khai.",
        "Xây được quy trình làm việc rõ ràng, có checklist và tiêu chí kiểm tra.",
        "Biết đọc phản hồi, dữ liệu và kết quả để tối ưu thay vì làm theo cảm tính.",
        "Tạo được đầu ra cụ thể: kế hoạch, nội dung, chiến dịch hoặc workflow theo mục tiêu khóa học.",
        "Biết tự học tiếp và điều chỉnh khi công cụ hoặc thị trường thay đổi.",
      ];

  const outcomesFallback = isAiCourse
    ? [
        "Tự tạo chân dung khách hàng và đọc insight rõ hơn.",
        "Lên kế hoạch nội dung 30 ngày có logic.",
        "Viết landing page, email, ads theo đúng insight.",
        "Xây workflow research và ideation bằng AI.",
        "Dùng AI như trợ lý marketing, không chỉ là công cụ hỏi đáp.",
      ]
    : [
        `Tự triển khai các bước quan trọng của ${course.title}.`,
        "Biết lập kế hoạch 30 ngày rõ việc, rõ mục tiêu.",
        "Có checklist để kiểm tra chất lượng trước khi chạy thật.",
        "Biết tối ưu dựa trên dữ liệu và phản hồi thực tế.",
        "Tự tin biến kiến thức đã học thành quy trình làm việc lặp lại được.",
      ];

  return {
    badge: isAiCourse ? "Khóa học AI Marketing 2026" : course.eyebrow || "Khóa học thực chiến 2026",
    headline: isAiCourse
      ? "Dùng AI để nghiên cứu khách hàng, viết quảng cáo và xây workflow marketing."
      : `${course.title}: học theo quy trình thực chiến, làm được việc ngay sau từng buổi.`,
    subheadline:
      course.description ||
      "Khóa học được thiết kế để bạn không chỉ hiểu lý thuyết, mà còn biết biến kiến thức thành kế hoạch, checklist và đầu ra dùng được trong công việc thật.",
    quickInfo: [
      course.duration || `${lessons.length} buổi học`,
      course.format || "Video hoặc live tùy lớp",
      course.level || "Người mới đến thực chiến",
      course.outcomes[0] ? "Có đầu ra sau khóa học" : "Có kế hoạch hành động",
    ],
    audiences: course.audience.length
      ? course.audience.slice(0, 4).map((item, index) => [defaultAudiences[index]?.[0] ?? "Học viên phù hợp", item])
      : defaultAudiences,
    skillGroups: compactList(course.outcomes, skillFallback, 6),
    lessons,
    differences: defaultDifferences,
    outcomes: compactList(course.outcomes, outcomesFallback, 5),
    benefits: compactList([...course.benefits, ...course.includes], defaultBenefits, 6),
    faqs: [
      ["Người mới có học được không?", "Có. Nội dung đi từ nền tảng đến thực hành, phù hợp nếu bạn sẵn sàng làm bài tập theo dự án thật."],
      ["Có cần biết kỹ thuật không?", "Không. Những phần kỹ thuật nếu có sẽ được giải thích theo quy trình dễ làm, ưu tiên ứng dụng thay vì thuật ngữ."],
      [
        `Khóa ${course.title} khác gì học miễn phí?`,
        "Điểm khác biệt là lộ trình có thứ tự, có bài thực hành, có checklist và tập trung vào đầu ra dùng được trong công việc.",
      ],
      ["Có bài tập thực hành không?", "Có. Mỗi phần học đều hướng về một bài thực hành hoặc bản nháp triển khai để bạn không học xong rồi để đó."],
      ["Có được cập nhật nội dung không?", "Có. Nội dung có thể được cập nhật khi công cụ, nền tảng hoặc cách triển khai trên thị trường thay đổi."],
      ["Học xong có ứng dụng được ngay không?", "Có, nếu bạn làm theo bài tập trên sản phẩm, dự án hoặc công việc thật của mình trong quá trình học."],
      ["Có phù hợp cho chủ doanh nghiệp không?", "Phù hợp, đặc biệt nếu bạn muốn hiểu quy trình để tự kiểm soát marketing và phối hợp tốt hơn với nhân sự hoặc agency."],
      ["Học online hay offline?", `Hình thức hiện tại: ${course.format || "video bài giảng hoặc live tùy cấu hình lớp"}.`],
    ],
    instructorCopy:
      course.instructor?.bio ||
      "Thế Anh Marketing tập trung vào đào tạo marketing theo hướng thực chiến: dễ hiểu, có quy trình, có ví dụ gần với công việc thật. Khóa học được thiết kế để người học biến kiến thức thành hệ thống làm việc có thể lặp lại.",
    dashboardTitle: isAiCourse ? "Marketing workflow dashboard" : "Course operating dashboard",
  };
}

export function CourseSalesPage({ course, offer }: { course: Course; offer: OfferSettings }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openLesson, setOpenLesson] = useState(0);
  const content = useMemo(() => buildLandingContent(course), [course]);

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#111111]">
      <header className="sticky top-0 z-50 border-b-2 border-black bg-[#fbfaf7]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="motion-lift text-lg font-black tracking-[-0.04em]">
            Thế Anh Marketing<span className="text-[#2f8f62]">.</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-bold text-black/62 lg:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="motion-lift transition hover:text-[#2f8f62]">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <ButtonLink href="/dang-ky">Đăng ký tư vấn</ButtonLink>
          </div>
          <button
            className="grid size-12 place-items-center rounded-full border-2 border-black bg-white text-2xl font-black shadow-[4px_4px_0_#111] lg:hidden"
            type="button"
            aria-expanded={isMenuOpen}
            aria-label="Mở menu khóa học"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? "×" : "☰"}
          </button>
        </div>
        {isMenuOpen ? (
          <nav className="grid gap-2 border-t-2 border-black bg-[#fbfaf7] px-5 py-4 text-sm font-bold lg:hidden">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="motion-card rounded-2xl border-2 border-black bg-white px-4 py-3"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <ButtonLink href="/dang-ky" className="mt-2">
              Đăng ký tư vấn
            </ButtonLink>
          </nav>
        ) : null}
      </header>

      <section
        id="hero"
        className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24"
      >
        <div>
          <p className="hero-badge inline-flex rounded-full border-2 border-black bg-[#e7f3df] px-4 py-2 text-sm font-black text-[#2f6f4d]">
            {content.badge}
          </p>
          <h1 className="hero-title mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">
            {content.headline}
          </h1>
          <p className="hero-copy mt-7 max-w-2xl text-lg leading-9 text-black/68">{content.subheadline}</p>
          <div className="hero-actions mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dang-ky">Đăng ký tư vấn</ButtonLink>
            <ButtonLink href="#lo-trinh" variant="secondary">
              Xem lộ trình học
            </ButtonLink>
          </div>
          <div className="hero-stats mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {content.quickInfo.map((item) => (
              <div key={item} className="motion-card rounded-2xl border-2 border-black bg-white p-4 text-sm font-black">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="course-dashboard-pulse rounded-[1.75rem] border-2 border-black bg-white p-5 shadow-[10px_10px_0_#111]">
          <div className="rounded-2xl bg-[#111111] p-5 text-white">
            <p className="text-sm font-bold text-[#85d49b]">{content.dashboardTitle}</p>
            <div className="mt-5 grid gap-3">
              {["Research", "Message", "Workflow", "Quality"].map((item, index) => (
                <div key={item} className="motion-card rounded-2xl border border-white/10 bg-white p-4 text-black">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-black">{item}</p>
                    <span className="rounded-full bg-[#e7f3df] px-3 py-1 text-xs font-black text-[#2f6f4d]">
                      Step {index + 1}
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-black/10">
                    <div className="h-full rounded-full bg-[#2f8f62]" style={{ width: `${55 + index * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Section id="proof" eyebrow="Social proof" title="Những con số vừa đủ để bạn hình dung năng lực triển khai.">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { value: 2000, suffix: "+", label: "học viên đã học cùng hệ sinh thái" },
            { value: 120, suffix: "+", label: "buổi đào tạo và workshop thực chiến" },
            { value: 80, suffix: "+", label: "dự án marketing từng triển khai hoặc tư vấn" },
            { value: 4.8, suffix: "/5", label: "mức độ hài lòng từ học viên và khách hàng", decimals: 1 },
          ].map((item) => (
            <Card key={item.label}>
              <p className="text-4xl font-black tracking-[-0.05em] text-[#2f8f62]">
                <AnimatedNumber value={item.value} suffix={item.suffix} decimals={item.decimals ?? 0} />
              </p>
              <p className="mt-3 text-sm font-bold leading-6 text-black/62">{item.label}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="doi-tuong" eyebrow="Phù hợp với ai" title="Khóa học này dành cho người muốn học gọn, hiểu đúng và làm được việc thật.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {content.audiences.map(([title, desc]) => (
            <Card key={title} title={title}>
              {desc}
            </Card>
          ))}
        </div>
      </Section>

      <Section id="noi-dung" eyebrow="Bạn sẽ học được gì" title="Học theo nhóm năng lực, không chỉ học theo danh sách công cụ.">
        <div className="grid gap-3 md:grid-cols-2">
          {content.skillGroups.map((item, index) => (
            <div key={item} className="motion-card flex gap-4 rounded-2xl border-2 border-black bg-white p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2f8f62] text-sm font-black text-white">
                {index + 1}
              </span>
              <p className="leading-7 text-black/68">{item}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="lo-trinh" eyebrow="Lộ trình" title={`${content.lessons.length} buổi học mẫu, đi từ nền tảng đến kế hoạch triển khai.`}>
        <div className="grid gap-3">
          {content.lessons.map((lesson, index) => (
            <div key={`${lesson.title}-${index}`} className="motion-card rounded-2xl border-2 border-black bg-white">
              <button
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
                type="button"
                onClick={() => setOpenLesson(openLesson === index ? -1 : index)}
              >
                <span className="text-xl font-black tracking-[-0.03em]">{lesson.title}</span>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e7f3df] text-2xl font-black text-[#2f6f4d]">
                  {openLesson === index ? "−" : "+"}
                </span>
              </button>
              {openLesson === index ? (
                <div className="grid gap-4 border-t-2 border-black p-5 text-sm leading-7 text-black/68 md:grid-cols-3">
                  <p>{lesson.description}</p>
                  <p>
                    <strong className="text-black">Kết quả:</strong> {lesson.result}
                  </p>
                  <p>
                    <strong className="text-black">Thực hành:</strong> {lesson.practice}
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section id="khac-biet" eyebrow="Khác biệt" title="Không dạy mẹo rời rạc, mà dạy tư duy và quy trình ứng dụng.">
        <div className="grid gap-4 md:grid-cols-4">
          {content.differences.map((item) => (
            <Card key={item}>{item}</Card>
          ))}
        </div>
      </Section>

      <Section id="dau-ra" eyebrow="Sau khóa học" title="Bạn có thể biến kiến thức thành hệ thống làm việc rõ ràng hơn.">
        <div className="grid gap-3 md:grid-cols-2">
          {content.outcomes.map((item) => (
            <div key={item} className="motion-card rounded-2xl border-2 border-black bg-[#e7f3df] p-5 font-bold leading-7">
              {item}
            </div>
          ))}
        </div>
      </Section>

      <Section id="quyen-loi" eyebrow="Quyền lợi học viên" title="Những gì đi cùng khóa học.">
        <div className="grid gap-4 md:grid-cols-3">
          {content.benefits.map((item) => (
            <Card key={item}>{item}</Card>
          ))}
        </div>
      </Section>

      <Section id="hoc-phi" eyebrow="Học phí" title="Một gói học rõ ràng, không dùng countdown ảo.">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <Card>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#2f8f62]">{course.title}</p>
            <p className="mt-4 text-5xl font-black tracking-[-0.05em]">{course.price}</p>
            {course.originalPrice ? <p className="mt-2 text-lg font-bold text-black/42 line-through">{course.originalPrice}</p> : null}
            <div className="mt-6 grid gap-3 text-sm font-bold text-black/68">
              {compactList(course.includes, ["Toàn bộ bài học và tài liệu", "Template thực hành", "Bài tập ứng dụng", "Cập nhật nội dung khi cần"], 4).map(
                (item) => (
                  <p key={item}>• {item}</p>
                ),
              )}
            </div>
            <ButtonLink href="/dang-ky" className="mt-8 w-full">
              Đăng ký tư vấn
            </ButtonLink>
          </Card>
          <Card title={`Giảng viên: ${course.instructor?.name || "Thế Anh Marketing"}`}>{content.instructorCopy}</Card>
        </div>
      </Section>

      <Section id="faq" eyebrow="FAQ" title="Câu hỏi thường gặp.">
        <div className="grid gap-4 md:grid-cols-2">
          {content.faqs.map(([question, answer]) => (
            <Card key={question} title={question}>
              {answer}
            </Card>
          ))}
        </div>
      </Section>

      <footer className="border-t-2 border-black bg-[#111111] px-5 py-10 text-white sm:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 text-sm font-bold text-white/68 md:flex-row md:items-center md:justify-between">
          <p>
            <span className="text-white">Thế Anh Marketing.</span> Học marketing thực chiến, ứng dụng công cụ có quy trình.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link className="hover:text-[#85d49b]" href="/khoa-hoc">
              Khóa học
            </Link>
            <Link className="hover:text-[#85d49b]" href="/lien-he">
              Liên hệ
            </Link>
            <Link className="hover:text-[#85d49b]" href="/lien-he">
              Chính sách
            </Link>
            <a className="hover:text-[#85d49b]" href="https://facebook.com" rel="noreferrer" target="_blank">
              Facebook
            </a>
            <a className="hover:text-[#85d49b]" href="https://tiktok.com" rel="noreferrer" target="_blank">
              TikTok
            </a>
          </div>
        </div>
      </footer>

      <SiteOfferPopup contextTitle={course.title} offer={offer} />
    </main>
  );
}

export function AiMarketingSalesPage({ course, offer }: { course: Course; offer: OfferSettings }) {
  return <CourseSalesPage course={course} offer={offer} />;
}

function Section({ children, eyebrow, id, title }: { children: ReactNode; eyebrow: string; id: string; title: string }) {
  return (
    <section id={id} className="mx-auto max-w-[1440px] scroll-mt-28 px-5 py-16 sm:px-8">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2f8f62]">{eyebrow}</p>
      <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-[-0.045em] sm:text-6xl">{title}</h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}

function Card({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="motion-card rounded-2xl border-2 border-black bg-white p-5">
      {title ? <h3 className="card-title mb-3 text-xl font-black tracking-[-0.03em]">{title}</h3> : null}
      <div className="leading-7 text-black/68">{children}</div>
    </div>
  );
}
