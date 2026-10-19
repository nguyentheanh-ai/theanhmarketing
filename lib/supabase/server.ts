import { createClient } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "@/lib/supabase/client";
import { nativeDataClient } from "@/lib/cloudflare/native-data-client";

export function createSupabaseServerClient() {
  // Anonymous role with the translated RLS policies in native data mode.
  const native = nativeDataClient({ role: "anon", uid: null, isAdmin: false, jwtAdminRole: null });
  if (native) return native;
  if (!hasSupabaseEnv()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
