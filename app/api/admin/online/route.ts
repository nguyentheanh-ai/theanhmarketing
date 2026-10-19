import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth } from "@/lib/auth/session";
import { readOnlineStudents } from "@/lib/cloudflare/student-presence";

const headers = { "Cache-Control": "private, no-store" };

// Students seen on learning pages in the last 5 minutes (owner/editor).
export async function GET() {
  const { adminRole } = await getCurrentAuth();
  if (!canAccessAdminRole(adminRole, ["owner", "editor"])) return NextResponse.json({ ok: false, message: "Bạn không có quyền xem." }, { status: 403, headers });
  try {
    const data = await readOnlineStudents();
    if (!data) return NextResponse.json({ ok: false, message: "Chỉ khả dụng khi dữ liệu chạy trên Cloudflare." }, { status: 503, headers });
    return NextResponse.json({ ok: true, ...data }, { headers });
  } catch {
    return NextResponse.json({ ok: false, message: "Chưa đọc được trạng thái online." }, { status: 503, headers });
  }
}
