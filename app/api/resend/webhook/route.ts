import { NextResponse } from "next/server";
import { handleResendWebhookRequest } from "@/lib/email/resend-webhook";

export async function POST(request: Request) {
  const result = await handleResendWebhookRequest(request);
  return NextResponse.json(result, { status: result.status });
}
