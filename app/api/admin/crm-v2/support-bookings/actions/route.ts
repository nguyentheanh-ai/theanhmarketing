import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth } from "@/lib/auth/session";
import { setSupportBusyDate } from "@/services/supportBookingService";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const { adminRole, user } = await getCurrentAuth();
  if (!canAccessAdminRole(adminRole, ["owner"])) {
    return NextResponse.json({ ok: false, message: "Anh không có quyền quản lý lịch hỗ trợ." }, { status: 403, headers: noStoreHeaders });
  }
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || typeof body.date !== "string" || typeof body.busy !== "boolean") {
      return NextResponse.json({ ok: false, message: "Dữ liệu ngày bận không hợp lệ." }, { status: 400, headers: noStoreHeaders });
    }
    const result = await setSupportBusyDate({ date: body.date.slice(0, 10), busy: body.busy, note: typeof body.note === "string" ? body.note : "", actorId: user?.id ?? null });
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Không cập nhật được ngày bận." }, { status: 400, headers: noStoreHeaders });
  }
}
