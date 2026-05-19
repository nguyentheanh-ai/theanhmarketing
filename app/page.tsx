import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import {
  ContentOsDashboardMockup,
  EcosystemFeatureGrid,
  EcosystemMapExact,
  HeroDashboardMockup,
  ModuleCatalogGrid,
} from "@/components/site/ai-os-visuals";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { getCourses } from "@/services/courseService";
import { getResources } from "@/services/resourceService";
import { getTestimonials } from "@/services/testimonialService";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [courses, resources, testimonials] = await Promise.all([
    getCourses(),
    getResources(),
    getTestimonials(),
  ]);
  const featuredCourses = courses.slice(0, 6);
  const featuredResources = resources.slice(0, 3);
  const featuredTestimonials = testimonials.slice(0, 4);

  return (
    <PageShell>
      <section className="ai-shell pb-20 pt-28 sm:pt-32">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <p className="ai-kicker">THE ANH MARKETING OS</p>
            <h1 className="ai-glow-text mt-6 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">
              Học Marketing & AI như một hệ điều hành vận hành thật.
            </h1>
            <p className="ai-muted mt-6 max-w-2xl text-lg leading-8">
              Một hệ sinh thái gồm khóa học, tài liệu, workflow, dashboard học viên và admin CRM để bạn học, triển khai, đo lường và cập nhật lâu dài.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dang-ky">Khám phá hệ sinh thái</ButtonLink>
              <ButtonLink href="/blog#tai-lieu" variant="secondary">Xem tài liệu</ButtonLink>
            </div>
          </div>
          <HeroDashboardMockup />
        </div>
      </section>

      <section className="ai-shell py-12">
        <ContentOsDashboardMockup />
      </section>

      <section className="py-16">
        <div className="ai-shell text-center">
          <p className="ai-kicker">Bản đồ vận hành</p>
          <h2 className="ai-glow-text mx-auto mt-4 max-w-5xl text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            Hệ sinh thái kết nối khóa học, tài liệu và CRM.
          </h2>
        </div>
        <div className="mt-10">
          <EcosystemMapExact />
        </div>
        <div className="ai-shell mt-10">
          <EcosystemFeatureGrid />
        </div>
      </section>

      <section className="ai-shell py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Product modules"
            title="Các module học và workflow đang mở"
            description="Khóa học, tài liệu và dashboard được kết nối để người học không chỉ xem video mà còn có checklist, workflow và lộ trình áp dụng."
          />
          <ButtonLink href="/khoa-hoc" variant="secondary">Xem tất cả khóa học</ButtonLink>
        </div>
        <div className="mt-10">
          <ModuleCatalogGrid courses={featuredCourses} />
        </div>
      </section>

      <section className="ai-shell py-16">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading
              eyebrow="Proof content hub"
              title="Nội dung, case study và tài nguyên học tập"
              description="Blog và tài liệu được gom lại thành một thư viện để học viên tra cứu nhanh khi triển khai."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {featuredTestimonials.map((item) => (
                <SoftCard key={`${item.name}-${item.quote}`} className="p-5">
                  <p className="text-sm leading-6 text-white/70">&ldquo;{item.quote}&rdquo;</p>
                  <p className="mt-4 font-black">{item.name}</p>
                  <p className="text-xs text-white/45">{item.title}</p>
                </SoftCard>
              ))}
            </div>
          </div>
          <div className="ai-panel-strong p-5">
            <p className="ai-kicker">Media hub</p>
            <h3 className="mt-3 text-3xl font-black">Workflow đang dùng trong thực tế</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {featuredResources.map((item) => (
                <Link key={item.slug} href="/blog#tai-lieu" className="rounded-xl border border-white/10 bg-white/7 p-4 transition hover:border-[#77d7ff]/35">
                  <div className="grid aspect-[9/13] place-items-center rounded-lg bg-black/35">
                    <span className="grid size-12 place-items-center rounded-full bg-[#159cfb] text-xl">▶</span>
                  </div>
                  <p className="mt-4 font-black">{item.title}</p>
                  <p className="mt-1 text-xs text-white/45">{item.type}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ai-shell pb-20 pt-10">
        <div className="ai-panel-strong overflow-hidden p-8 sm:p-12 lg:grid lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="ai-kicker">Bắt đầu</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-[-0.04em] sm:text-6xl">
              Tạo tài khoản và chọn lộ trình phù hợp.
            </h2>
            <p className="ai-muted mt-5 max-w-2xl leading-8">
              Bắt đầu bằng khóa học, tài liệu hoặc dashboard học viên hiện có. Logic tài khoản và quyền học vẫn được giữ nguyên.
            </p>
          </div>
          <ButtonLink href="/dang-ky" className="mt-8 lg:mt-0">Đăng ký học</ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
