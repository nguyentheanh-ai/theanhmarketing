import { NextResponse } from "next/server";

import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";

export async function requireCrmV2OwnerRequest(request: Request, scope: string) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, scope),
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

  if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
    const { adminRole } = await getCurrentAuth();
    if (!canAccessAdminRole(adminRole, ["owner"])) {
      return NextResponse.json({ ok: false, message: "Bạn không có quyền xem CRM v2." }, { status: 403 });
    }
  }

  if (!isCrmV2Enabled()) {
    return NextResponse.json({ ok: false, disabled: true, message: "CRM_V2_ENABLED=false" }, { status: 404 });
  }

  return null;
}
