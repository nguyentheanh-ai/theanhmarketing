import { NextResponse } from "next/server";

import { dispatchDueEmailCampaigns } from "@/lib/email/scheduled-campaign";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("Authorization") === `Bearer ${secret}`);
}

async function handle(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await dispatchDueEmailCampaigns();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}

export const GET = handle;
export const POST = handle;
