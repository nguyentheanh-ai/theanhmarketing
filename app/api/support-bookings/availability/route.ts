import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { getSupportAvailability } from "@/services/supportBookingService";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "support-bookings:availability"),
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

  try {
    const availability = await getSupportAvailability();
    return NextResponse.json({ ok: true, ...availability }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không tải được lịch hỗ trợ." },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
