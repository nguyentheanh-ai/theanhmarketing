import { NextResponse } from "next/server";
import { parseStudentProvisioningRequest, StudentProvisioningRequestError } from "@/lib/admin/student-provisioning-request";
import { canAccessAdminRole, getCurrentAuth } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { invalidateAdminModules } from "@/services/adminDataService";
import { provisionStudent, StudentProvisioningError } from "@/services/studentProvisioningService";
import {
  ProvisioningOperationBusyError,
  ProvisioningOperationConflictError,
  ProvisioningOperationLostLeaseError,
} from "@/services/studentProvisioningOperationService";

const MAX_REQUEST_BYTES = 16_384;
const noStoreHeaders = { "Cache-Control": "private, no-store" };

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: noStoreHeaders });
}

export async function POST(request: Request) {
  try {
    const { adminRole, user } = await getCurrentAuth();
    if (!user || !canAccessAdminRole(adminRole, ["owner", "editor"])) {
      return json({ ok: false, code: "FORBIDDEN", message: "Anh/chị không có quyền tạo học viên." }, 403);
    }

    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:students:grant"), limit: 30, windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.ok) return json({ ok: false, code: "RATE_LIMITED", message: "Quá nhiều yêu cầu. Vui lòng thử lại sau." }, 429);

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Yêu cầu phải dùng JSON." }, 415);
    }
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      return json({ ok: false, code: "REQUEST_TOO_LARGE", message: "Nội dung yêu cầu quá lớn." }, 413);
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
      return json({ ok: false, code: "REQUEST_TOO_LARGE", message: "Nội dung yêu cầu quá lớn." }, 413);
    }
    let decoded: unknown;
    try { decoded = JSON.parse(raw); } catch { return json({ ok: false, code: "INVALID_JSON", message: "JSON không hợp lệ." }, 400); }
    const input = parseStudentProvisioningRequest(decoded);
    const result = await provisionStudent({ ...input, actorId: user.id });
    invalidateAdminModules(["leads", "orders", "students"]);

    // The orchestration may hold a one-time credential internally. Admin UI intentionally never receives it.
    const safeResult = { ...result };
    delete safeResult.temporaryCredential;
    return json(safeResult, result.ok ? 200 : 207);
  } catch (error) {
    if (error instanceof StudentProvisioningRequestError
      || (error instanceof StudentProvisioningError && error.code === "PROVISIONING_VALIDATION_FAILED")) {
      return json({ ok: false, code: "INVALID_REQUEST", message: "Thông tin tạo học viên không hợp lệ." }, 400);
    }
    if (error instanceof ProvisioningOperationConflictError) {
      return json({ ok: false, code: "PROVISIONING_OPERATION_CONFLICT", message: "Mã thao tác đã được dùng cho thông tin khác." }, 409);
    }
    if (error instanceof ProvisioningOperationBusyError || error instanceof ProvisioningOperationLostLeaseError) {
      return json({ ok: false, code: "PROVISIONING_OPERATION_BUSY", message: "Thao tác đang được xử lý. Vui lòng thử lại với cùng mã thao tác." }, 409);
    }
    return json({ ok: false, code: "PROVISIONING_FAILED", message: "Hệ thống chưa thể hoàn tất thao tác tạo học viên." }, 500);
  }
}
