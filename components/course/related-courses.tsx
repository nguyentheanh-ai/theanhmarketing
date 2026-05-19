import { CourseCard } from "@/components/content/course-card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Course } from "@/data/courses";
import { getCourses } from "@/services/courseService";

export async function RelatedCourses({ course }: { course: Course }) {
  const courses = await getCourses();
  const related = courses
    .filter((item) => course.relatedSlugs.includes(item.slug))
    .slice(0, 2);

  if (related.length === 0) {
    return null;
  }

  return (
    <section className="ai-shell py-20">
      <SectionHeading eyebrow="Liên quan" title="Khóa học liên quan." />
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {related.map((item) => (
          <CourseCard key={item.slug} course={item} />
        ))}
      </div>
    </section>
  );
}
