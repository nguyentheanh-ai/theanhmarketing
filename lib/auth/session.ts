import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { shouldRequirePasswordChange } from "@/lib/auth/student-account";
import { hasSupabaseEnv } from "@/lib/supabase/client";

type AuthResult = {
  user: User | null;
  isAdmin: boolean;
  adminRole: AdminRole | null;
};

export type AdminRole = "owner" | "editor";

export function isAuthGuardEnabled() {
  return process.env.AUTH_GUARD_ENABLED === "true" || process.env.VERCEL_ENV === "production";
}

export function getAdminEmails() {
  const configuredEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const fallbackEmail = process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase();

  if (configuredEmails.length > 0 || !fallbackEmail) {
    return configuredEmails;
  }

  return [fallbackEmail];
}

export function getAdminRole(user: User | null, isAdminEmail = false): AdminRole | null {
  if (!user) {
    return null;
  }

  if (user.app_metadata?.admin_role === "editor" || user.app_metadata?.admin_role === "owner") {
    return user.app_metadata.admin_role;
  }

  return isAdminEmail ? "owner" : null;
}

export function canAccessAdminRole(role: AdminRole | null, allowedRoles: AdminRole[] = ["owner"]) {
  return Boolean(role && allowedRoles.includes(role));
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
    return { user: null, isAdmin: false, adminRole: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmails = getAdminEmails();
  const userEmail = user?.email?.toLowerCase() ?? "";
  const adminRole = getAdminRole(user, adminEmails.includes(userEmail));
  const isAdmin = Boolean(adminRole);

  return { user, isAdmin, adminRole };
}

export async function requireStudentAuth(nextPath: string) {
  if (!isAuthGuardEnabled()) {
    return null;
  }

  const { user } = await getCurrentAuth();

  if (!user) {
    redirect(`/dang-nhap?next=${encodeURIComponent(nextPath)}`);
  }

  if (shouldRequirePasswordChange(user) && nextPath !== "/doi-mat-khau") {
    redirect(`/doi-mat-khau?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}

export async function requireAdminAuth(nextPath: string, allowedRoles: AdminRole[] = ["owner"]) {
  if (!isAuthGuardEnabled()) {
    return null;
  }

  const { user, isAdmin, adminRole } = await getCurrentAuth();

  if (!user) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isAdmin || !canAccessAdminRole(adminRole, allowedRoles)) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}&error=admin`);
  }

  return { user, adminRole };
}
