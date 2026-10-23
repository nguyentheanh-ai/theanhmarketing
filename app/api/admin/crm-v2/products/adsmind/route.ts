import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAuth } from "@/lib/auth/session";
import { grantAdsMindPlan } from "@/lib/products/adsmind-admin";
import { requireCrmV2OwnerRequest } from "../../_shared";

const schema = z.object({ email: z.string().trim().email().max(254), plan: z.enum(["7d", "1m", "6m", "12m"]) }).strict();
const reasons: Record<string, string> = { not_configured: "Chưa cấu hình khóa ADSMIND_ADMIN_API_TOKEN trên máy chủ.", unauthorized: "AdsMind từ chối khóa quản trị. Kiểm tra lại khóa ở hai bên.", unavailable: "Chưa kết nối được AdsMind. Thử lại sau giây lát." };

/** POST {email, plan} → give or extend an AdsMind plan by hand (owner only). */
export async function POST(request: Request) {
  const denied = await requireCrmV2OwnerRequest(request, "admin-products-adsmind"); if (denied) return denied;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ ok: false, message: "Email hoặc gói chưa hợp lệ." }, { status: 400 });
  const { user } = await getCurrentAuth();
  const r = await grantAdsMindPlan(input.data.email.toLowerCase(), input.data.plan, user?.email ?? "admin");
  if (!r.ok) return NextResponse.json({ ok: false, message: r.status === 404 ? "Email này chưa có tài khoản AdsMind." : reasons[r.reason] }, { status: r.status === 404 ? 404 : 502 });
  revalidatePath("/admin/crm-v2/adsmind");
  return NextResponse.json({ ok: true, expiresAt: r.data.expiresAt ?? null });
}
