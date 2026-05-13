import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { createPaymentOrder } from "@/services/orderService";

export async function POST(request: Request) {
  try {
    const auth = await getCurrentAuth();
    const user = auth.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Ban can dang nhap truoc khi thanh toan." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      courseSlug?: string;
      courseSlugs?: string[];
    };

    const studentName = String(user.user_metadata?.full_name ?? "").trim() || user.email || "Hoc vien";
    const email = user.email ?? "";
    const phone = String(user.user_metadata?.phone ?? "").trim() || "Chua cap nhat";

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "Tai khoan chua co email hop le de tao don thanh toan." },
        { status: 400 },
      );
    }

    const order = await createPaymentOrder({
      studentName,
      email,
      phone,
      courseSlug: body.courseSlug,
      courseSlugs: body.courseSlugs,
    });

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Khong tao duoc don thanh toan.",
      },
      { status: 500 },
    );
  }
}
