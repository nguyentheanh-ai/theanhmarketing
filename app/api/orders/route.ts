import { NextResponse } from "next/server";
import { createPaymentOrder } from "@/services/orderService";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      studentName?: string;
      email?: string;
      phone?: string;
      courseSlug?: string;
      courseSlugs?: string[];
    };

    if (!body.studentName || !body.email || !body.phone) {
      return NextResponse.json(
        { ok: false, message: "Thiếu thông tin tạo đơn thanh toán." },
        { status: 400 },
      );
    }

    const order = await createPaymentOrder({
      studentName: body.studentName,
      email: body.email,
      phone: body.phone,
      courseSlug: body.courseSlug,
      courseSlugs: body.courseSlugs,
    });

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Không tạo được đơn thanh toán.",
      },
      { status: 500 },
    );
  }
}
