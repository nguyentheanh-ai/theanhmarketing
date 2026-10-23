import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAuth } from "@/lib/auth/session";
import { bot247LicenseAction } from "@/lib/products/bot247-admin";
import { requireCrmV2OwnerRequest } from "../../_shared";

const instance = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{2,39}$/, "Mã máy chỉ gồm chữ thường, số, gạch ngang (3–40 ký tự).");
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("new"), instance, name: z.string().trim().max(120).default(""), max: z.coerce.number().int().min(1).max(20).default(5) }).strict(),
  z.object({ action: z.enum(["revoke", "restore"]), instance }).strict(),
]);
const reasons: Record<string, string> = { not_configured: "Chưa cấu hình khóa BOT247_ADMIN_TOKEN trên máy chủ.", unauthorized: "Cổng Bot 24/7 từ chối khóa quản trị. Kiểm tra lại khóa ở hai bên.", unavailable: "Chưa kết nối được cổng Bot 24/7. Thử lại sau giây lát." };

/** POST {action:new|revoke|restore, instance, name?, max?} → manage Bot 24/7 activation codes (owner only). */
export async function POST(request: Request) {
  const denied = await requireCrmV2OwnerRequest(request, "admin-products-bot247"); if (denied) return denied;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ ok: false, message: input.error.issues[0]?.message ?? "Thông tin chưa hợp lệ." }, { status: 400 });
  const { user } = await getCurrentAuth();
  const r = await bot247LicenseAction(input.data.action === "new" ? { ...input.data, by: user?.email ?? "admin" } : input.data);
  if (!r.ok) return NextResponse.json({ ok: false, message: reasons[r.reason] }, { status: 502 });
  revalidatePath("/admin/crm-v2/bot247");
  return NextResponse.json({ ok: true, ...r.data });
}
