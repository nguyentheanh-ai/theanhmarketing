const defaultSiteUrl = "https://theanhmarketing.com";
export const passwordResetRedirectPath = "/doi-mat-khau?next=%2Fdashboard&mode=reset";

function cleanEnvValue(value: string | null | undefined) {
  return value?.trim().replace(/^\uFEFF/, "") || "";
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
}

export function normalizePublicSiteUrl(value: string | null | undefined) {
  const rawUrl = cleanEnvValue(value);
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);

    if (isLocalhost(url.hostname)) {
      return "";
    }

    url.protocol = "https:";

    if (url.hostname === "www.theanhmarketing.com") {
      url.hostname = "theanhmarketing.com";
    }

    url.pathname = "";
    url.search = "";
    url.hash = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function getPublicSiteUrl() {
  return (
    normalizePublicSiteUrl(process.env.PASSWORD_RESET_SITE_URL) ||
    normalizePublicSiteUrl(process.env.PUBLIC_APP_URL) ||
    normalizePublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizePublicSiteUrl(process.env.SITE_URL) ||
    normalizePublicSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    defaultSiteUrl
  );
}

export function getPasswordResetRedirectUrl() {
  return `${getPublicSiteUrl()}${passwordResetRedirectPath}`;
}

export function getPasswordResetConfirmUrl(tokenHash: string) {
  const url = new URL("/api/auth/recovery/confirm", getPublicSiteUrl());
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "recovery");
  url.searchParams.set("next", "/dashboard");

  return url.toString();
}
