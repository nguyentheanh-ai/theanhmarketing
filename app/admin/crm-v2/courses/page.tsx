import { requireAdminAuth } from "@/lib/auth/session";
import { CourseHub } from "@/components/crm-v2/course-hub";
import { getAdminLmsSnapshot } from "@/services/lmsService";

export const metadata = { title: "Khóa học" };

export default async function CoursesPage() {
  await requireAdminAuth("/admin/crm-v2/courses", ["owner", "editor"]);
  const snapshot = await getAdminLmsSnapshot({});
  return <CourseHub key={snapshot.generatedAt} snapshot={snapshot} />;
}
