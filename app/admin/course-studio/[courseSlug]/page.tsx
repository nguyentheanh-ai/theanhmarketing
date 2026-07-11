import { notFound, redirect } from "next/navigation";

import { CourseLmsManager } from "@/components/crm-v2/lms-management-client";
import { requireAdminAuth } from "@/lib/auth/session";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";
import { getAdminLmsSnapshot } from "@/services/lmsService";

type PageProps = { params: Promise<{ courseSlug: string }> };

export const metadata = { title: "Course Studio" };

export default async function CourseStudioPage({ params }: PageProps) {
  const { courseSlug } = await params;
  await requireAdminAuth(`/admin/course-studio/${courseSlug}`, ["owner"]);
  if (!isCrmV2Enabled()) redirect("/admin/crm-v2");

  const snapshot = await getAdminLmsSnapshot({ selectedCourseSlug: courseSlug });
  if (!snapshot.courses.some((course) => course.slug === courseSlug)) notFound();

  return <CourseLmsManager lmsSnapshot={snapshot} studioMode />;
}
