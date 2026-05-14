import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { getResources } from "@/services/resourceService";
import { getTestimonials } from "@/services/testimonialService";

export const dynamic = "force-dynamic";

const solopreneurStats = [
  { value: "01", label: "Người làm chủ hệ thống" },
  { value: "24/7", label: "Động cơ nội dung và bán hàng" },
  { value: "04", label: "Lớp vận hành cần nắm" },
];

const ecosystemLayers = [
  {
    label: "Positioning",
    title: "Định vị để không bị trở thành freelancer giá rẻ.",
    copy: "Làm rõ thị trường, lời hứa, offer và lý do khách hàng nên chọn bạn.",
  },
  {
    label: "Content Engine",
    title: "Biến chuyên môn thành nội dung có khả năng bán hàng.",
    copy: "Có khung research, angle, hook, lịch xuất bản và tài sản nội dung có thể tái sử dụng.",
  },
  {
    label: "Sales System",
    title: "Thiết kế hành trình từ người lạ thành khách hàng.",
    copy: "Liên kết lead magnet, landing page, email/Zalo follow-up và quy trình tư vấn.",
  },
  {
    label: "AI Workflow",
    title: "Dùng AI như bộ xử lý, không phải như một món đồ chơi.",
    copy: "Tạo workflow để nghiên cứu, viết, đo lường và tự động hóa những việc lặp lại.",
  },
];

const workflowModules = [
  { label: "Automation", x: "9%", y: "47%", path: "M520 290 H390 L350 246 H140", delay: "0s" },
  { label: "Sales & CS", x: "78%", y: "31%", path: "M680 290 H820 L880 212 H1060", delay: "-0.6s" },
  { label: "Onboarding", x: "62%", y: "15%", path: "M620 230 V150 L690 92 H850", delay: "-1.2s" },
  { label: "Chăm sóc khách hàng", x: "19%", y: "72%", path: "M540 360 V430 H400 L360 492 H190", delay: "-1.8s" },
  { label: "Phân tích dữ liệu", x: "13%", y: "23%", path: "M540 250 L455 150 H290 L245 118 H118", delay: "-2.4s" },
  { label: "Trợ lý Coaching", x: "79%", y: "58%", path: "M685 350 H840 L900 396 H1080", delay: "-3s" },
  { label: "Số hóa tuyển dụng", x: "35%", y: "14%", path: "M575 226 V130 L520 82 H350", delay: "-3.6s" },
  { label: "Quản trị rủi ro", x: "29%", y: "59%", path: "M518 338 H388 L330 402 H270", delay: "-4.2s" },
];

const operatingBlocks = [
  "Thư viện tài liệu và checklist cho người tự vận hành",
  "Dashboard học viên để theo dõi lộ trình và tài sản đã sở hữu",
  "CMS để cập nhật khóa học, nội dung, media và dữ liệu vận hành",
  "Hệ thống thanh toán, phân quyền học viên và tài nguyên riêng",
];

const aiOperatingLayers = [
  {
    label: "Research OS",
    title: "AI giúp gom tín hiệu thị trường trước khi bạn viết hay bán.",
    copy: "Biến insight khách hàng, câu hỏi lặp lại, phản hồi tư vấn và dữ liệu nội dung thành nguyên liệu ra quyết định.",
  },
  {
    label: "Content Copilot",
    title: "Tạo nháp nhanh nhưng vẫn giữ được góc nhìn chuyên môn của bạn.",
    copy: "Từ idea bank, hook, outline, bài viết dài, email đến kịch bản video ngắn cho từng giai đoạn trong hành trình mua.",
  },
  {
    label: "Sales Assistant",
    title: "Chuẩn hóa tư vấn, follow-up và xử lý phản hồi khách hàng.",
    copy: "AI không thay bạn bán hàng. Nó giúp bạn không quên ngữ cảnh, không bỏ sót lead và trả lời có hệ thống hơn.",
  },
  {
    label: "Operating Brain",
    title: "Kết nối tài liệu, checklist, dữ liệu và dashboard thành một bộ não phụ.",
    copy: "Mỗi tài sản được đóng gói để dùng lại: SOP, prompt, template, form, nội dung mẫu và báo cáo gọn.",
  },
];

