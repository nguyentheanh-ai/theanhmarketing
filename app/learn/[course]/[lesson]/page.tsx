import { notFound, redirect } from "next/navigation";
import { LearningRoom, type LearningLesson } from "@/components/course/learning-room";
import type { Course } from "@/data/courses";
import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { getCourseAccessSlugs } from "@/lib/course-access";
import { logStudentActivity } from "@/services/activityLogService";
import { getCourseBySlug } from "@/services/courseService";
import { getLeads } from "@/services/leadService";
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
    const { adminRole, user } = await getCurrentAuth();

    if (!user && isAuthGuardEnabled()) {
      redirect(`/dang-nhap?next=${encodeURIComponent(`/learn/${courseSlug}/${lessonId}`)}`);
    }

    if (!adminRole && user?.email) {
      const [orders, leads] = await Promise.all([
        getPaymentOrders({ includeFallback: false }),
        getLeads({ includeFallback: false }),
      ]);
      const ownedSlugs = getCourseAccessSlugs({
        email: user.email,
        leads,
        orders,
      });

      if (!ownedSlugs.includes(course.slug)) {
        redirect("/dashboard?error=course-access");
      }
    }

    if (user?.email) {
      await logStudentActivity({
        userId: user.id,
        studentEmail: user.email,
        eventType: "student_entered_learning",
        eventTitle: "Học viên đã vào khu vực học",
        eventDescription: `${course.title} - ${currentLesson.title}`,
        status: "success",
        actorType: "student",
        actorId: user.id,
        actorEmail: user.email,
        metadata: { route: `/learn/${courseSlug}/${lessonId}`, courseSlug, lessonId },
        dedupeWindowMinutes: 15,
      });
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
