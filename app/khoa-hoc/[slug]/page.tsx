import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CourseSalesPage } from "@/components/course/ai-marketing-sales-page";
import { CourseJsonLd } from "@/components/seo/json-ld";
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

  return (
    <>
      <CourseJsonLd course={course} />
      <CourseSalesPage course={course} />
    </>
  );
}
