import { NextResponse } from "next/server";
import { dispatchPendingPaymentZnsOrders } from "@/lib/zalo/pending-payment-outbox";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("Authorization") === `Bearer ${secret}`,
  );
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await dispatchPendingPaymentZnsOrders({ limit: 10 });
  return NextResponse.json(
    { ok: !result.error, ...result },
    { status: result.error ? 503 : 200 },
  );
}

export const GET = handle;
export const POST = handle;
