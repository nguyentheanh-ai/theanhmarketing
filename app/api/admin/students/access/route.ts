import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, cleanPhone, cleanSlug, cleanText, isValidEmail, isValidSlug } from "@/lib/security/validation";
import { invalidateAdminModules } from "@/services/adminDataService";
import { getCourses } from "@/services/courseService";
import { createLeadAdmin } from "@/services/leadService";

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

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole } = await getCurrentAuth();

      if (!canAccessAdminRole(adminRole, ["owner"])) {
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
    }

    invalidateAdminModules(["leads", "students"]);

    return NextResponse.json({
      ok: true,
      message:
        action === "grant"
          ? `Đã cấp quyền ${coursesToUpdate.length} khóa cho ${email}.`
          : `Đã thu quyền ${coursesToUpdate.length} khóa của ${email}.`,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không cập nhật được quyền học." },
      { status: 500 },
    );
  }
}
