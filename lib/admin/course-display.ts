import type { SoloCommandCenterModel } from "@/lib/admin/solo-command-center";

type TopCourse = SoloCommandCenterModel["topCourses"][number];

export function safeCourseDisplayTitle(course: Pick<TopCourse, "slug" | "title">) {
  const title = course.title.trim();
  const internalKey = course.slug.trim();
  if (!title || title.toLocaleLowerCase("en-US") === internalKey.toLocaleLowerCase("en-US")) {
    return "Khóa học chưa xác định";
  }
  return title;
}

export function toSafeTopCourseDisplayRows(rows: TopCourse[]) {
  return rows.map((row) => ({
    title: safeCourseDisplayTitle(row),
    revenue: row.revenue,
    paidOrders: row.paidOrders,
  }));
}
