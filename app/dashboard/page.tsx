import { after } from "next/server";
import { StudentDashboard } from "@/components/app/student-dashboard";
import { logStudentActivity } from "@/services/activityLogService";
import { getStudentPortalSnapshot } from "@/services/studentPortalService";
import {readNativeDashboardPage} from "@/lib/cloudflare/native-dashboard-page";
import {redirect} from "next/navigation";

export default async function DashboardPage() {
  const native=await readNativeDashboardPage();
  if(native){
    if(native.status==="guest")redirect("/dang-nhap?next=%2Fdashboard");
    if(native.status==="password-change-required")redirect("/doi-mat-khau?next=%2Fdashboard");
    if(native.status==="student"){
      after(()=>native.recordVisit());
      return <StudentDashboard courses={native.courses} resources={native.resources} ownedSlugs={native.ownedSlugs}
        progressBySlug={native.progressBySlug} lessonCountsBySlug={native.lessonCountsBySlug}
        studentEmail={native.email} studentName={native.displayName} authProvider="native-d1" authContext={native.authContext}/>;
    }
  }
  const { user, courses, resources, ownedSlugs, progressBySlug, lessonCountsBySlug, email, displayName } = await getStudentPortalSnapshot();

  if (user?.email) {
    after(() => logStudentActivity({
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
    }));
  }

  return (
    <StudentDashboard
      courses={courses}
      ownedSlugs={ownedSlugs}
      progressBySlug={progressBySlug}
      lessonCountsBySlug={lessonCountsBySlug}
      resources={resources}
      studentEmail={email}
      studentName={displayName}
    />
  );
}
