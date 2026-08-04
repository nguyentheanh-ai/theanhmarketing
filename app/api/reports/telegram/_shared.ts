import { NextResponse } from "next/server";

import type { TelegramBusinessReportSlot } from "@/lib/reports/telegram-business-day";
import { runTelegramBusinessReport } from "@/services/telegramBusinessReportService";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("Authorization");
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

export async function handleTelegramBusinessReportRequest(
  request: Request,
  slot: TelegramBusinessReportSlot,
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let test = false;
  if (request.method === "POST") {
    const payload = await request.json().catch(() => null) as { test?: unknown } | null;
    test = payload?.test === true;
  }

  const result = await runTelegramBusinessReport({ slot, test });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
