import { createClient } from "@supabase/supabase-js";
import { createBoundedFetch } from "@/lib/supabase/bounded-fetch";
import { nativeDataClient } from "@/lib/cloudflare/native-data-mode";

export function createSupabaseAdminClient(options: { timeoutMs?: number } = {}) {
  // Cloudflare native data mode (default off): same API, data on D1.
  const native = nativeDataClient();
  if (native) return native;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && serviceRoleKey) {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
      global: { fetch: createBoundedFetch(options.timeoutMs) },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Privileged operations must never silently fall back to the anonymous role.
  return null;
}
