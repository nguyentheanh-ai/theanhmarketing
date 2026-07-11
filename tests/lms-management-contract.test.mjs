import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

test("crm v2 LMS uses a real shared service instead of placeholder UI", () => {
  assert.ok(exists("services/lmsService.ts"), "LMS service must exist");
  assert.ok(exists("components/crm-v2/lms-management-client.tsx"), "CRM v2 LMS manager component must exist");

  const service = read("services/lmsService.ts");
  const coursesPage = read("app/admin/crm-v2/courses/page.tsx");
  const studentsClient = read("components/crm-v2/students-page-client.tsx");
  const manager = read("components/crm-v2/lms-management-client.tsx");

  for (const exportedName of [
    "getAdminLmsSnapshot",
    "listAdminLmsCourses",
    "createLmsCourse",
    "updateLmsCourse",
    "deleteLmsCourse",
    "createLmsModule",
    "updateLmsModule",
    "deleteLmsModule",
    "reorderLmsModules",
    "createLmsLesson",
    "updateLmsLesson",
    "deleteLmsLesson",
    "reorderLmsLessons",
    "createLmsResource",
    "updateLmsResource",
    "deleteLmsResource",
    "addLmsEnrollment",
    "updateLmsEnrollment",
    "removeLmsEnrollment",
    "getStudentLmsAccess",
    "markLessonCompleted",
  ]) {
    assert.match(service, new RegExp(`export\\s+async\\s+function\\s+${exportedName}\\b`), `${exportedName} must be exported`);
  }

  assert.match(coursesPage, /getAdminLmsSnapshot/, "Course Hub must load the real LMS snapshot server-side");
  assert.match(studentsClient, /StudentCreateDialog/, "student view must use the safe provisioning flow");
  assert.doesNotMatch(studentsClient, /LmsPlaceholder/, "CRM v2 LMS must not leave dead placeholder tabs");
  assert.doesNotMatch(manager, /\b(mock|demo)\b|LmsPlaceholder/gi, "LMS manager must not implement mock-only behavior");
  assert.match(manager, /\/api\/admin\/crm-v2\/lms\/actions/, "admin LMS UI must call the real mutation route");
  assert.match(manager, /router\.refresh\(\)/, "admin LMS UI must refresh server data after mutations");
  assert.match(manager, /confirm\(/, "dangerous LMS actions must ask for confirmation");
});

test("course management uses a progressive Course Hub and dedicated workspace", () => {
  assert.ok(exists("app/admin/crm-v2/courses/page.tsx"), "Course Hub route must exist");
  assert.ok(exists("app/admin/crm-v2/courses/[courseSlug]/page.tsx"), "dedicated course workspace route must exist");
  assert.ok(exists("components/crm-v2/course-hub.tsx"), "Course Hub component must exist");

  const hub = read("components/crm-v2/course-hub.tsx");
  const manager = read("components/crm-v2/lms-management-client.tsx");
  const studentsClient = read("components/crm-v2/students-page-client.tsx");

  assert.match(hub, /create_course/, "Course Hub must create real courses");
  assert.match(hub, /\/admin\/crm-v2\/courses\/\$\{/, "Course Hub must open a dedicated workspace");
  assert.doesNotMatch(manager, /function CourseListPanel/, "course list must not compete with the editor");
  assert.doesNotMatch(manager, /function EnrollmentFormModal/, "course workspace must not bypass account provisioning");
  assert.doesNotMatch(manager, /action:\s*"add_enrollment"/, "course UI must not create incomplete students");
  assert.doesNotMatch(studentsClient, /CourseLmsManager|LmsStudentsOverview/, "student operations and course authoring must be separated");
});

test("course workspace uses free guided steps, real analytics, and visible save state", () => {
  const manager = read("components/crm-v2/lms-management-client.tsx");
  const studentsClient = read("components/crm-v2/students-page-client.tsx");

  for (const label of [
    "Tổng quan",
    "Nội dung bán hàng",
    "Curriculum",
    "Media & tài liệu",
    "Học viên & quyền học",
    "Analytics",
    "Kiểm tra & xuất bản",
  ]) {
    assert.match(manager, new RegExp(label), `guided workspace must include ${label}`);
  }

  assert.match(manager, /Course Workspace/);
  assert.match(manager, /Chuyển tự do giữa các bước/);
  assert.match(manager, /searchParams\.get\("step"\)/, "active step must be URL-backed");
  assert.match(manager, /Đang lưu|Đã lưu|Lỗi lưu/, "mutations must expose save state");
  assert.match(manager, /CurriculumWorkspace/);
  assert.match(manager, /CourseAnalytics/);
  assert.doesNotMatch(manager, /localStorage/);
  assert.doesNotMatch(studentsClient, /NPS\/đánh giá[\s\S]*8\.7/);
  assert.doesNotMatch(studentsClient, /Ticket hỗ trợ[\s\S]*2 mở/);
});

test("crm v2 LMS admin and student API routes are server guarded", () => {
  assert.ok(exists("app/api/admin/crm-v2/lms/actions/route.ts"), "admin LMS action route must exist");
  assert.ok(exists("app/api/admin/crm-v2/lms/route.ts"), "admin LMS read route must exist");
  assert.ok(exists("app/api/student/progress/route.ts"), "student progress route must exist");

  const adminActions = read("app/api/admin/crm-v2/lms/actions/route.ts");
  const adminRead = read("app/api/admin/crm-v2/lms/route.ts");
  const progress = read("app/api/student/progress/route.ts");

  assert.match(adminActions, /requireCrmV2OwnerRequest/, "admin mutations must use CRM v2 owner guard");
  assert.match(adminRead, /requireCrmV2OwnerRequest/, "admin reads must use CRM v2 owner guard");
  assert.match(adminActions, /z\./, "admin LMS mutations must validate payloads with zod");
  assert.match(adminActions, /createLmsCourse[\s\S]*updateLmsLesson[\s\S]*addLmsEnrollment[\s\S]*removeLmsEnrollment/, "admin action route must cover course, lesson, and enrollment operations");
  assert.match(progress, /getCurrentAuth/, "student progress route must require the current auth user");
  assert.match(progress, /markLessonCompleted/, "student progress route must update LMS progress through the service");
  assert.match(progress, /courseSlug[\s\S]*lessonId/, "student progress route must validate course and lesson identity");
});

test("student-facing LMS reads published enrollment data from the shared LMS source", () => {
  const dashboardPage = read("app/dashboard/page.tsx");
  const dashboardClient = read("components/app/student-dashboard.tsx");
  const lessonPage = read("app/learn/[course]/[lesson]/page.tsx");
  const learningRoom = read("components/course/learning-room.tsx");
  const courseService = read("services/courseService.ts");

  assert.match(dashboardPage, /getStudentLmsAccess/, "dashboard must read active enrollments from LMS service");
  assert.match(dashboardPage, /courseProgressBySlug/, "dashboard must pass real progress into the student dashboard");
  assert.doesNotMatch(dashboardClient, /Math\.min\(100,\s*Math\.max\(8/, "dashboard must not fake completion percentage");
  assert.match(dashboardClient, /progressBySlug/, "dashboard UI must render real progress by course slug");
  assert.match(lessonPage, /getStudentLmsAccess/, "lesson page must check LMS enrollment access");
  assert.match(lessonPage, /getPublishedCourseForStudent|publishedLessonsOnly/, "lesson page must read only published student-visible content");
  assert.match(courseService, /isStudentReadyLesson/, "student lesson lists must filter empty placeholder lessons");
  assert.match(learningRoom, /\/api\/student\/progress/, "learning room must allow students to update progress");
  assert.match(learningRoom, /currentLessonCompleted/, "learning room must render completion state");
  assert.match(courseService, /lms_status|lesson_status|publishedLessonsOnly/, "course service must understand LMS publish status fields");
});

test("LMS migration and backfill are additive and idempotent", () => {
  const migrationFiles = fs.readdirSync(path.join(root, "supabase/migrations")).filter((file) => /lms_management.*\.sql$/i.test(file));
  assert.equal(migrationFiles.length, 1, "one LMS management migration should be added");

  const sql = read(`supabase/migrations/${migrationFiles[0]}`);
  assert.doesNotMatch(sql, /\bdrop\s+(schema|table|column|view|function)\b/i, "LMS migration must not drop objects");
  assert.doesNotMatch(sql, /\btruncate\b/i, "LMS migration must not truncate data");
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i, "LMS migration must not bulk delete data");
  for (const expected of [
    "alter table public.courses add column if not exists lms_status",
    "alter table public.course_modules add column if not exists status",
    "alter table public.lessons add column if not exists course_id",
    "alter table public.lessons add column if not exists content",
    "create table if not exists public.course_resources",
    "alter table crm_v2.enrollments add column if not exists user_id",
    "alter table crm_v2.course_progress add column if not exists completed_at",
    "create unique index if not exists idx_crm_v2_enrollments_contact_course_slug",
    "create unique index if not exists idx_crm_v2_course_progress_enrollment_lesson",
  ]) {
    assert.match(sql, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${expected} missing`);
  }

  assert.ok(exists("scripts/lms/backfill-lms-from-static.ts"), "idempotent LMS backfill script must exist");
  const backfill = read("scripts/lms/backfill-lms-from-static.ts");
  assert.match(backfill, /onConflict:\s*"slug"/, "course backfill must upsert by slug");
  assert.match(backfill, /course_modules/, "backfill must seed modules");
  assert.match(backfill, /lessons/, "backfill must seed lessons");
  assert.match(backfill, /isReadyForStudents[\s\S]*status:\s*isReadyForStudents \? "published" : "draft"/, "backfill must not publish empty placeholder lessons");
  assert.match(backfill, /crm_v2[\s\S]*enrollments/, "backfill must bridge paid/order access into enrollments");
  assert.match(backfill, /--apply/, "backfill must support a dry-run first workflow");
});
