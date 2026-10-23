import type { ProductResult } from "./adsmind-admin";

/** Bot 24/7 activation codes, managed on the connect gateway (connect.theanhmarketing.com, Cloudflare KV). */
export type Bot247License = { code: string; instance: string; name?: string; created?: number; max?: number; uses?: number; lastAt?: number; by?: string; revoked: boolean };
const config = () => ({ url: process.env.BOT247_ADMIN_URL || "https://connect.theanhmarketing.com/v1/admin/licenses", token: process.env.BOT247_ADMIN_TOKEN || "" });

async function call<T>(init?: RequestInit): Promise<ProductResult<T>> {
  const { url, token } = config();
  if (token.length < 32) return { ok: false, reason: "not_configured" };
  try {
    const r = await fetch(url, { ...init, cache: "no-store", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, signal: AbortSignal.timeout(12_000) });
    const body = await r.json().catch(() => null);
    if (r.status === 401) return { ok: false, reason: "unauthorized", status: 401 };
    if (!r.ok || !body) return { ok: false, reason: "unavailable", status: r.status };
    return { ok: true, data: body as T };
  } catch { return { ok: false, reason: "unavailable" }; }
}

export const listBot247Licenses = () => call<{ licenses: Bot247License[] }>();
export const bot247LicenseAction = (input: { action: "new"; instance: string; name: string; max: number; by: string } | { action: "revoke" | "restore"; instance: string }) =>
  call<{ code?: string; instance: string; name?: string; max?: number; revoked?: boolean }>({ method: "POST", body: JSON.stringify(input) });
