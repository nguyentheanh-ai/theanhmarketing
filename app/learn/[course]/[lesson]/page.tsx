import { notFound, redirect } from "next/navigation";
import { LearningRoom, type LearningLesson } from "@/components/course/learning-room";
import type { Course } from "@/data/courses";
import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { getCourseBySlug } from "@/services/courseService";
import { getPaymentOrders } from "@/services/orderService";

type LessonPageProps = {
  params: Promise<{
    course: string;
    lesson: string;
  }>;
};

function getLessons(course: Course) {
  return course.modules
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((module) =>
      module.lessons
        .slice()
        .sort((a, b) => a.order - b.order)
        .map<LearningLesson>((lesson) => ({
          ...lesson,
          moduleTitle: module.title,
          moduleOrder: module.order,
        })),
    );
}

function getPaidCourseSlugsFromOrders(
  orders: Awaited<ReturnType<typeof getPaymentOrders>>,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return [];
  }

  return orders
    .filter((order) => order.status === "paid" && order.email.trim().toLowerCase() === normalizedEmail)
    .flatMap((order) => {
      if (order.orderItems.length > 0) {
        return order.orderItems.map((item) => item.slug);
      }

      return order.courseSlug.split(",").map((slug) => slug.trim()).filter(Boolean);
    });
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { course: courseSlug, lesson: lessonId } = await params;
  const course = await getCourseBySlug(courseSlug);

  if (!course) {
    notFound();
  }

  const lessons = getLessons(course);
  const directIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  const legacyLessonMatch = /^lesson-(\d+)$/.exec(lessonId);
  const legacyLessonIndex = legacyLessonMatch ? Number(legacyLessonMatch[1]) - 1 : -1;
  const currentIndex = directIndex !== -1 ? directIndex : legacyLessonIndex;
  const currentLesson = lessons[currentIndex];

  if (!currentLesson) {
    notFound();
  }

  if (currentLesson.access === "paid") {
    const { user } = await getCurrentAuth();

    if (!user && isAuthGuardEnabled()) {
      redirect(`/dang-nhap?next=${encodeURIComponent(`/learn/${courseSlug}/${lessonId}`)}`);
    }

    if (user?.email) {
      const orders = await getPaymentOrders({ includeFallback: false });
      const ownedSlugs = getPaidCourseSlugsFromOrders(orders, user.email);

      if (!ownedSlugs.includes(course.slug)) {
        redirect("/dashboard?error=course-access");
      }
    }
  }

  return (
    <LearningRoom
      course={course}
      currentLesson={currentLesson}
      lessons={lessons}
      nextLesson={lessons[currentIndex + 1]}
      previousLesson={lessons[currentIndex - 1]}
    />
  );
}
