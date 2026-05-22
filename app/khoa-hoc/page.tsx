import { PageShell } from "@/components/site/page-shell";
import { ModuleCatalogGrid } from "@/components/site/ai-os-visuals";
import { publicPages } from "@/data/pages";
import { getCourses } from "@/services/courseService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Khóa học",
  description:
    "Danh sách chương trình trong AI Growth System: Facebook Ads 2026, AI Ads Engine, Funnel-driven Ads và Marketing nền tảng.",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const page = publicPages.courses;
  const courses = await getCourses();

  return (
    <PageShell>
      <section className="ai-shell pb-8 pt-44 text-left sm:pt-14">
        <p className="ai-kicker">{page.eyebrow}</p>
        <h1 className="ai-glow-text mt-4 max-w-4xl text-4xl font-black leading-[1.04] tracking-[-0.04em] sm:text-5xl">
          {page.title}
        </h1>
      </section>

      <section className="ai-shell pb-20">
        <ModuleCatalogGrid courses={courses} variant="catalog" />
      </section>
    </PageShell>
  );
}
