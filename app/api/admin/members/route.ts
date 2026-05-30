import { NextResponse } from "next/server";
import { clearAdminMembersCache, listAdminMembers, updateAdminMemberRole } from "@/lib/admin/admin-members";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled, type AdminRole } from "@/lib/auth/session";

function isValidRole(value: unknown): value is AdminRole | "remove" {
  return value === "owner" || value === "editor" || value === "remove";
}

function shouldBlockOwnerAccess(adminRole: AdminRole | null) {
  return (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") && !canAccessAdminRole(adminRole, ["owner"]);
}

export async function GET(request: Request) {
  const { adminRole } = await getCurrentAuth();

  if (shouldBlockOwnerAccess(adminRole)) {
    return NextResponse.json({ ok: false, message: "Bạn cần quyền owner để xem thành viên admin." }, { status: 403 });
  }

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("force_refresh") === "1";
  const result = await listAdminMembers({ forceRefresh });

  return NextResponse.json({ ok: true, data: result });
}

export async function PATCH(request: Request) {
  const { adminRole } = await getCurrentAuth();

  if (shouldBlockOwnerAccess(adminRole)) {
    return NextResponse.json({ ok: false, message: "Bạn cần quyền owner để sửa thành viên admin." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as { userId?: string; role?: string } | null;
  const userId = payload?.userId?.trim() ?? "";

  if (!userId || !isValidRole(payload?.role)) {
    return NextResponse.json({ ok: false, message: "Thiếu userId hoặc role hợp lệ." }, { status: 400 });
  }

  try {
    const user = await updateAdminMemberRole({ userId, role: payload.role });
    clearAdminMembersCache();
    return NextResponse.json({ ok: true, data: { id: user.id, email: user.email } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không sửa được quyền admin." },
      { status: 500 },
    );
  }
}
