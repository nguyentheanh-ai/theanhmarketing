import { NextResponse } from "next/server";
import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import {
  cleanEmail,
  cleanPhone,
  cleanSlug,
  cleanText,
  isValidEmail,
  isValidPhone,
  isValidSlug,
} from "@/lib/security/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createManualPaidOrder } from "@/services/orderService";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:students:grant"),
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { isAdmin } = await getCurrentAuth();

      if (!isAdmin) {
        return NextResponse.json(
          { ok: false, message: "Bạn không có quyền cấp quyền học viên." },
          { status: 403 },
        );
      }
    }

    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      email?: string;
      courseSlug?: string;
      paymentStatus?: string;
      source?: string;
      note?: string;
    };
    const name = cleanText(body.name, 120);
    const phone = cleanPhone(body.phone);
    const email = cleanEmail(body.email);
    const courseSlug = cleanSlug(body.courseSlug);
    const paymentStatus = cleanText(body.paymentStatus, 30);
    const source = cleanText(body.source, 80) || "Admin";
    const note = cleanText(body.note, 500);

    if (
      !name ||
      !phone ||
      !email ||
      !courseSlug ||
      !isValidEmail(email) ||
      !isValidPhone(phone) ||
      !isValidSlug(courseSlug)
    ) {
      return NextResponse.json(
        { ok: false, message: "Thiếu tên, số điện thoại, email hoặc khóa học." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json(
        { ok: false, message: "Chưa cấu hình Supabase để lưu học viên." },
        { status: 500 },
      );
    }

    const { error: leadError } = await supabase.from("leads").insert({
      name,
      phone,
      email,
      source: `admin-student:${source}`,
      message: `Khóa học: ${courseSlug}\nTrạng thái: ${paymentStatus}\nGhi chú: ${note}`,
    });

    if (leadError) {
      return NextResponse.json(
        { ok: false, message: `Chưa lưu được hồ sơ: ${leadError.message}` },
        { status: 500 },
      );
    }

    if (paymentStatus === "paid") {
      const order = await createManualPaidOrder({
        studentName: name,
        email,
        phone,
        courseSlugs: [courseSlug],
        note,
      });

      return NextResponse.json({
        ok: true,
        message: `Đã lưu hồ sơ và cấp quyền học qua đơn ${order.orderCode}.`,
        order,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Đã lưu hồ sơ học viên. Quyền học sẽ được cấp khi trạng thái là đã thanh toán.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Không lưu được học viên.",
      },
      { status: 500 },
    );
  }
}
