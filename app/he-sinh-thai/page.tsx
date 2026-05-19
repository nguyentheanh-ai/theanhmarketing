import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import {
  ContentOsDashboardMockup,
  EcosystemFeatureGrid,
  EcosystemMapExact,
  ModuleCatalogGrid,
} from "@/components/site/ai-os-visuals";
import { ButtonLink } from "@/components/ui/button-link";
import { getCourses } from "@/services/courseService";
import { getResources } from "@/services/resourceService";
import { getTestimonials } from "@/services/testimonialService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hệ sinh thái AI Marketing",
  description:
    "Bản đồ hệ sinh thái The Anh OS: khóa học, workflow, tài liệu, cộng đồng, CRM học viên và dashboard vận hành.",
};

export const dynamic = "force-dynamic";

export default async function EcosystemPage() {
  const [courses, resources, testimonials] = await Promise.all([
    getCourses(),
    getResources(),
    getTestimonials(),
  ]);

  return (
    <PageShell>
      <section className="ai-shell pb-14 pt-28 sm:pt-32">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="ai-kicker">The Anh OS</p>
            <h1 className="ai-glow-text mt-5 text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">
              Hệ sinh thái AI Marketing vận hành như một CRM mini.
            </h1>
            <p className="ai-muted mt-6 max-w-2xl text-lg leading-8">
              Một bản đồ thống nhất cho khóa học, tài liệu, workflow, cộng đồng, học viên và admin. Mỗi phần có nhiệm vụ rõ để người học đi từ kiến thức đến triển khai.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/khoa-hoc">Chọn khóa học</ButtonLink>
              <ButtonLink href="/dashboard" variant="secondary">Vào dashboard học viên</ButtonLink>
            </div>
          </div>
          <ContentOsDashboardMockup compact />
        </div>
      </section>

      <section className="py-14">
        <EcosystemMapExact />
        <div className="ai-shell mt-10">
          <EcosystemFeatureGrid />
        </div>
      </section>

      <section className="ai-shell py-16">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="ai-panel-strong p-7">
            <p className="ai-kicker">Logic đang gắn</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em]">Không chỉ là giao diện.</h2>
            <div className="mt-6 grid gap-3">
              {[
                ["Khóa học", `${courses.length} khóa đang lấy từ course service`, "/khoa-hoc"],
                ["Tài liệu", `${resources.length} tài nguyên trong thư viện`, "/blog#tai-lieu"],
                ["Học viên", "Dashboard dùng đơn paid để cấp quyền học", "/dashboard"],
                ["Admin", "CRM quản lý lead, đơn hàng, học viên và CMS", "/admin/dashboard"],
              ].map(([label, detail, href]) => (
                <Link key={label} href={href} className="rounded-lg border border-white/10 bg-white/7 p-4 transition hover:border-[#77d7ff]/35">
                  <p className="font-black">{label}</p>
                  <p className="mt-1 text-sm text-white/55">{detail}</p>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <ModuleCatalogGrid courses={courses.slice(0, 3)} />
          </div>
        </div>
      </section>

      <section className="ai-shell pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.slice(0, 3).map((item) => (
            <article key={item.name} className="ai-panel p-6">
              <p className="text-sm leading-7 text-white/68">&ldquo;{item.quote}&rdquo;</p>
              <p className="mt-5 font-black">{item.name}</p>
              <p className="mt-1 text-xs text-white/45">{item.title}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

