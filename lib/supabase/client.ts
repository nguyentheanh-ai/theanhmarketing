import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createSupabaseBrowserClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    void browserClient.auth.getSession().catch((error) => {
      const message = error instanceof Error ? error.message : String(error ?? "");
      const isRefreshTokenError =
        message.includes("Invalid Refresh Token") || message.includes("Refresh Token Not Found");

      if (!isRefreshTokenError || typeof window === "undefined") {
        return;
      }

      try {
        const keysToRemove: string[] = [];
        for (let index = 0; index < window.localStorage.length; index += 1) {
          const key = window.localStorage.key(index);
          if (!key) {
            continue;
          }

          if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
      } catch {
        // Ignore localStorage access issues.
      }
    });
  }

  return browserClient;
}
