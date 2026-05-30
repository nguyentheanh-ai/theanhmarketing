const facebookScopes = ["public_profile", "ads_read", "read_insights", "business_management"];

export const metaAdsTokenCookie = "tam_meta_ads_token";
export const metaAdsStateCookie = "tam_meta_ads_state";

function cleanEnvValue(value: string | undefined) {
  return (value ?? "").replace(/^\uFEFF/, "").trim();
}

function getMetaApiVersion() {
  return cleanEnvValue(process.env.META_API_VERSION) || cleanEnvValue(process.env.META_CAPI_API_VERSION) || "v25.0";
}

function getSiteUrl() {
  return (cleanEnvValue(process.env.NEXT_PUBLIC_SITE_URL) || "http://localhost:3000").replace(/\/$/, "");
}

function getCallbackUrl() {
  return `${getSiteUrl()}/api/admin/meta/connect/callback`;
}

function getFacebookAppConfig() {
  const appId = cleanEnvValue(process.env.META_APP_ID);
  const appSecret = cleanEnvValue(process.env.META_APP_SECRET);

  if (!appId || !appSecret) {
    throw new Error("Thiếu META_APP_ID hoặc META_APP_SECRET để kết nối Facebook.");
  }

  return { appId, appSecret };
}

export function buildMetaAdsOAuthUrl(state: string) {
  const { appId } = getFacebookAppConfig();
  const url = new URL(`https://www.facebook.com/${getMetaApiVersion()}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", getCallbackUrl());
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", facebookScopes.join(","));
  url.searchParams.set("return_scopes", "true");
  url.searchParams.set("auth_type", "rerequest");
  return url.toString();
}

export async function exchangeMetaAdsOAuthCode(code: string) {
  const { appId, appSecret } = getFacebookAppConfig();
  const tokenUrl = new URL(`https://graph.facebook.com/${getMetaApiVersion()}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", getCallbackUrl());
  tokenUrl.searchParams.set("code", code);

  const shortLived = await fetchJson<{ access_token: string; expires_in?: number }>(tokenUrl);
  const longLivedUrl = new URL(`https://graph.facebook.com/${getMetaApiVersion()}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId);
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", shortLived.access_token);

  try {
    const longLived = await fetchJson<{ access_token: string; expires_in?: number }>(longLivedUrl);
    return {
      accessToken: longLived.access_token,
      expiresIn: longLived.expires_in ?? shortLived.expires_in ?? 60 * 60 * 24 * 60,
    };
  } catch {
    return {
      accessToken: shortLived.access_token,
      expiresIn: shortLived.expires_in ?? 60 * 60 * 2,
    };
  }
}

async function fetchJson<T>(url: URL) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Không thể gọi Facebook OAuth API.");
  }

  return payload as T;
}
