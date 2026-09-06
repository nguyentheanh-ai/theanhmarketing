import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { cleanEmail, isValidEmail } from "@/lib/security/validation";
import { customerAccountState, findCustomerAccount, isProtectedCustomerAccount, setCustomerAccountBlocked } from "@/services/adminCustomerService";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth.user || !auth.adminRole) return NextResponse.json({ ok: false, message: "Không có quyền đọc hồ sơ." }, { status: 403 });
  const email = cleanEmail(new URL(request.url).searchParams.get("email"));
  if (!isValidEmail(email)) return NextResponse.json({ ok: false, message: "Email không hợp lệ." }, { status: 400 });
  try {
    const user = await findCustomerAccount(email);
    return NextResponse.json({ ok: true, ...customerAccountState(user), protected: isProtectedCustomerAccount(email, user, auth.user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ ok: false, message: "Chưa đọc được trạng thái tài khoản. Hãy thử tải lại." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth.user || auth.adminRole !== "owner") return NextResponse.json({ ok: false, message: "Chỉ chủ hệ thống được chặn tài khoản." }, { status: 403 });
  const limit = checkRateLimit({ key: rateLimitKey(request, "admin:customer:block"), limit: 30, windowMs: 600_000 });
  if (!limit.ok) return rateLimitResponse(limit.resetAt);
  try {
    const body = await request.json() as { email?: string; blocked?: boolean };
    const email = cleanEmail(body.email);
    if (!isValidEmail(email) || typeof body.blocked !== "boolean") return NextResponse.json({ ok: false, message: "Email hoặc trạng thái không hợp lệ." }, { status: 400 });
    const result = await setCustomerAccountBlocked(email, body.blocked, { id: auth.user.id, email: auth.user.email });
    return NextResponse.json({ ok: true, ...result, message: `${body.blocked ? "Đã chặn đăng nhập tài khoản." : "Đã mở lại đăng nhập tài khoản."}${result.auditRecorded ? "" : " Nhật ký chưa ghi được; hãy kiểm tra lại."}` });
  } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Không cập nhật được tài khoản." }, { status: 400 }); }
}
