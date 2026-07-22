import { notFound, redirect } from "next/navigation";
import { getOrderedCourseLessons } from "@/lib/course-learning";
import { getPublishedCourseForStudent } from "@/services/courseService";

type CourseLearningPageProps = {
  params: Promise<{
    course: string;
  }>;
};

export default async function CourseLearningPage({ params }: CourseLearningPageProps) {
  const { course: courseSlug } = await params;
  const course = await getPublishedCourseForStudent(courseSlug);

  if (!course) {
    notFound();
  }

  const firstPublishedLesson = getOrderedCourseLessons(course)[0];

  if (!firstPublishedLesson) {
    notFound();
  }

  redirect(`/learn/${courseSlug}/${firstPublishedLesson.id}`);
}
