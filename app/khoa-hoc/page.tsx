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
      <section className="ai-shell pb-16 pt-24 text-center sm:pt-28">
        <p className="ai-kicker">{page.eyebrow}</p>
        <h1 className="ai-glow-text mx-auto mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
          {page.title}
        </h1>
        <p className="ai-muted mx-auto mt-5 max-w-3xl text-lg leading-8">
          {page.description}
        </p>
      </section>

      <section className="ai-shell pb-20">
        <ModuleCatalogGrid courses={courses} />
      </section>
    </PageShell>
  );
}
