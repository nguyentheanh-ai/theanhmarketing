import type { Course, CourseLesson } from "@/data/courses";

export type OrderedCourseLesson = CourseLesson & {
  moduleTitle: string;
  moduleOrder: number;
};

export function getOrderedCourseLessons(course: Course): OrderedCourseLesson[] {
  return course.modules
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((module) =>
      module.lessons
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((lesson) => ({
          ...lesson,
          moduleTitle: module.title,
          moduleOrder: module.order,
        })),
    );
}
