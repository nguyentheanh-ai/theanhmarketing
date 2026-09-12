import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { createBoundedFetch } from "@/lib/supabase/bounded-fetch";

// Refresh before rendering: Server Components cannot persist rotated cookies.
export async function refreshRequestSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const writes: { name: string; value: string; options: Parameters<import("next/server").NextResponse["cookies"]["set"]>[2] }[] = [];
  if (!url || !key) return writes;
  const cookieName = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  if (!request.cookies.getAll().some(({ name }) => name === cookieName || name.startsWith(`${cookieName}.`))) return writes;
  const client = createServerClient(url, key, {
    global: { fetch: createBoundedFetch(8_000) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        for (const cookie of cookies) {
          request.cookies.set(cookie.name, cookie.value);
          writes.push(cookie);
        }
      },
    },
  });
  // Verification/authorization still runs in each page and API guard.
  await client.auth.getClaims();
  return writes;
}
