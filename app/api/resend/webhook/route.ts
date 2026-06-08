import { NextResponse } from "next/server";
import { updateEmailLogFromResendEvent } from "@/services/emailLogService";

function hasValidWebhookSecret(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true;
  return request.headers.get("x-resend-webhook-secret") === secret;
}

export async function POST(request: Request) {
  if (!hasValidWebhookSecret(request)) {
    return NextResponse.json({ ok: false, message: "Invalid webhook secret" }, { status: 401 });
  }

  const event = (await request.json()) as { type: string; data?: { email_id?: string; to?: string[]; subject?: string } };
  const result = await updateEmailLogFromResendEvent(event);

  return NextResponse.json({ ok: result.ok, skipped: "skipped" in result ? result.skipped : false });
}
