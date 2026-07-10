import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SupabaseBrowserPersistence = "remember" | "session";

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type SupabaseBrowserClientOptions = {
  persistence?: SupabaseBrowserPersistence;
};

let rememberBrowserClient: SupabaseClient | null = null;
let sessionBrowserClient: SupabaseClient | null = null;

export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function getBrowserStorage(persistence: SupabaseBrowserPersistence): BrowserStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return persistence === "remember" ? window.localStorage : window.sessionStorage;
}

function removeStoredSupabaseAuthTokens(storage: Storage) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) {
      continue;
    }

    if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

function clearInvalidSupabaseBrowserSession() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    removeStoredSupabaseAuthTokens(window.localStorage);
    removeStoredSupabaseAuthTokens(window.sessionStorage);
  } catch {
    // Ignore browser storage access issues.
  }
}

function watchForInvalidRefreshToken(client: SupabaseClient) {
  void client.auth.getSession().catch((error) => {
    const message = error instanceof Error ? error.message : String(error ?? "");
    const isRefreshTokenError =
      message.includes("Invalid Refresh Token") || message.includes("Refresh Token Not Found");

    if (!isRefreshTokenError) {
      return;
    }

    clearInvalidSupabaseBrowserSession();
  });
}

export function createSupabaseBrowserClient(options: SupabaseBrowserClientOptions = {}) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const persistence = options.persistence ?? "remember";
  const existingClient = persistence === "remember" ? rememberBrowserClient : sessionBrowserClient;

  if (existingClient) {
    return existingClient;
  }

  const browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: false,
      cookieOptions: persistence === "remember" ? { maxAge: 60 * 60 * 24 * 30 } : {},
      auth: {
        persistSession: true,
        storage: getBrowserStorage(persistence),
        userStorage: getBrowserStorage(persistence),
      },
    },
  );

  watchForInvalidRefreshToken(browserClient);

  if (persistence === "remember") {
    rememberBrowserClient = browserClient;
  } else {
    sessionBrowserClient = browserClient;
  }

  return browserClient;
}
