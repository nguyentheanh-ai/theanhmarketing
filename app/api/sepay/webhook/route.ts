import { NextResponse } from "next/server";
import { verifySepayApiKey, type SepayWebhookPayload } from "@/lib/payments/sepay";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { confirmOrderFromSepay } from "@/services/orderService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "sepay:webhook"),
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    logSecurityEvent({ action: "sepay_webhook_rate_limited", request });
    return rateLimitResponse(rateLimit.resetAt);
  }

  if (!verifySepayApiKey(request.headers)) {
    logSecurityEvent({ action: "sepay_webhook_bad_api_key", request });
    return NextResponse.json({ success: false, message: "Sai API key Sepay." }, { status: 401 });
  }

  let payload: SepayWebhookPayload;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      payload = (await request.json()) as SepayWebhookPayload;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      payload = Object.fromEntries(form.entries()) as SepayWebhookPayload;
    } else {
      payload = (await request.json()) as SepayWebhookPayload;
    }
  } catch {
    logSecurityEvent({ action: "sepay_webhook_invalid_payload", request });
    return NextResponse.json(
      { success: false, message: "Payload webhook Sepay không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    await confirmOrderFromSepay(payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    logSecurityEvent({
      action: "sepay_webhook_rejected",
      request,
      detail: { reason: error instanceof Error ? error.message : "unknown" },
    });
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Không xử lý được webhook Sepay.",
      },
      { status: 422 },
    );
  }
}
