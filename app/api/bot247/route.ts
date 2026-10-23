import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { createBot247Order } from "@/services/bot247Service";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({ key: rateLimitKey(request, "bot247:create"), limit: 8, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);
  try {
    const result = await createBot247Order(await request.json());
    return NextResponse.json(result, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Không tạo được đơn Bot 24/7." }, { status: 400, headers: noStoreHeaders });
  }
}
