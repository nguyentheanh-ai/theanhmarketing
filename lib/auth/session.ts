import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/client";

type AuthResult = {
  user: User | null;
  isAdmin: boolean;
};

export function isAuthGuardEnabled() {
  return process.env.AUTH_GUARD_ENABLED === "true" || process.env.VERCEL_ENV === "production";
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function createSupabaseAuthServerClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            // Server Components cannot always write cookies. Route handlers and
            // client auth refreshes will still keep sessions in sync.
          }
        },
      },
    },
  );
}

export async function getCurrentAuth(): Promise<AuthResult> {
  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { user: null, isAdmin: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmails = getAdminEmails();
  const userEmail = user?.email?.toLowerCase() ?? "";
  const isAdmin = Boolean(user) && adminEmails.includes(userEmail);

  return { user, isAdmin };
}

export async function requireStudentAuth(nextPath: string) {
  if (!isAuthGuardEnabled()) {
    return null;
  }

  const { user } = await getCurrentAuth();

  if (!user) {
    redirect(`/dang-nhap?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}

export async function requireAdminAuth(nextPath: string) {
  if (!isAuthGuardEnabled()) {
    return null;
  }

  const { user, isAdmin } = await getCurrentAuth();

  if (!user) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isAdmin) {
    redirect("/dashboard?error=admin");
  }

  return user;
}
