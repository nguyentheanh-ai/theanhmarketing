import { NextResponse } from "next/server";

import type { TelegramBusinessReportSlot } from "@/lib/reports/telegram-business-day";
import { runTelegramBusinessReport } from "@/services/telegramBusinessReportService";

function isAuthorized(request: Request) {
  const authorization = request.headers.get("Authorization");
  const acceptedSecrets = [process.env.CRON_SECRET, process.env.TELEGRAM_REPORT_SECRET]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return acceptedSecrets.some((secret) => authorization === `Bearer ${secret}`);
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
