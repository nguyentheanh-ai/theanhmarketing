const defaultSiteUrl = "https://theanhmarketing.com";

const allowedEmailLinkHosts = new Set([
  "theanhmarketing.com",
  "www.theanhmarketing.com",
  "docs.google.com",
  "chatgpt.com",
  "zalo.me",
]);

export function normalizeEmailSiteUrl(value?: string) {
  const rawUrl = String(value ?? "").trim() || defaultSiteUrl;

  try {
    const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    url.protocol = "https:";
    url.port = "";

    if (url.hostname === "www.theanhmarketing.com") {
      url.hostname = "theanhmarketing.com";
    }

    return url.origin;
  } catch {
    return defaultSiteUrl;
  }
}

export function getAllowedEmailLinkTarget(rawTarget: string, siteUrl?: string) {
  const trimmed = rawTarget.trim();
  if (!trimmed) return null;

  try {
    const targetUrl = new URL(trimmed.startsWith("/") ? trimmed : trimmed, normalizeEmailSiteUrl(siteUrl));
    targetUrl.protocol = "https:";
    targetUrl.port = "";

    if (!allowedEmailLinkHosts.has(targetUrl.hostname)) {
      return null;
    }

    if (targetUrl.hostname === "www.theanhmarketing.com") {
      targetUrl.hostname = "theanhmarketing.com";
    }

    return targetUrl.toString();
  } catch {
    return null;
  }
}

export function buildEmailLink(target: string, siteUrl?: string) {
  const normalizedTarget = getAllowedEmailLinkTarget(target, siteUrl);
  const bridgeUrl = new URL("/go", normalizeEmailSiteUrl(siteUrl));

  bridgeUrl.searchParams.set("to", normalizedTarget ?? normalizeEmailSiteUrl(siteUrl));

  return bridgeUrl.toString();
}