const solopreneurKitItems = [
  {
    label: "Clarity Kit",
    title: "Bộ định vị",
    items: ["Chân dung khách hàng", "Offer map", "Thông điệp cốt lõi"],
  },
  {
    label: "Content Kit",
    title: "Bộ nội dung",
    items: ["Idea bank", "Hook library", "Lịch xuất bản"],
  },
  {
    label: "Sales Kit",
    title: "Bộ bán hàng",
    items: ["Lead magnet", "Kịch bản tư vấn", "Follow-up Zalo/email"],
  },
  {
    label: "AI Kit",
    title: "Bộ workflow AI",
    items: ["Prompt theo vai trò", "Checklist tự động hóa", "Báo cáo dữ liệu"],
  },
];

const kitFlowSteps = ["Định vị", "Đóng gói", "Xuất bản", "Bán hàng", "Tối ưu"];

const solopreneurFaqs = [
  {
    question: "Trang này dành cho ai?",
    answer:
      "Dành cho solopreneur, founder nhỏ, creator, consultant và người bán tri thức muốn xây hệ thống nội dung, bán hàng và vận hành gọn hơn.",
  },
  {
    question: "Có phải chỉ học marketing không?",
    answer:
      "Không. Trọng tâm là hệ sinh thái vận hành cho một người: định vị, sản phẩm tri thức, nội dung, sales, AI workflow và dashboard học tập.",
  },
  {
    question: "AI nằm ở đâu trong hệ sinh thái?",
    answer:
      "AI được dùng như lớp xử lý: research, viết nháp, biên tập, tạo checklist, phân tích dữ liệu và tự động hóa các bước lặp lại.",
  },
];

function WorkflowIcon() {
  return (
    <div className="relative grid size-28 place-items-center rounded-[1.65rem] border border-black/8 bg-white shadow-[0_22px_70px_rgba(47,143,98,0.16)]">
      <div className="workflow-core-glow absolute inset-0 rounded-[1.65rem]" />
      <div className="relative grid size-16 grid-cols-3 items-end gap-1.5">
        <span className="h-10 rounded-md bg-[#2f8f62]" />
        <span className="h-14 rounded-md bg-[#d8ad57]" />
        <span className="h-12 rounded-md bg-[#111113]" />
      </div>
    </div>
  );
}

