import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth } from "@/lib/auth/session";
import { getSupportCalendar, validateSupportCalendarRange } from "@/services/supportCalendarService";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const { adminRole } = await getCurrentAuth();
  if (!canAccessAdminRole(adminRole, ["owner"])) return NextResponse.json({ ok: false, message: "Anh không có quyền xem lịch hỗ trợ." }, { status: 403, headers });
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  try { validateSupportCalendarRange(from, to); }
  catch { return NextResponse.json({ ok: false, message: "Chọn khoảng lịch hợp lệ, tối đa 42 ngày." }, { status: 400, headers }); }
  try { return NextResponse.json({ ok: true, snapshot: await getSupportCalendar(from, to) }, { headers }); }
  catch { return NextResponse.json({ ok: false, message: "Không tải được lịch hỗ trợ. Vui lòng thử lại." }, { status: 503, headers }); }
}
