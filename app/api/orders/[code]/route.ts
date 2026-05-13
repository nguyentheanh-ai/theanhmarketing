import { NextResponse } from "next/server";
import { getPaymentOrder } from "@/services/orderService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const order = await getPaymentOrder(code);

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Không tìm thấy đơn thanh toán." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, order });
}
