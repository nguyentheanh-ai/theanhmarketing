import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";
import { parseSalesCareInput } from "@/lib/admin/sales-care";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { listAdminCustomerProfiles } from "@/services/adminCustomerService";
import { getSalesCareHistory, saveSalesCare } from "@/services/salesCareService";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
async function handle(request: Request, write: boolean) {
  const auth = await getCurrentAuth();
  if (!auth.user || !["owner", "editor"].includes(auth.adminRole || "")) return json({ ok: false, message: "Không có quyền chăm sóc khách hàng." }, 403);
  if (!isCrmV2Enabled()) return json({ ok: false, message: "CRM hiện chưa khả dụng." }, 404);
  if (write && (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json"))) {
    return json({ ok: false, message: "Yêu cầu không hợp lệ. Hãy tải lại trang." }, 403);
  }
  const limit = checkRateLimit({ key: rateLimitKey(request, `admin:sales-care:${auth.user.id}`), limit: 60, windowMs: 600_000 });
  if (!limit.ok) return json({ ok: false, message: "Quá nhiều yêu cầu. Vui lòng thử lại sau." }, 429);
  const input = write ? parseSalesCareInput(await request.json().catch(() => null)) : null;
  const customerId = write ? input?.customerId : new URL(request.url).searchParams.get("customerId");
  if (!customerId || customerId.length > 500 || (write && !input)) return json({ ok: false, message: "Khách hàng, trạng thái hoặc ghi chú không hợp lệ (tối đa 1.000 ký tự)." }, 400);
  try {
    const records = await listAdminCustomerProfiles({ includeProspects: auth.adminRole === "owner" });
    const record = records.find((row) => row.id === customerId);
    if (!record) return json({ ok: false, message: "Khách hàng không thuộc phạm vi truy cập." }, 404);
    if (!write) return json({ ok: true, history: await getSalesCareHistory(record) });
    const name = auth.user.user_metadata?.full_name || auth.user.user_metadata?.name;
    const saved = await saveSalesCare(record, input!, { id: auth.user.id, email: auth.user.email, name: typeof name === "string" ? name : auth.user.email || "Quản trị viên" });
    return json({ ok: true, saved });
  } catch {
    return json({ ok: false, message: "Chưa xác nhận được dữ liệu chăm sóc. Hãy tải lại lịch sử trước khi thử lại." }, 503);
  }
}
export async function GET(request: Request) { return handle(request, false); }
export async function POST(request: Request) { return handle(request, true); }
