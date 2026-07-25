import { NextResponse } from "next/server";
import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
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

  const { user } = await getCurrentAuth();
  if (isAuthGuardEnabled() && !user?.email) {
    return NextResponse.json({ ok: false, message: "Vui lòng đăng nhập tài khoản học viên để đặt lịch hỗ trợ." }, { status: 401, headers: noStoreHeaders });
  }
  const customer = await getEligibleSupportCustomer(user?.email ?? "", user?.user_metadata);
  if (!customer) {
    return NextResponse.json({ ok: false, message: "Chỉ học viên đã mua khóa học mới được đặt lịch hỗ trợ." }, { status: 403, headers: noStoreHeaders });
  }

  try {
    const body = await request.json();
    const result = await reserveSupportBooking({
      ...body,
      customerName: customer.customerName,
      email: customer.email,
      phone: customer.phone,
    });
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
