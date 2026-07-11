import { CourseHub } from "@/components/crm-v2/course-hub";
import { getAdminLmsSnapshot } from "@/services/lmsService";

export const metadata = { title: "Khóa học" };

export default async function CoursesPage() {
  const snapshot = await getAdminLmsSnapshot({});
  return <CourseHub snapshot={snapshot} />;
}
