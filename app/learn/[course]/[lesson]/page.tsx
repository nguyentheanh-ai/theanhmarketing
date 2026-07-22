import { notFound, redirect } from "next/navigation";
import { LearningRoom } from "@/components/course/learning-room";
import { getCourseReferencePacks } from "@/data/course-reference-packs";
import { getCurrentAuth } from "@/lib/auth/session";
import { getCourseAccessSlugs } from "@/lib/course-access";
import { getOrderedCourseLessons } from "@/lib/course-learning";
import { logStudentActivity } from "@/services/activityLogService";
import { getPublishedCourseForStudent } from "@/services/courseService";
import { getLeads } from "@/services/leadService";
import { getStudentLmsAccess } from "@/services/lmsService";
import { getPaymentOrders } from "@/services/orderService";

type LessonPageProps = {
  params: Promise<{
    course: string;
    lesson: string;
  }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { course: courseSlug, lesson: lessonId } = await params;
  const course = await getPublishedCourseForStudent(courseSlug);

  if (!course) {
    notFound();
  }

  const lessons = getOrderedCourseLessons(course);
  const referencePacks = getCourseReferencePacks(course.slug);
  const directIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  const legacyLessonMatch = /^lesson-(\d+)$/.exec(lessonId);
  const legacyLessonIndex = legacyLessonMatch ? Number(legacyLessonMatch[1]) - 1 : -1;
  const currentIndex = directIndex !== -1 ? directIndex : legacyLessonIndex;
  const currentLesson = lessons[currentIndex];

  if (!currentLesson) {
    const firstPublishedLesson = lessons[0];
    if (firstPublishedLesson) {
      redirect(`/learn/${courseSlug}/${firstPublishedLesson.id}`);
    }
    notFound();
  }

  const { adminRole, user } = await getCurrentAuth();
  const lmsAccess = await getStudentLmsAccess({
    email: user?.email,
    userId: user?.id,
    isAdmin: Boolean(adminRole),
  });

  if (course.visibility !== "public" || currentLesson.access === "paid") {

    if (!user || !user.email) {
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
      const mergedOwnedSlugs = Array.from(new Set([...lmsAccess.ownedSlugs, ...ownedSlugs]));

      if (!mergedOwnedSlugs.includes(course.slug)) {
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
      currentLessonCompleted={lmsAccess.completedLessonIds.includes(currentLesson.id)}
      lessons={lessons}
      nextLesson={lessons[currentIndex + 1]}
      previousLesson={lessons[currentIndex - 1]}
      referencePacks={referencePacks}
    />
  );
}
