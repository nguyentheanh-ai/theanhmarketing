import { createClient } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "@/lib/supabase/client";

export function createSupabaseServerClient() {
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
