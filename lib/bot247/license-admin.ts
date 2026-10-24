import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listBot247Licenses, type Bot247License } from "@/lib/bot247/license-gateway";

export type Bot247PaidOrder = { orderCode: string; studentName: string; email: string; phone: string; paidAt: string | null };
export type Bot247AdminSnapshot = { licenses: Bot247License[]; ordersWithoutLicense: Bot247PaidOrder[]; gatewayError: string };

// Đơn Bot 24/7 đã thanh toán (tối đa 500 đơn gần nhất)
export async function listPaidBot247Orders(): Promise<Bot247PaidOrder[]> {
  const client = createSupabaseAdminClient();
  if (!client) return [];
  const { data, error } = await client.from("orders").select("order_code,student_name,email,phone,paid_at")
    .eq("status", "paid").eq("course_slug", "bot-24-7").order("paid_at", { ascending: false }).limit(500);
  if (error) throw new Error("Không đọc được đơn Bot 24/7.");
  return (data || []).map((row: Record<string, unknown>) => ({
    orderCode: String(row.order_code || ""), studentName: String(row.student_name || ""), email: String(row.email || ""), phone: String(row.phone || ""), paidAt: typeof row.paid_at === "string" ? row.paid_at : null,
  }));
}

/** Danh sách mã ở cổng + đơn đã thanh toán chưa có mã (cổng lỗi lúc thanh toán → anh bấm Tạo mã). */
export async function getBot247AdminSnapshot(): Promise<Bot247AdminSnapshot> {
  const [licenses, orders] = await Promise.allSettled([listBot247Licenses(), listPaidBot247Orders()]);
  const list = licenses.status === "fulfilled" ? licenses.value : [];
  const issued = new Set(list.map((l) => String(l.orderCode || "").toUpperCase()).filter(Boolean));
  return {
    licenses: list,
    // Chỉ cảnh báo khi đọc được cổng; cổng lỗi thì chưa biết đơn nào đã có mã
    ordersWithoutLicense: licenses.status === "fulfilled" && orders.status === "fulfilled" ? orders.value.filter((o) => !issued.has(o.orderCode.toUpperCase())) : [],
    gatewayError: licenses.status === "rejected" ? (licenses.reason instanceof Error ? licenses.reason.message : "Không đọc được cổng Bot 24/7.") : "",
  };
}
