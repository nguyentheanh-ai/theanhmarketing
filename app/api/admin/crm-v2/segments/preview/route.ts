import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { getCrmV2SegmentPreviewRows } from "@/lib/crm-v2/data";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";
import { estimateSegmentPreview } from "@/lib/crm-v2/segments";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import type { SegmentRules } from "@/lib/crm-v2/types";

async function requireOwner() {
  if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
    const { adminRole } = await getCurrentAuth();
    return canAccessAdminRole(adminRole, ["owner"]);
  }

  return true;
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "admin:crm-v2:segments-preview"),
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

  const body = (await request.json()) as { rules?: SegmentRules };
  const rules = body.rules ?? { combinator: "and", conditions: [] };
  const rows = await getCrmV2SegmentPreviewRows();

  return NextResponse.json({ ok: true, estimatedSize: estimateSegmentPreview(rules, rows) });
}
