import { PageShell } from "@/components/site/page-shell";
import { AgentKitWorkflow } from "@/components/site/agent-kit-workflow";
import {
  ContentOsDashboardMockup,
  HeroDashboardMockup,
  ModuleCatalogGrid,
} from "@/components/site/ai-os-visuals";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCourses } from "@/services/courseService";
import { AgentThumbnailGallery } from "@/components/content/agent-thumbnail-gallery";

export const dynamic = "force-dynamic";

export default async function Home() {
  const courses = await getCourses();
  const featuredCourses = courses.slice(0, 6);

  return (
    <PageShell>
      <section className="ai-shell pb-20 pt-28 sm:pt-32">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <p className="ai-kicker">AI PERFORMANCE MARKETING SYSTEM</p>
            <h1 className="ai-glow-text mt-6 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">
              SME không thiếu tool. Họ thiếu Growth System.
            </h1>
            <p className="ai-muted mt-6 max-w-2xl text-lg leading-8">
              The Anh Marketing giúp SME và Solopreneur xây hệ thống tăng trưởng bằng AI Marketing, Performance Ads, Funnel, Automation và CRM/Data thay vì làm từng mảnh rời rạc.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dang-ky">Khám phá Growth System</ButtonLink>
              <ButtonLink href="/blog#tai-lieu" variant="secondary">Tải AI Growth Toolkit</ButtonLink>
            </div>
          </div>
          <HeroDashboardMockup />
        </div>
      </section>

      <section className="ai-shell py-12">
        <ContentOsDashboardMockup />
      </section>

      <section className="ai-shell py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Product modules"
            title="Các engine đang mở trong hệ sinh thái"
            description="Khóa học, tài liệu và dashboard được kết nối để bạn không chỉ xem video mà còn có checklist, workflow, funnel và lộ trình áp dụng vào doanh nghiệp thật."
          />
          <ButtonLink href="/khoa-hoc" variant="secondary">Xem chương trình</ButtonLink>
        </div>
        <div className="mt-10">
          <ModuleCatalogGrid courses={featuredCourses} variant="catalog" showFilters={false} showToolbar={false} />
        </div>
      </section>

      <AgentKitWorkflow />

      <section className="ai-shell py-12">
        <AgentThumbnailGallery source="home-media-hub" />
      </section>

      <section className="ai-shell pb-20 pt-10">
        <div className="ai-panel-strong overflow-hidden p-8 sm:p-12 lg:grid lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="ai-kicker">Bắt đầu bằng chẩn đoán</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-[-0.04em] sm:text-6xl">
              Từ content rời rạc đến Growth System hoàn chỉnh.
            </h2>
            <p className="ai-muted mt-5 max-w-2xl leading-8">
              Bắt đầu bằng toolkit, workshop hoặc khóa học phù hợp. Logic tài khoản, quyền học và dashboard của học viên cũ vẫn được giữ nguyên.
            </p>
          </div>
          <ButtonLink href="/dang-ky" className="mt-8 lg:mt-0">Nhận chẩn đoán</ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
