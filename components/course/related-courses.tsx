import { CourseCard } from "@/components/content/course-card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Course } from "@/data/courses";
import { getRelatedCourses } from "@/data/courses";

export function RelatedCourses({ course }: { course: Course }) {
  const related = getRelatedCourses(course);

  if (related.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8">
      <SectionHeading eyebrow="Liên quan" title="Khóa học liên quan." />
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {related.map((item) => (
          <CourseCard key={item.slug} course={item} />
        ))}
      </div>
    </section>
  );
}
