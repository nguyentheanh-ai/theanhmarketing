import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { sendStudentAccessEmail } from "@/lib/notifications/student-access-email";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, cleanPhone, cleanSlug, cleanText, isValidEmail, isValidSlug } from "@/lib/security/validation";
import { invalidateAdminModules } from "@/services/adminDataService";
import { logStudentActivity } from "@/services/activityLogService";
import { getCourses } from "@/services/courseService";
import { createLeadAdmin } from "@/services/leadService";
import { ensureStudentAccountForAccessGrant } from "@/services/studentAccountService";

type AccessAction = "grant" | "revoke";

const accessSourcePrefix: Record<AccessAction, string> = {
  grant: "admin-access-grant",
  revoke: "admin-access-revoke",
};

function isAccessAction(value: string): value is AccessAction {
  return value === "grant" || value === "revoke";
}

function normalizeCourseSlugs(input: { courseSlug?: string; courseSlugs?: string[] }) {
  const rawSlugs = Array.isArray(input.courseSlugs) && input.courseSlugs.length > 0 ? input.courseSlugs : [input.courseSlug ?? ""];

  return Array.from(new Set(rawSlugs.map((slug) => cleanSlug(String(slug))).filter(Boolean)));
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:students:access"),
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    let adminActor: Awaited<ReturnType<typeof getCurrentAuth>>["user"] | null = null;
    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole, user } = await getCurrentAuth();
      adminActor = user;

      if (!canAccessAdminRole(adminRole, ["owner", "editor"])) {
        return NextResponse.json(
          { ok: false, message: "Bạn không có quyền thay đổi quyền học viên." },
          { status: 403 },
        );
      }
    }

    const body = (await request.json()) as {
      action?: string;
      courseSlug?: string;
      courseSlugs?: string[];
      email?: string;
      name?: string;
      phone?: string;
    };
    const action = cleanText(body.action, 20);
    const courseSlugs = normalizeCourseSlugs(body);
    const email = cleanEmail(body.email);
    const name = cleanText(body.name, 120) || email;
    const phone = cleanPhone(body.phone);

    if (
      !isAccessAction(action) ||
      courseSlugs.length === 0 ||
      courseSlugs.some((courseSlug) => !isValidSlug(courseSlug)) ||
      !email ||
      !isValidEmail(email)
    ) {
      return NextResponse.json(
        { ok: false, message: "Thiếu email, khóa học hoặc hành động quyền học hợp lệ." },
        { status: 400 },
      );
    }

    const courses = await getCourses();
    const coursesToUpdate = courseSlugs
      .map((courseSlug) => courses.find((course) => course.slug === courseSlug))
      .filter((course): course is (typeof courses)[number] => Boolean(course));

    if (coursesToUpdate.length !== courseSlugs.length) {
      return NextResponse.json({ ok: false, message: "Không tìm thấy một hoặc nhiều khóa học." }, { status: 404 });
    }

    let studentAccount:
      | Awaited<ReturnType<typeof ensureStudentAccountForAccessGrant>>
      | null = null;

    if (action === "grant") {
      studentAccount = await ensureStudentAccountForAccessGrant(
        {
          studentName: name,
          email,
          phone,
          courseSlug: courseSlugs.join(","),
          courseTitle: coursesToUpdate.map((course) => course.title).join(" | "),
        },
        {
          forcePasswordUpdate: true,
        },
      );

      if (!studentAccount.ok) {
        return NextResponse.json(
          { ok: false, message: `Chưa tạo/cập nhật được tài khoản học viên: ${studentAccount.reason}` },
          { status: 500 },
        );
      }
    }

    for (const course of coursesToUpdate) {
      const result = await createLeadAdmin({
        name,
        email,
        phone,
        source: `${accessSourcePrefix[action]}:${course.slug}`,
        message: [
          `Quyền học: ${action === "grant" ? "Cấp quyền" : "Thu quyền"}`,
          `Khóa học: ${course.title}`,
          `Slug: ${course.slug}`,
        ].join("\n"),
      });

      if (!result.ok) {
        return NextResponse.json(
          { ok: false, message: `Chưa cập nhật được quyền học: ${result.error}` },
          { status: 500 },
        );
      }

      await logStudentActivity({
        leadId: result.lead?.id ?? null,
        studentEmail: email,
        studentPhone: phone,
        eventType: action === "grant" ? "course_access_granted" : "course_access_revoked",
        eventTitle: action === "grant" ? "Đã cấp quyền học viên" : "Đã thu quyền học viên",
        eventDescription: `${action === "grant" ? "Cấp quyền" : "Thu quyền"} khóa ${course.title}.`,
        status: "success",
        actorType: "admin",
        actorId: adminActor?.id ?? null,
        actorEmail: adminActor?.email ?? null,
        metadata: { courseSlug: course.slug, courseName: course.title },
      });
    }

    const emailResult = await sendStudentAccessEmail(
      {
        action,
        studentName: name,
        email,
        courseTitles: coursesToUpdate.map((course) => course.title),
      },
      {
        account:
          action === "grant" && studentAccount?.temporaryPassword
            ? {
                email: studentAccount.email,
                temporaryPassword: studentAccount.temporaryPassword,
                created: studentAccount.created,
                mustChangePassword: true,
              }
            : undefined,
      },
    );

    if (!emailResult.ok || emailResult.skipped) {
      await logStudentActivity({
        studentEmail: email,
        studentPhone: phone,
        eventType: "payment_email_failed",
        eventTitle: "Gửi email quyền học thất bại",
        eventDescription: emailResult.reason ?? "Không rõ lý do",
        status: "failed",
        actorType: "admin",
        actorId: adminActor?.id ?? null,
        actorEmail: adminActor?.email ?? null,
        metadata: { action, courseSlugs },
      });
      return NextResponse.json(
        {
          ok: false,
          message: `Đã cập nhật quyền học nhưng chưa gửi được email cho khách: ${
            emailResult.reason ?? "không rõ lý do"
          }`,
        },
        { status: 500 },
      );
    }

    invalidateAdminModules(["leads", "students"]);

    return NextResponse.json({
      ok: true,
      message:
        action === "grant"
          ? `Đã cấp quyền ${coursesToUpdate.length} khóa, tạo/cập nhật tài khoản và gửi email cho ${email}.`
          : `Đã thu quyền ${coursesToUpdate.length} khóa và gửi email thông báo cho ${email}.`,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không cập nhật được quyền học." },
      { status: 500 },
    );
  }
}
