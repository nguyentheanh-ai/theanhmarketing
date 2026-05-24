import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertSupabasePublicEnv, hasSupabasePublicEnv } from "./env";

export function hasSupabaseServerEnv() {
  return hasSupabasePublicEnv();
}

export async function createServerSupabaseClient() {
  const { key, url } = assertSupabasePublicEnv();

  const cookieStore = await cookies();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. Proxy/session refresh can own that path later.
          }
        },
      },
    },
  );
}
