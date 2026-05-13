import { NextResponse } from "next/server";
import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createManualPaidOrder } from "@/services/orderService";

export async function POST(request: Request) {
  try {
    if (isAuthGuardEnabled()) {
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
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const courseSlug = String(body.courseSlug ?? "").trim();
    const paymentStatus = String(body.paymentStatus ?? "");
    const source = String(body.source ?? "Admin").trim() || "Admin";
    const note = String(body.note ?? "").trim();

    if (!name || !phone || !email || !courseSlug) {
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
