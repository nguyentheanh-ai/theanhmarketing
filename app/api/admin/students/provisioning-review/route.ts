import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { toPublicProvisioningResult } from "@/lib/admin/student-provisioning-response";
import { resolveProvisioningEmailReview } from "@/services/studentProvisioningControlService";
import { readProvisioningOperation } from "@/services/studentProvisioningOperationService";

const noStoreHeaders = { "Cache-Control": "private, no-store" };
const operationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function json(body: unknown, status: number) { return NextResponse.json(body, { status, headers: noStoreHeaders }); }

export async function POST(request: Request) {
  try {
    const { adminRole, user } = await getCurrentAuth();
    if (!user || !canAccessAdminRole(adminRole, ["owner"])) {
      return json({ ok: false, code: "FORBIDDEN", message: "Chỉ chủ sở hữu được xác nhận trạng thái email." }, 403);
    }
    const rateLimit = checkRateLimit({ key: rateLimitKey(request, "admin:students:provisioning-review"), limit: 20, windowMs: 10 * 60 * 1000 });
    if (!rateLimit.ok) return json({ ok: false, code: "RATE_LIMITED", message: "Quá nhiều yêu cầu. Vui lòng thử lại sau." }, 429);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Yêu cầu phải dùng JSON." }, 415);
    }
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > 4096) {
      return json({ ok: false, code: "REQUEST_TOO_LARGE", message: "Nội dung yêu cầu quá lớn." }, 413);
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 4096) return json({ ok: false, code: "REQUEST_TOO_LARGE", message: "Nội dung yêu cầu quá lớn." }, 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json({ ok: false, code: "INVALID_JSON", message: "JSON không hợp lệ." }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false, code: "INVALID_REQUEST", message: "Yêu cầu không hợp lệ." }, 400);
    const record = body as Record<string, unknown>;
    if (Object.keys(record).some((key) => !["operationId", "resolution"].includes(key))
      || typeof record.operationId !== "string" || !operationIdPattern.test(record.operationId)
      || !["confirm_delivered", "confirm_not_delivered"].includes(String(record.resolution))) {
      return json({ ok: false, code: "INVALID_REQUEST", message: "Quyết định xác nhận không hợp lệ." }, 400);
    }
    const result = await resolveProvisioningEmailReview({
      operationId: record.operationId,
      resolution: record.resolution as "confirm_delivered" | "confirm_not_delivered",
    });
    const operation = await readProvisioningOperation(record.operationId);
    const publicResult = operation ? toPublicProvisioningResult(operation) : null;
    if (!publicResult) return json({ ok: false, code: "REVIEW_STATE_UNAVAILABLE", message: "Đã lưu quyết định nhưng chưa thể tải trạng thái mới." }, 409);
    return json({ ok: true, state: result.state, result: publicResult }, 200);
  } catch {
    return json({ ok: false, code: "REVIEW_FAILED", message: "Chưa thể lưu quyết định xác nhận email." }, 500);
  }
}
