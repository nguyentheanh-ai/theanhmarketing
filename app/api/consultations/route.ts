import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { createConsultationRequest } from "@/services/consultationService";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({ key: rateLimitKey(request, "consultations:create"), limit: 8, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

  try {
    const result = await createConsultationRequest(await request.json());
    return NextResponse.json(result, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Không tạo được yêu cầu tư vấn." }, { status: 400, headers: noStoreHeaders });
  }
}
