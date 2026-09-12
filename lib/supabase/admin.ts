import { createClient } from "@supabase/supabase-js";
import { createBoundedFetch } from "@/lib/supabase/bounded-fetch";

export function createSupabaseAdminClient(options: { timeoutMs?: number } = {}) {
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
