import { NextResponse } from "next/server";
import { verifySepayApiKey } from "@/lib/payments/sepay";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { notifyAccountingForPaidOrder } from "@/services/accountingNotificationService";
import { getPaymentOrder } from "@/services/orderService";

export const runtime = "nodejs";

const MAX_ORDER_CODES = 50;
const orderCodePattern = /^TAM[A-Z0-9]+$/;

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "payment:accounting-retry"),
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

  if (!verifySepayApiKey(request.headers)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let rawOrderCodes: unknown;
  try {
    const body = (await request.json()) as { orderCodes?: unknown };
    rawOrderCodes = body.orderCodes;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (!Array.isArray(rawOrderCodes)) {
    return NextResponse.json({ ok: false, message: "orderCodes must be an array." }, { status: 400 });
  }

  const orderCodes = [...new Set(
    rawOrderCodes
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toUpperCase())
      .filter((value) => orderCodePattern.test(value)),
  )];

  if (orderCodes.length === 0 || orderCodes.length > MAX_ORDER_CODES) {
    return NextResponse.json(
      { ok: false, message: `Provide between 1 and ${MAX_ORDER_CODES} valid order codes.` },
      { status: 400 },
    );
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const orderCode of orderCodes) {
    const order = await getPaymentOrder(orderCode);
    if (!order) {
      skipped += 1;
      continue;
    }

    const result = await notifyAccountingForPaidOrder(order);
    if (result.ok && !result.skipped) sent += 1;
    else if (result.skipped) skipped += 1;
    else failed += 1;
  }

  return NextResponse.json(
    {
      ok: failed === 0,
      scanned: orderCodes.length,
      sent,
      skipped,
      failed,
    },
    { status: failed > 0 ? 207 : 200 },
  );
}
