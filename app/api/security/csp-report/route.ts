import { NextResponse } from "next/server";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "security:csp-report"),
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  try {
    const body = await request.json();
    logSecurityEvent({
      action: "csp_violation",
      request,
      detail: {
        blockedUri: body?.["csp-report"]?.["blocked-uri"] ?? body?.blockedURL ?? "unknown",
        violatedDirective:
          body?.["csp-report"]?.["violated-directive"] ?? body?.effectiveDirective ?? "unknown",
        documentUri: body?.["csp-report"]?.["document-uri"] ?? body?.documentURL ?? "unknown",
      },
    });
  } catch {
    logSecurityEvent({ action: "csp_violation_invalid_body", request });
  }

  return new NextResponse(null, { status: 204 });
}
