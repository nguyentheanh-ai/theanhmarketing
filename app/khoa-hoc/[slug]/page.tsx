import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CourseSalesPage } from "@/components/course/ai-marketing-sales-page";
import { CourseJsonLd } from "@/components/seo/json-ld";
import { getCourseBySlug, getCourseStaticParams } from "@/services/courseService";
import { getOfferSettings } from "@/services/offerService";

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
    alternates: {
      canonical: `/khoa-hoc/${course.slug}`,
    },
    openGraph: {
      title: course.title,
      description: course.description,
      type: "website",
      url: `/khoa-hoc/${course.slug}`,
      images: course.thumbnailImageUrl || course.bannerImageUrl ? [{ url: course.thumbnailImageUrl || course.bannerImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: course.title,
      description: course.description,
      images: course.thumbnailImageUrl || course.bannerImageUrl ? [course.thumbnailImageUrl || course.bannerImageUrl] : undefined,
    },
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
  const offer = await getOfferSettings();

  return (
    <>
      <CourseJsonLd course={course} />
      <CourseSalesPage course={course} offer={offer} />
    </>
  );
}
