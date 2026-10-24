import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, isValidEmail } from "@/lib/security/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listBot247Licenses } from "@/lib/bot247/license-gateway";
import { sendBot247LoginEmail } from "@/lib/notifications/payment-success-email";

const noStore = { "Cache-Control": "private, no-store" };
// Luôn trả cùng một câu (có mua hay không) để không dò được email nào là khách
const DONE = { ok: true, message: "Nếu email này đã mua Bot 24/7, link đăng nhập vừa được gửi tới hộp thư. Xem cả mục Spam hoặc Quảng cáo." };

// Khách đã mua: đơn bot-24-7 đã thanh toán (dùng mã đơn), hoặc mã kích hoạt cấp tay trong CRM (dùng mã kích hoạt)
async function findBuyer(email: string) {
  const client = createSupabaseAdminClient();
  if (client) {
    const { data } = await client.from("orders").select("order_code,student_name").eq("status", "paid").eq("course_slug", "bot-24-7").eq("email", email).order("paid_at", { ascending: false }).limit(1);
    const row = data?.[0] as { order_code?: string; student_name?: string } | undefined;
    if (row?.order_code) return { accessId: row.order_code, name: row.student_name || "" };
  }
  const license = (await listBot247Licenses().catch(() => [])).find((l) => !l.revoked && String(l.email || "").toLowerCase() === email);
  return license ? { accessId: license.orderCode || license.code, name: license.name || "" } : null;
}

export async function POST(request: Request) {
  const ip = checkRateLimit({ key: rateLimitKey(request, "bot247:login"), limit: 8, windowMs: 10 * 60 * 1000 });
  if (!ip.ok) return rateLimitResponse(ip.resetAt);
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = cleanEmail(body?.email);
  if (!email || !isValidEmail(email)) return NextResponse.json({ ok: false, message: "Email chưa đúng định dạng." }, { status: 400, headers: noStore });
  // Một email tối đa 3 lần / 10 phút (chặn gửi dồn vào hộp thư khách)
  const perEmail = checkRateLimit({ key: `bot247:login:email:${email}`, limit: 3, windowMs: 10 * 60 * 1000 });
  if (!perEmail.ok) return NextResponse.json(DONE, { headers: noStore });
  try {
    const buyer = await findBuyer(email);
    if (buyer) {
      const result = await sendBot247LoginEmail({ email, name: buyer.name, accessId: buyer.accessId }, { idempotencyKey: `tam-bot247-login/${buyer.accessId}/${Math.floor(Date.now() / 120_000)}` });
      if (!result.ok) console.warn("bot247_login_email_failed", result.reason);
    }
  } catch (error) {
    console.warn("bot247_login_lookup_failed", error instanceof Error ? error.message : "");
  }
  return NextResponse.json(DONE, { headers: noStore });
}