function AiWorkflowEcosystem() {
  return (
    <section className="bg-[#fbfaf7] px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          eyebrow="AI workflow ecosystem"
          title="Một hệ sinh thái workflow chạy quanh lõi Solopreneur."
          description="Các module không đứng độc lập. Chúng được nối bằng luồng dữ liệu mảnh, giúp solopreneur nhìn thấy cách AI hỗ trợ toàn bộ vòng vận hành."
          align="center"
        />

        <div className="workflow-ecosystem relative mt-12 min-h-[620px] overflow-hidden rounded-[2rem] border border-black/8 bg-[#f8f8f6] shadow-[0_34px_100px_rgba(0,0,0,0.08)]">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1200 620"
            fill="none"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="workflowFlow" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#2f8f62" stopOpacity="0" />
                <stop offset="45%" stopColor="#2f8f62" stopOpacity="0.2" />
                <stop offset="55%" stopColor="#2f8f62" stopOpacity="1" />
                <stop offset="100%" stopColor="#d8ad57" stopOpacity="0" />
              </linearGradient>
            </defs>
            {workflowModules.map((module, index) => (
              <g key={module.label}>
                <path
                  className="workflow-path-base"
                  d={module.path}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="workflow-path-flow"
                  data-index={index}
                  d={module.path}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animationDelay: module.delay }}
                />
              </g>
            ))}
          </svg>

          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <WorkflowIcon />
          </div>

          {workflowModules.map((module, index) => (
            <div
              key={module.label}
              className="workflow-pill absolute z-20 inline-flex min-h-11 items-center gap-2 rounded-full border border-black/8 bg-white px-4 text-sm font-black text-[#141414] shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(47,143,98,0.2)]"
              data-index={index}
              style={{ left: module.x, top: module.y, animationDelay: module.delay }}
            >
              <span className="grid size-6 place-items-center rounded-full bg-[#edf7ee] text-[#2f8f62]">
                ✦
              </span>
              {module.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiOperatingSection() {
  return (
    <section className="bg-[#f6f0e4] px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="AI operating layer"
            title="AI không phải một công cụ rời rạc. AI là lớp vận hành nằm dưới mọi việc."
            description="Solopreneur không cần thêm một đống app để nhớ. Điều cần hơn là một hệ thống biết thu thập tín hiệu, tạo nháp, chuẩn hóa phản hồi và biến tri thức cá nhân thành tài sản dùng lại được."
          />
          <div className="mt-8 rounded-[1.5rem] border border-black/8 bg-white p-4 shadow-[0_22px_70px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap gap-2">
              {kitFlowSteps.map((step) => (
                <span
                  key={step}
                  className="rounded-full border border-black/8 bg-[#fbfaf7] px-4 py-2 text-sm font-black text-black/72"
                >
                  {step}
                </span>
              ))}
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/8">
              <div className="ai-signal-bar h-full rounded-full bg-[#2f8f62]" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {aiOperatingLayers.map((item, index) => (
            <div
              key={item.label}
              className="motion-card min-h-[260px] rounded-[1.35rem] border border-black/8 bg-white p-6 shadow-[0_18px_55px_rgba(0,0,0,0.055)]"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2f8f62]">
                  {item.label}
                </p>
                <span className="grid size-10 place-items-center rounded-full bg-[#111113] text-sm font-black text-white">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="card-title mt-8 text-2xl font-black leading-tight text-[#111113]">
                {item.title}
              </h3>
              <p className="mt-4 text-sm font-semibold leading-7 text-black/58">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolopreneurKitSection() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <SectionHeading
          eyebrow="Solopreneur kit"
          title="Một bộ kit để biến chuyên môn thành hệ thống có thể chạy mỗi tuần."
          description="Mỗi kit là một nhóm tài sản thực hành: rõ đầu vào, rõ đầu ra, dễ cập nhật và có thể đưa vào dashboard học viên hoặc thư viện tài liệu khi bạn muốn mở rộng."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {solopreneurKitItems.map((kit) => (
            <div
              key={kit.label}
              className="rounded-[1.35rem] border border-black/8 bg-white p-6 shadow-[0_18px_55px_rgba(0,0,0,0.05)]"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c77b20]">
                {kit.label}
              </p>
              <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111113]">
                {kit.title}
              </h3>
              <div className="mt-6 grid gap-3">
                {kit.items.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-full border border-black/8 bg-[#fbfaf7] px-4 py-3"
                  >
                    <span className="size-2 rounded-full bg-[#2f8f62]" />
                    <span className="text-sm font-bold text-black/68">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolopreneurStats() {
  return (
    <div className="grid gap-3 rounded-[1.5rem] border border-black/8 bg-white p-3 shadow-[0_22px_70px_rgba(0,0,0,0.06)] sm:grid-cols-3">
      {solopreneurStats.map((item) => (
        <div key={item.label} className="rounded-[1.1rem] bg-[#f7f3ec] px-5 py-4">
          <p className="text-3xl font-black text-[#111113]">{item.value}</p>
          <p className="mt-1 text-sm font-bold text-black/54">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export default async function Home() {
  const [resources, testimonials] = await Promise.all([
    getResources(),
    getTestimonials(),
  ]);
  const featuredResources = resources.slice(0, 3);
  const featuredTestimonials = testimonials.slice(0, 3);

  return (
    <PageShell>
      <section className="bg-[#f6f0e4] px-5 pb-20 pt-36 sm:px-8 lg:pt-32">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black/58 shadow-[0_12px_34px_rgba(0,0,0,0.05)]">
              Solopreneur Operating System
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-black leading-none text-[#101012] sm:text-6xl lg:text-7xl">
              <span className="block">Một hệ sinh thái</span>
              <span className="block text-[#2f8f62]">cho Solopreneur</span>
              <span className="block">vận hành gọn hơn</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-black/68">
              The Anh Marketing sẽ phát triển thành nền tảng giúp solopreneur đóng gói chuyên môn,
              xây content engine, tạo hệ thống bán hàng và dùng AI như một bộ xử lý vận hành mỗi ngày.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/khoa-hoc" className="w-full sm:w-auto">
                Khám phá hệ sinh thái
                <span aria-hidden="true">-&gt;</span>
              </ButtonLink>
              <ButtonLink href="/tai-lieu" variant="secondary" className="w-full sm:w-auto">
                Tải tài nguyên miễn phí
              </ButtonLink>
            </div>
            <div className="mt-10">
              <SolopreneurStats />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_34px_100px_rgba(0,0,0,0.1)]">
            <div className="grid gap-4">
              {ecosystemLayers.map((item, index) => (
                <div key={item.label} className="rounded-[1.25rem] border border-black/8 bg-[#fbfaf7] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2f8f62]">
                    Layer {index + 1} / {item.label}
                  </p>
                  <h2 className="mt-2 text-2xl font-black leading-tight">{item.title}</h2>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AiWorkflowEcosystem />

      <AiOperatingSection />

      <SolopreneurKitSection />

      <section className="border-y border-black/8 bg-[#111113] px-5 py-16 text-white sm:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d8ad57]">
              Solopreneur stack
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
              Từ một người làm tất cả thành một hệ thống biết phân vai.
            </h2>
          </div>
          <div>
            <p className="text-lg font-medium leading-9 text-white/68">
              Trang chủ không tập trung vào một khóa học đơn lẻ. Đây là lớp định vị cho cả hệ
              sinh thái: nội dung, sản phẩm tri thức, sales, tài liệu, dashboard và AI workflow.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              {["Think", "Build", "Sell", "Scale"].map((item) => (
                <div key={item} className="rounded-[1.1rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-sm font-black text-white">{item}</p>
                  <div className="mt-4 h-1.5 rounded-full bg-[#2f8f62]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionHeading
          eyebrow="Vấn đề của Solopreneur"
          title="Bạn không thiếu công cụ. Bạn thiếu một hệ điều hành cho công việc một người."
          description="Solopreneur thường bị kéo giữa chuyên môn, nội dung, khách hàng, sale, học tập và vận hành. Hệ sinh thái này gom các lớp cần thiết để mọi việc không còn nằm hết trong đầu bạn."
        />
        <div className="grid gap-4">
          {ecosystemLayers.map((item, index) => (
            <div
              key={item.label}
              className="grid gap-4 rounded-[1.25rem] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.045)] sm:grid-cols-[64px_1fr]"
            >
              <span className="grid size-12 place-items-center rounded-full bg-[#111113] text-sm font-black text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#2f8f62]">{item.label}</p>
                <h3 className="mt-2 text-2xl font-black leading-tight">{item.title}</h3>
                <p className="mt-3 text-base font-semibold leading-7 text-black/60">{item.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionHeading
            eyebrow="Hệ sinh thái"
            title="Các lớp cần có để một solopreneur vận hành như một đội nhỏ."
          />
          <div className="grid gap-4">
            {operatingBlocks.map((item, index) => (
              <div key={item} className="rounded-[1.25rem] border border-black/8 bg-white p-6">
                <p className="text-sm font-black text-[#2f8f62]">Layer {index + 1}</p>
                <p className="mt-3 text-lg font-bold leading-8 text-black/70">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#ebe2d4] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="Tài nguyên"
              title="Tài sản thực hành để solopreneur triển khai nhanh hơn."
            />
            <ButtonLink href="/tai-lieu" variant="secondary">
              Xem thư viện
            </ButtonLink>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {featuredResources.map((item) => (
              <SoftCard key={item.title} className="h-full rounded-[1.25rem]">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#b86f1e]">
                  {item.type} / {item.access}
                </p>
                <h3 className="mt-4 text-2xl font-black leading-tight">{item.title}</h3>
                <p className="mt-4 line-clamp-3 text-sm font-semibold leading-7 text-black/58">
                  {item.description}
                </p>
              </SoftCard>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <SectionHeading
          eyebrow="Học viên"
          title="Tập trung vào khả năng biến kiến thức thành hệ thống làm việc."
          align="center"
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {featuredTestimonials.map((item) => (
            <SoftCard key={item.name} className="h-full rounded-[1.25rem]">
              <p className="text-lg font-semibold leading-8 text-black/70">&ldquo;{item.quote}&rdquo;</p>
              <p className="mt-7 font-black">{item.name}</p>
              <p className="mt-1 text-sm font-semibold text-black/45">{item.title}</p>
            </SoftCard>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.7fr_1.3fr]">
        <SectionHeading eyebrow="FAQ" title="Những câu hỏi nên làm rõ." />
        <div className="grid gap-4">
          {solopreneurFaqs.map((item) => (
            <div key={item.question} className="rounded-[1.25rem] border border-black/8 bg-white p-6">
              <h3 className="text-xl font-black leading-tight">{item.question}</h3>
              <p className="mt-3 text-base font-medium leading-8 text-black/62">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[1.75rem] bg-[#111113] p-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.14)] sm:p-12 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d8ad57]">
              Solopreneur ecosystem
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
              Xây hệ thống để bạn không phải lúc nào cũng tự mình kéo mọi thứ.
            </h2>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/68">
              Bắt đầu từ tài nguyên, lộ trình học và những workflow có thể dùng ngay cho công việc một người.
            </p>
          </div>
          <ButtonLink href="/tai-lieu" className="mt-9 bg-white text-black hover:bg-white/88 lg:mt-0">
            Lấy tài nguyên đầu tiên
          </ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
