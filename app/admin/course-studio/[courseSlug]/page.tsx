import { notFound, redirect } from "next/navigation";

import { CrmShell } from "@/components/crm-v2";
import { CourseLmsManager } from "@/components/crm-v2/lms-management-client";
import { requireAdminAuth } from "@/lib/auth/session";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";
import { getAdminLmsSnapshot } from "@/services/lmsService";

type PageProps = { params: Promise<{ courseSlug: string }> };

export const metadata = { title: "Course Studio" };

export default async function CourseStudioPage({ params }: PageProps) {
  const { courseSlug } = await params;
  const auth = await requireAdminAuth(`/admin/course-studio/${courseSlug}`, ["owner", "editor"]);
  if (!isCrmV2Enabled()) redirect("/admin/crm-v2");

  const snapshot = await getAdminLmsSnapshot({ selectedCourseSlug: courseSlug });
  if (snapshot.ok && !snapshot.courses.some((course) => course.slug === courseSlug)) notFound();

  return <CrmShell adminRole={auth?.adminRole ?? "owner"}><CourseLmsManager lmsSnapshot={snapshot} studioMode /></CrmShell>;
}
