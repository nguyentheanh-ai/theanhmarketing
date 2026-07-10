import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hasSupabaseEnv } from "@/lib/supabase/client";
import { createSupabaseAuthServerClient } from "@/lib/auth/session";
import { getSafeNextPath } from "@/lib/navigation";

function getDefaultAppOrigin() {
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.theanhmarketing.com";

  try {
    return new URL(fallback).origin;
  } catch {
    return "https://app.theanhmarketing.com";
  }
}

const defaultAppOrigin = getDefaultAppOrigin();

type SearchParams = {
  origin?: string | string[];
};

function isAllowedAppOrigin(rawOrigin: string | undefined) {
  const fallback = defaultAppOrigin;
  if (!rawOrigin) {
    return fallback;
  }

  try {
    const parsed = new URL(rawOrigin);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return fallback;
    }

    const allowList = new Set([
      "app.theanhmarketing.com",
      new URL(fallback).host,
      "www.app.theanhmarketing.com",
    ]);

    if (allowList.has(parsed.host)) {
      return parsed.origin;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function buildErrorMessage(message: string) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100">
        {message}
      </div>
    </main>
  );
}

async function hasSupabaseAuthCookie() {
  const cookieStore = await cookies();

  return cookieStore.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

async function requestAppLoginLink(payload: { email: string; fullName: string; source: string; redirectTo: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.theanhmarketing.com";
  const secret = process.env.STUDENT_PORTAL_PROVISION_SECRET;

  if (!secret) {
    throw new Error("Missing app provisioning secret.");
  }

  const response = await fetch(`${appUrl}/api/auth/website-login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-student-portal-secret": secret,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("App login API returned an error.");
  }

  const data = await response.json();
  if (!data?.ok || typeof data.loginUrl !== "string") {
    throw new Error("App login API returned an invalid response.");
  }

  return data.loginUrl as string;
}

export default async function AppLoginBridge({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (!hasSupabaseEnv()) {
    return buildErrorMessage("Website login config error: Supabase is not enabled.");
  }

  const resolvedSearchParams = await searchParams;
  const requestedOrigin = Array.isArray(resolvedSearchParams.origin)
    ? resolvedSearchParams.origin[0]
    : resolvedSearchParams.origin;

  const appOrigin = isAllowedAppOrigin(requestedOrigin);
  const returnPath = getSafeNextPath(`/app-login-bridge?origin=${encodeURIComponent(appOrigin)}`, "/app-login-bridge");
  const nextAfterLogin = `/dang-nhap?next=${encodeURIComponent(returnPath)}`;

  if (!(await hasSupabaseAuthCookie())) {
    redirect(nextAfterLogin);
  }

  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) {
    return buildErrorMessage("Cannot initialize website Supabase session.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(nextAfterLogin);
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name.trim()
        : "";

  const redirectTo = `${appOrigin}/auth/callback?source=website`;
  let loginUrl: string;

  try {
    loginUrl = await requestAppLoginLink({
      email: user.email,
      fullName,
      source: "theanhmarketing.com",
      redirectTo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot bridge to app login now.";

    return buildErrorMessage(`${message} Please sign in again or contact support.`);
  }

  redirect(loginUrl);
}
