import { NextResponse } from "next/server";
import { dispatchMetaPurchaseOrders } from "@/lib/meta/purchase-outbox";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("Authorization");
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await dispatchMetaPurchaseOrders({ limit: 10 });
  return NextResponse.json(
    { ok: !result.error, ...result },
    { status: result.error ? 503 : 200 },
  );
}

export const GET = handle;
export const POST = handle;
