// Mã kích hoạt Bot 24/7 nằm ở cổng trung tâm connect.theanhmarketing.com (worker bot247-connect, kho KV act:<mã>).
// Website chỉ gọi API quản trị của cổng bằng secret BOT247_GATEWAY_ADMIN_TOKEN (= ADMIN_TOKEN của cổng), không lưu mã trong D1.
// Cấp mã theo đơn là idempotent ở cổng (order:<MÃ ĐƠN>): webhook gọi lại bao nhiêu lần cũng ra đúng một mã.
export type Bot247License = {
  code: string; instance: string; name?: string; email?: string; phone?: string; note?: string; orderCode?: string;
  created?: number; max?: number; uses?: number; lastAt?: number | null; revoked?: boolean; tunnel?: boolean;
  version?: { v?: string; platform?: string; seen?: number } | null; existing?: boolean;
};
export type Bot247LicenseAction =
  | { action: "new"; name: string; email?: string; phone?: string; note?: string; orderCode?: string; max?: number; by?: string }
  | { action: "add_uses"; code: string; n?: number }
  | { action: "update"; code: string; name?: string; email?: string; phone?: string; note?: string }
  | { action: "revoke" | "restore"; instance: string };

export class Bot247GatewayError extends Error {}

function config() {
  const token = process.env.BOT247_GATEWAY_ADMIN_TOKEN || "";
  const base = (process.env.BOT247_GATEWAY_URL || "https://connect.theanhmarketing.com").replace(/\/$/, "");
  if (token.length < 32) throw new Bot247GatewayError("Chưa cấu hình BOT247_GATEWAY_ADMIN_TOKEN cho website.");
  return { token, url: `${base}/v1/admin/licenses` };
}

async function call<T>(init: RequestInit = {}): Promise<T> {
  const { token, url } = config();
  let response: Response;
  try {
    response = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  } catch { throw new Bot247GatewayError("Không gọi được cổng Bot 24/7."); }
  const body = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok || !body) throw new Bot247GatewayError(body?.error || `Cổng Bot 24/7 báo lỗi ${response.status}.`);
  return body;
}

export async function listBot247Licenses() {
  return (await call<{ licenses: Bot247License[] }>()).licenses || [];
}

export async function bot247LicenseAction(body: Bot247LicenseAction) {
  return call<Bot247License & { ok?: boolean }>({ method: "POST", body: JSON.stringify(body) });
}

/** Cấp (hoặc lấy lại) mã cho đơn Bot đã thanh toán. Lỗi → null, email vẫn gửi; CRM hiện đơn thiếu mã để cấp tay. */
export async function ensureBot247LicenseForOrder(order: { orderCode: string; studentName?: string; email?: string; phone?: string }) {
  try {
    const license = await bot247LicenseAction({ action: "new", name: order.studentName || order.email || order.orderCode, email: order.email, phone: order.phone, orderCode: order.orderCode, note: "Tự cấp khi thanh toán", by: "website" });
    return /^B247-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(license.code) ? license.code : null;
  } catch (error) {
    console.warn("bot247_license_issue_failed", order.orderCode, error instanceof Error ? error.message : "");
    return null;
  }
}
