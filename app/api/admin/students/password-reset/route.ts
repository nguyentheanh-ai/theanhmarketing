import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { sendStudentAccessEmail } from "@/lib/notifications/student-access-email";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, cleanPhone, cleanSlug, cleanText, isValidEmail, isValidSlug } from "@/lib/security/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { invalidateAdminModules } from "@/services/adminDataService";
import { logStudentActivity } from "@/services/activityLogService";
import { getCourses } from "@/services/courseService";
import { ensureStudentAccountForAccessGrant } from "@/services/studentAccountService";

type PaidOrderForPasswordReset = {
  order_code: string;
  student_name: string;
  email: string;
  phone: string;
  course_slug: string;
  course_title: string;
};

function normalizeCourseSlugs(input: { courseSlug?: string; courseSlugs?: string[] }) {
  const rawSlugs = Array.isArray(input.courseSlugs) && input.courseSlugs.length > 0 ? input.courseSlugs : [input.courseSlug ?? ""];

  return Array.from(new Set(rawSlugs.map((slug) => cleanSlug(String(slug))).filter(Boolean)));
}

async function getLatestPaidOrder(email: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("order_code, student_name, email, phone, course_slug, course_title")
    .eq("status", "paid")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as PaidOrderForPasswordReset | null;
}

async function verifyStudentPasswordLogin(email: string, password: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, reason: "Thiếu cấu hình kiểm tra đăng nhập Supabase." };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { ok: false, reason: error?.message ?? "Không xác thực được tài khoản học viên." };
  }

  await supabase.auth.signOut();

  return { ok: true };
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:students:password-reset"),
      limit: 20,
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
          { ok: false, message: "Bạn không có quyền cấp lại mật khẩu cho học viên." },
          { status: 403 },
        );
      }
    }

    const body = (await request.json()) as {
      email?: string;
      name?: string;
      phone?: string;
      courseSlug?: string;
      courseSlugs?: string[];
    };
    const email = cleanEmail(body.email);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, message: "Email học viên không hợp lệ." }, { status: 400 });
    }

    const latestPaidOrder = await getLatestPaidOrder(email);
    const courses = await getCourses();
    const requestedCourseSlugs = normalizeCourseSlugs(body);
    const courseSlugs =
      requestedCourseSlugs.length > 0
        ? requestedCourseSlugs
        : latestPaidOrder?.course_slug
          ? [cleanSlug(latestPaidOrder.course_slug)]
          : [];
    const coursesToEmail = courseSlugs
      .map((courseSlug) => courses.find((course) => course.slug === courseSlug))
      .filter((course): course is (typeof courses)[number] => Boolean(course));
    const courseTitles =
      coursesToEmail.length > 0
        ? coursesToEmail.map((course) => course.title)
        : latestPaidOrder?.course_title
          ? [latestPaidOrder.course_title]
          : [];
    const name = cleanText(body.name, 120) || latestPaidOrder?.student_name || email;
    const phone = cleanPhone(body.phone) || cleanPhone(latestPaidOrder?.phone);

    if (
      !name ||
      !email ||
      !phone ||
      courseSlugs.length === 0 ||
      courseSlugs.some((courseSlug) => !isValidSlug(courseSlug)) ||
      courseTitles.length === 0
    ) {
      return NextResponse.json(
        { ok: false, message: "Thiếu tên, số điện thoại hoặc khóa học để cấp lại mật khẩu." },
        { status: 400 },
      );
    }

    const studentAccount = await ensureStudentAccountForAccessGrant(
      {
        studentName: name,
        email,
        phone,
        courseSlug: courseSlugs.join(","),
        courseTitle: courseTitles.join(" | "),
        sourceOrderCode: latestPaidOrder?.order_code,
      },
      {
        forcePasswordUpdate: true,
      },
    );

    if (!studentAccount.ok || !studentAccount.temporaryPassword) {
      return NextResponse.json(
        { ok: false, message: `Chưa cấp lại được mật khẩu học viên: ${studentAccount.reason ?? "không tạo được mật khẩu tạm"}` },
        { status: 500 },
      );
    }

    const loginVerification = await verifyStudentPasswordLogin(email, studentAccount.temporaryPassword);

    if (!loginVerification.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: `Đã cấp lại mật khẩu nhưng chưa gửi email vì kiểm tra đăng nhập thất bại: ${
            loginVerification.reason ?? "không rõ lý do"
          }`,
        },
        { status: 500 },
      );
    }

    const emailResult = await sendStudentAccessEmail(
      {
        action: "grant",
        studentName: name,
        email,
        courseTitles,
      },
      {
        account: {
          email: studentAccount.email,
          temporaryPassword: studentAccount.temporaryPassword,
          created: studentAccount.created,
          mustChangePassword: true,
        },
      },
    );

    if (!emailResult.ok || emailResult.skipped) {
      await logStudentActivity({
        userId: studentAccount.userId,
        studentEmail: email,
        studentPhone: phone,
        eventType: "payment_email_failed",
        eventTitle: "Gửi email cấp lại mật khẩu thất bại",
        eventDescription: emailResult.reason ?? "Không rõ lý do",
        status: "failed",
        actorType: "admin",
        actorId: adminActor?.id ?? null,
        actorEmail: adminActor?.email ?? null,
        metadata: { courseSlugs, sourceOrderCode: latestPaidOrder?.order_code ?? null },
      });
      return NextResponse.json(
        {
          ok: false,
          message: `Đã cấp lại mật khẩu nhưng chưa gửi được email cho khách: ${
            emailResult.reason ?? "không rõ lý do"
          }`,
        },
        { status: 500 },
      );
    }

    await logStudentActivity({
      userId: studentAccount.userId,
      studentEmail: email,
      studentPhone: phone,
      eventType: "password_changed",
      eventTitle: "Admin đã cấp lại mật khẩu học viên",
      eventDescription: "Mật khẩu mới đã được verify bằng đăng nhập Supabase anon trước khi gửi email.",
      status: "success",
      actorType: "admin",
      actorId: adminActor?.id ?? null,
      actorEmail: adminActor?.email ?? null,
      metadata: { courseSlugs, sourceOrderCode: latestPaidOrder?.order_code ?? null, emailSent: true },
    });

    invalidateAdminModules(["leads", "orders", "students", "activities"]);

    return NextResponse.json({
      ok: true,
      message: `Đã cấp lại mật khẩu, kiểm tra đăng nhập thành công và gửi email đăng nhập mới cho ${email}.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Không cấp lại được mật khẩu học viên.",
      },
      { status: 500 },
    );
  }
}
