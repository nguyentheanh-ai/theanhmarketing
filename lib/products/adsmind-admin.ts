/** AdsMind (adsmind.vn) admin data, read server-to-server. Data stays in AdsMind; this site never stores it. */
export type AdsMindPlanId = "7d" | "1m" | "6m" | "12m";
export const adsmindPlanNames: Record<AdsMindPlanId, string> = { "7d": "7 ngày", "1m": "1 tháng", "6m": "6 tháng", "12m": "12 tháng" };
export type AdsMindOrder = { code: string; email: string; plan: string; amount: number; days: number; status: string; createdAt: string; paidAt: string | null; paidAmount: number | null; grantedBy: string | null };
export type AdsMindSubscription = { userId: string; email: string; plan: string; startedAt: string; expiresAt: string; active: boolean; daysLeft: number };
export type AdsMindOverview = { orders: AdsMindOrder[]; subs: AdsMindSubscription[]; revenueThisMonth: number; active: number; signups: number | null; termsAccepted: number | null; fetchedAt: string };
export type ProductResult<T> = { ok: true; data: T } | { ok: false; reason: "not_configured" | "unauthorized" | "unavailable"; status?: number };

const config = () => ({ url: process.env.ADSMIND_ADMIN_API_URL || "https://adsmind.vn/api/billing/internal", token: process.env.ADSMIND_ADMIN_API_TOKEN || "" });

async function call<T>(init?: RequestInit): Promise<ProductResult<T>> {
  const { url, token } = config();
  if (token.length < 32) return { ok: false, reason: "not_configured" };
  try {
    const r = await fetch(url, { ...init, cache: "no-store", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(12_000) });
    const body = await r.json().catch(() => null);
    if (r.status === 401) return { ok: false, reason: "unauthorized", status: 401 };
    if (!r.ok || !body) return { ok: false, reason: "unavailable", status: r.status };
    return { ok: true, data: body as T };
  } catch { return { ok: false, reason: "unavailable" }; }
}

export const getAdsMindOverview = () => call<AdsMindOverview & { status: string }>();
export const grantAdsMindPlan = (email: string, plan: AdsMindPlanId, by: string) =>
  call<{ status: string; email?: string; expiresAt?: string }>({ method: "POST", body: JSON.stringify({ action: "grant", email, plan, by }) });
