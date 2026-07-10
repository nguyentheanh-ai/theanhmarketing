import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { listCrmV2Leads, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";

async function requireOwner() {
  if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
    const { adminRole } = await getCurrentAuth();
    return canAccessAdminRole(adminRole, ["owner"]);
  }

  return true;
}

export async function GET(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "admin:crm-v2:leads"),
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

  if (!(await requireOwner())) {
    return NextResponse.json({ ok: false, message: "Bạn không có quyền xem CRM v2." }, { status: 403 });
  }

  if (!isCrmV2Enabled()) {
    return NextResponse.json({ ok: false, disabled: true, message: "CRM_V2_ENABLED=false" }, { status: 404 });
  }

  const url = new URL(request.url);
  const query = normalizeCrmListQuery(Object.fromEntries(url.searchParams.entries()));
  const result = await listCrmV2Leads(query);

  return NextResponse.json({ ok: true, ...result });
}
