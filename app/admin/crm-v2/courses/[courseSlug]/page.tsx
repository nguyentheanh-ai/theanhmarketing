import { notFound } from "next/navigation";

import { CourseLmsManager } from "@/components/crm-v2/lms-management-client";
import { getAdminLmsSnapshot } from "@/services/lmsService";

type PageProps = { params: Promise<{ courseSlug: string }> };

export default async function CourseWorkspacePage({ params }: PageProps) {
  const { courseSlug } = await params;
  const snapshot = await getAdminLmsSnapshot({ selectedCourseSlug: courseSlug });
  if (!snapshot.courses.some((course) => course.slug === courseSlug)) notFound();
  return <CourseLmsManager lmsSnapshot={snapshot} />;
}
