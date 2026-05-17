import { NextResponse } from "next/server";
import { toPublicPaymentOrder } from "@/lib/security/public-order";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanText } from "@/lib/security/validation";
import { getPaymentOrder } from "@/services/orderService";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "orders:lookup"),
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  const { code } = await params;
  const orderCode = cleanText(code, 80).toUpperCase();
  const order = await getPaymentOrder(orderCode);

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Không tìm thấy đơn thanh toán." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, order: toPublicPaymentOrder(order) });
}
