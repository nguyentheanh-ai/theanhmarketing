import { NextResponse } from "next/server";
import { requireCrmV2OwnerRequest } from "../../_shared";
import { getCurrentAuth } from "@/lib/auth/session";
import { bot247LicenseAction, Bot247GatewayError } from "@/lib/bot247/license-gateway";
import { buildBot247LicenseEmail, sendBot247LicenseEmail } from "@/lib/notifications/payment-success-email";

const noStore = { "Cache-Control": "private, no-store" };
const fail = (status: number, message: string) => NextResponse.json({ ok: false, message }, { status, headers: noStore });
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const CODE = /^B247-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const INSTANCE = /^[a-z0-9][a-z0-9-]{2,39}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bot 24/7 › Mã kích hoạt: tạo mã, +lượt, sửa, thu hồi / mở lại (gọi cổng), xem trước và gửi email mã cho khách.
export async function POST(request: Request) {
  const denied = await requireCrmV2OwnerRequest(request, "admin:crm-v2:bot247:actions");
  if (denied) return denied;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") return fail(400, "Thiếu thao tác.");
  const code = text(body.code, 19).toUpperCase(), instance = text(body.instance, 40);
  try {
    switch (body.action) {
      case "create": {
        const name = text(body.name, 120);
        if (!name) return fail(400, "Nhập tên khách.");
        const email = text(body.email, 160);
        if (email && !EMAIL.test(email)) return fail(400, "Email không hợp lệ.");
        const { user } = await getCurrentAuth();
        const license = await bot247LicenseAction({ action: "new", name, email, phone: text(body.phone, 30), note: text(body.note, 500), orderCode: text(body.orderCode, 40).toUpperCase() || undefined, by: user?.email || "admin" });
        return NextResponse.json({ ok: true, license }, { headers: noStore });
      }
      case "add_uses":
        if (!CODE.test(code)) return fail(400, "Mã kích hoạt không hợp lệ.");
        return NextResponse.json({ ok: true, license: await bot247LicenseAction({ action: "add_uses", code, n: 5 }) }, { headers: noStore });
      case "update":
        if (!CODE.test(code)) return fail(400, "Mã kích hoạt không hợp lệ.");
        return NextResponse.json({ ok: true, license: await bot247LicenseAction({ action: "update", code, name: text(body.name, 120), email: text(body.email, 160), phone: text(body.phone, 30), note: text(body.note, 500) }) }, { headers: noStore });
      case "revoke":
      case "restore":
        if (!INSTANCE.test(instance)) return fail(400, "Mã máy không hợp lệ.");
        return NextResponse.json({ ok: true, license: await bot247LicenseAction({ action: body.action, instance }) }, { headers: noStore });
      case "preview_email":
      case "send_email": {
        const email = text(body.email, 160), name = text(body.name, 120) || "bạn", orderCode = text(body.orderCode, 40).toUpperCase() || null;
        if (!CODE.test(code)) return fail(400, "Mã kích hoạt không hợp lệ.");
        if (!EMAIL.test(email)) return fail(400, "Khách chưa có email hợp lệ.");
        const input = { name, email, activationCode: code, orderCode };
        if (body.action === "preview_email") { const p = buildBot247LicenseEmail(input); return NextResponse.json({ ok: true, preview: { to: p.to, subject: p.subject, html: p.html, text: p.text } }, { headers: noStore }); }
        // Cùng mã + cùng người nhận trong 24 giờ chỉ gửi một lần (bấm đúp không gửi hai email)
        const result = await sendBot247LicenseEmail(input, { idempotencyKey: `tam-bot247-license/${code}/${email.toLowerCase()}/${new Date().toISOString().slice(0, 10)}` });
        return result.ok ? NextResponse.json({ ok: true, sent: true }, { headers: noStore }) : fail(502, "Chưa gửi được email. Thử lại sau.");
      }
      default:
        return fail(400, "Thao tác không hợp lệ.");
    }
  } catch (error) {
    return fail(error instanceof Bot247GatewayError ? 502 : 500, error instanceof Error ? error.message : "Không thực hiện được.");
  }
}
