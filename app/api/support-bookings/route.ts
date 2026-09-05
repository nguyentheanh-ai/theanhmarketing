import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { getEligibleSupportCustomer, reserveSupportBooking, SupportBookingConflictError } from "@/services/supportBookingService";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "support-bookings:create"),
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

  try {
    const { user } = await getCurrentAuth();
    const customer = user?.email ? await getEligibleSupportCustomer(user.email, user.user_metadata) : null;
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Thông tin đặt lịch không hợp lệ.");
    const result = await reserveSupportBooking({
      ...body,
      customerName: customer?.customerName ?? body.customerName,
      email: customer?.email ?? body.email,
      phone: customer?.phone || body.phone,
    }, new Date(), customer ? "student" : "consultation");
    return NextResponse.json({ ok: true, ...result }, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof SupportBookingConflictError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 409, headers: noStoreHeaders });
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không tạo được lịch hỗ trợ." },
      { status: 400, headers: noStoreHeaders },
    );
  }
}
