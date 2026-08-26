import { NextResponse } from "next/server";

import { verifyEmailUnsubscribeToken } from "@/lib/email/scheduled-campaign";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const token = url.searchParams.get("token") || String(form?.get("token") ?? "");
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || "";
  const email = secret ? verifyEmailUnsubscribeToken(token, secret) : null;
  if (!email) return NextResponse.json({ ok: false, message: "Liên kết hủy nhận email không hợp lệ." }, { status: 400 });

  const client = createSupabaseAdminClient();
  if (!client) return NextResponse.json({ ok: false, message: "Hệ thống chưa sẵn sàng." }, { status: 503 });
  const now = new Date().toISOString();
  const suppression = await client.schema("crm_v2").from("email_suppression_list").upsert(
    {
      contact_id: null,
      email,
      normalized_email: email,
      reason: "unsubscribed",
      provider: "website",
      suppressed_at: now,
      metadata: { source: "one-click-unsubscribe" },
    },
    { onConflict: "normalized_email,reason" },
  );
  if (suppression.error) return NextResponse.json({ ok: false, message: "Không thể cập nhật yêu cầu hủy nhận email." }, { status: 500 });
  await client.schema("crm_v2").from("contacts").update({ marketing_consent: false, unsubscribed_at: now, updated_at: now }).eq("normalized_email", email);

  const acceptsHtml = request.headers.get("accept")?.includes("text/html");
  return acceptsHtml
    ? NextResponse.redirect(new URL("/unsubscribe?done=1", request.url), 303)
    : NextResponse.json({ ok: true });
}
