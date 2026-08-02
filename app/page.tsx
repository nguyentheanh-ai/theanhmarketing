import { ArrowRight, BookOpenCheck, Sparkles } from "lucide-react";
import { CourseCard } from "@/components/content/course-card";
import { CtaPanel } from "@/components/marketing/cta-panel";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { GrowthDashboardVisual } from "@/components/marketing/growth-dashboard-visual";
import { GrowthEngineGrid } from "@/components/marketing/growth-engine-grid";
import { HomeDemoPanel } from "@/components/marketing/home-demo-panel";
import { ProblemSelector } from "@/components/marketing/problem-selector";
import { ProofGrid } from "@/components/marketing/proof-grid";
import { PublicSectionHeading } from "@/components/marketing/public-section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { VerifiedStatStrip } from "@/components/marketing/verified-stat-strip";
import { AgentKitWorkflow } from "@/components/site/agent-kit-workflow";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { homePage } from "@/data/home";
import { faqs, platformStats } from "@/data/site";
import { getCourses } from "@/services/courseService";
import { getTestimonials } from "@/services/testimonialService";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [courses, testimonials] = await Promise.all([getCourses(), getTestimonials()]);
  const featuredCourses = courses.slice(0, 4);

  return (
    <PageShell>
      <section className="tam-grid-bg pb-16 pt-28 sm:pb-20 sm:pt-36" id="growth-hero">
        <div className="tam-container text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#159cfb]/15 bg-white/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.13em] text-[var(--tam-accent-strong)] shadow-sm">
              <Sparkles size={14} aria-hidden="true" />
              {homePage.hero.badge}
            </span>
          </Reveal>
          <Reveal delay={70}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.055em] text-[var(--tam-ink)] sm:text-6xl lg:text-7xl">
              Xây hệ thống tăng trưởng bằng <span className="text-[var(--tam-accent)]">AI Marketing</span> có dữ liệu
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-8 text-[var(--tam-muted)] sm:text-lg">
              {homePage.hero.description}
            </p>
          </Reveal>
          <Reveal className="mt-8 flex flex-col justify-center gap-3 sm:flex-row" delay={210}>
            <ButtonLink href={homePage.hero.primaryCta.href}>
              {homePage.hero.primaryCta.label} <ArrowRight size={17} aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href={homePage.hero.secondaryCta.href} variant="secondary">
              <BookOpenCheck size={17} aria-hidden="true" /> {homePage.hero.secondaryCta.label}
            </ButtonLink>
          </Reveal>
          <Reveal delay={280}>
            <GrowthDashboardVisual />
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-3" id="growth-stats">
        <VerifiedStatStrip stats={platformStats} />
      </section>

      <section className="tam-container py-20 sm:py-28" id="growth-problems">
        <PublicSectionHeading
          eyebrow="Chọn đúng việc cần giải quyết"
          title="Hệ thống bắt đầu từ vấn đề của bạn"
          description="Mỗi lộ trình tập trung vào một nút thắt thật, sau đó mới chọn công cụ, khóa học và workflow phù hợp."
        />
        <ProblemSelector items={homePage.problem.journeys} />
      </section>

      <section className="border-y border-[var(--tam-line)] bg-[#f5f9fd] py-20 sm:py-28" id="growth-engines">
        <div className="tam-container">
          <PublicSectionHeading
            eyebrow="AI Growth System"
            title="Bốn lớp vận hành được kết nối"
            description="Không học từng mảnh rời rạc. Mỗi lớp tạo đầu ra để lớp tiếp theo có thể thực thi và đo lường."
          />
          <GrowthEngineGrid engines={homePage.engines} />
        </div>
      </section>

      <section className="tam-container py-20 sm:py-28" id="growth-demo">
        <PublicSectionHeading
          eyebrow="Workflow thực tế"
          title="Nhìn thấy cách hệ thống đi từ ý tưởng đến hành động"
          description="Một bản xem trước trung thực về cách các engine trao đổi dữ liệu và giúp founder biết việc tiếp theo cần làm."
        />
        <HomeDemoPanel />
      </section>

      <AgentKitWorkflow />

      <section className="border-y border-[var(--tam-line)] bg-[#f7fafc] py-20 sm:py-28" id="growth-products">
        <div className="tam-container">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <PublicSectionHeading
              align="left"
              eyebrow="Chương trình đang mở"
              title="Chọn engine phù hợp để bắt đầu"
              description="Danh sách lấy trực tiếp từ hệ thống khóa học của The Anh Marketing."
            />
            <ButtonLink className="self-start sm:self-auto" href="/khoa-hoc" variant="secondary">Xem tất cả</ButtonLink>
          </div>
          <div className="tam-stagger mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredCourses.map((course) => <CourseCard course={course} key={course.slug} />)}
          </div>
        </div>
      </section>

      <section className="tam-container py-20 sm:py-28" id="growth-proof">
        <PublicSectionHeading
          eyebrow="Proof từ hệ thống"
          title="Học để vận hành, không chỉ để xem"
          description="Các phản hồi và case được lấy từ nguồn nội dung hiện có của The Anh Marketing."
        />
        <ProofGrid items={testimonials} />
      </section>

      <section className="border-y border-[var(--tam-line)] bg-[#f7fafc] py-20 sm:py-28" id="growth-faq">
        <div className="tam-container">
          <PublicSectionHeading eyebrow="Hỏi đáp" title="Câu hỏi thường gặp" />
          <FaqAccordion faqs={faqs} />
        </div>
      </section>

      <section className="py-16 sm:py-24" id="growth-cta">
        <CtaPanel />
      </section>
    </PageShell>
  );
}
