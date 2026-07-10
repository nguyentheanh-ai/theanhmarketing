import { NextResponse } from "next/server";
import { recordCrmEmailWebhookEvent } from "@/lib/crm-v2/data";
import { getEmailProvider } from "@/lib/crm-v2/email-provider";

function hasValidWebhookSecret(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true;
  return request.headers.get("x-resend-webhook-secret") === secret;
}

export async function POST(request: Request) {
  if (!hasValidWebhookSecret(request)) {
    return NextResponse.json({ ok: false, message: "Invalid webhook secret" }, { status: 401 });
  }

  const payload = await request.json();
  const events = await getEmailProvider().handleWebhook(payload);
  const results = await Promise.all(events.map((event) => recordCrmEmailWebhookEvent(event)));

  return NextResponse.json({
    ok: results.every((result) => result.ok),
    events: events.length,
    skipped: results.every((result) => result.skipped),
  });
}
