import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth } from "@/lib/auth/session";
import { toPublicProvisioningResult } from "@/lib/admin/student-provisioning-response";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { readProvisioningOperation } from "@/services/studentProvisioningOperationService";

const noStoreHeaders = { "Cache-Control": "private, no-store" };
const operationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: noStoreHeaders });
}

export async function GET(request: Request) {
  try {
    const { adminRole, user } = await getCurrentAuth();
    if (!user || !canAccessAdminRole(adminRole, ["owner", "editor"])) {
      return json({ ok: false, code: "FORBIDDEN", message: "Anh/chị không có quyền xem thao tác này." }, 403);
    }
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:students:provisioning-status"), limit: 60, windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.ok) return json({ ok: false, code: "RATE_LIMITED", message: "Quá nhiều yêu cầu. Vui lòng thử lại sau." }, 429);

    const operationId = new URL(request.url).searchParams.get("operationId") ?? "";
    if (!operationIdPattern.test(operationId)) {
      return json({ ok: false, code: "INVALID_REQUEST", message: "Mã thao tác không hợp lệ." }, 400);
    }
    const operation = await readProvisioningOperation(operationId);
    if (!operation) return json({ ok: false, code: "NOT_FOUND", message: "Không tìm thấy thao tác." }, 404);
    const result = toPublicProvisioningResult(operation);
    if (!result) {
      return json({ ok: false, code: "NOT_READY", message: "Thao tác chưa có kết quả an toàn để tiếp tục." }, 409);
    }
    return json(result, 200);
  } catch {
    return json({ ok: false, code: "STATUS_FAILED", message: "Chưa thể tải trạng thái thao tác." }, 500);
  }
}
