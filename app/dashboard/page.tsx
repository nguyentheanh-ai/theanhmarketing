import { StudentDashboard } from "@/components/app/student-dashboard";
import { logStudentActivity } from "@/services/activityLogService";
import { getStudentPortalSnapshot } from "@/services/studentPortalService";

export default async function DashboardPage() {
  const { user, courses, resources, ownedSlugs, progressBySlug, email, displayName } = await getStudentPortalSnapshot();

  if (user?.email) {
    await logStudentActivity({
      userId: user.id,
      studentEmail: user.email,
      eventType: "student_login_success",
      eventTitle: "Học viên vào dashboard",
      eventDescription: "Session hợp lệ và dashboard học viên đã render thành công.",
      status: "success",
      actorType: "student",
      actorId: user.id,
      actorEmail: user.email,
      metadata: { route: "/dashboard", ownedSlugs },
      dedupeWindowMinutes: 15,
    });
  }

  return (
    <StudentDashboard
      courses={courses}
      ownedSlugs={ownedSlugs}
      progressBySlug={progressBySlug}
      resources={resources}
      studentEmail={email}
      studentName={displayName}
    />
  );
}
