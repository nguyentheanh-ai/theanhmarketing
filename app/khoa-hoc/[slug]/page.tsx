import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CourseDetail } from "@/components/course/course-detail";
import { AiMarketingSalesPage } from "@/components/course/ai-marketing-sales-page";
import { CourseJsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/site/page-shell";
import { getCourseBySlug, getCourseStaticParams } from "@/services/courseService";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getCourseStaticParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    return {};
  }

  return {
    title: course.title,
    description: course.description,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  if (course.slug === "ai-fullstack-marketing-system") {
    return (
      <>
        <CourseJsonLd course={course} />
        <AiMarketingSalesPage course={course} />
      </>
    );
  }

  return (
    <PageShell>
      <CourseJsonLd course={course} />
      <CourseDetail course={course} />
    </PageShell>
  );
}
