import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { reserveSupportBooking, SupportBookingConflictError } from "@/services/supportBookingService";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "support-bookings:create"),
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

  try {
    const body = await request.json();
    const result = await reserveSupportBooking(body);
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
