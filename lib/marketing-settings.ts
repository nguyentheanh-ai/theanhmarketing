import { siteConfig } from "@/data/site";

export type MarketingSettings = {
  seoTitle: string;
  seoDescription: string;
  socialImageUrl: string;
  googleSiteVerification: string;
  facebookDomainVerification: string;
  trackingEnabled: boolean;
  facebookPixelEnabled: boolean;
  facebookPixelId: string;
  gaEnabled: boolean;
  gaMeasurementId: string;
  gtmEnabled: boolean;
  gtmId: string;
};

export const fallbackMarketingSettings: MarketingSettings = {
  seoTitle: "The Anh Marketing | AI Performance Marketing System",
  seoDescription:
    "AI Performance Marketing System giúp SME và Solopreneur xây hệ thống tăng trưởng bằng AI Marketing, Performance Ads, Funnel, Automation và CRM/Data.",
  socialImageUrl: "",
  googleSiteVerification: "",
  facebookDomainVerification: "",
  trackingEnabled: false,
  facebookPixelEnabled: false,
  facebookPixelId: "",
  gaEnabled: false,
  gaMeasurementId: "",
  gtmEnabled: false,
  gtmId: "",
};

function extractMetaContent(value: string) {
  const trimmed = value.trim();
  const contentMatch = trimmed.match(/content=["']([^"']+)["']/i);

  return contentMatch?.[1]?.trim() || trimmed;
}

function normalizePixelId(value?: string) {
  const id = String(value ?? "").trim();
  return /^\d{6,32}$/.test(id) ? id : "";
}

function normalizeGaId(value?: string) {
  const id = String(value ?? "").trim().toUpperCase();
  return /^G-[A-Z0-9]{4,}$/.test(id) ? id : "";
}

function normalizeGtmId(value?: string) {
  const id = String(value ?? "").trim().toUpperCase();
  return /^GTM-[A-Z0-9]{4,}$/.test(id) ? id : "";
}

function normalizeVerification(value?: string) {
  const token = extractMetaContent(String(value ?? ""));
  return /^[A-Za-z0-9_\-.:]{6,160}$/.test(token) ? token : "";
}

function normalizeUrl(value?: string) {
  const url = String(value ?? "").trim();

  if (!url) {
    return "";
  }

  if (url.startsWith("/")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function normalizeMarketingSettings(value: Partial<MarketingSettings> | null | undefined): MarketingSettings {
  const merged = {
    ...fallbackMarketingSettings,
    ...(value ?? {}),
  };

  const facebookPixelId = normalizePixelId(merged.facebookPixelId);
  const envFacebookPixelId = normalizePixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID);
  const gaMeasurementId = normalizeGaId(merged.gaMeasurementId);
  const gtmId = normalizeGtmId(merged.gtmId);
  const effectiveFacebookPixelId = facebookPixelId || envFacebookPixelId;

  return {
    seoTitle: String(merged.seoTitle || fallbackMarketingSettings.seoTitle).trim().slice(0, 90),
    seoDescription: String(merged.seoDescription || fallbackMarketingSettings.seoDescription).trim().slice(0, 220),
    socialImageUrl: normalizeUrl(merged.socialImageUrl),
    googleSiteVerification: normalizeVerification(merged.googleSiteVerification),
    facebookDomainVerification: normalizeVerification(merged.facebookDomainVerification),
    trackingEnabled: Boolean(merged.trackingEnabled || envFacebookPixelId),
    facebookPixelEnabled: Boolean((merged.facebookPixelEnabled || envFacebookPixelId) && effectiveFacebookPixelId),
    facebookPixelId: effectiveFacebookPixelId,
    gaEnabled: Boolean(merged.gaEnabled && gaMeasurementId),
    gaMeasurementId,
    gtmEnabled: Boolean(merged.gtmEnabled && gtmId),
    gtmId,
  };
}

export function getAbsoluteSocialImage(imageUrl: string) {
  if (!imageUrl) {
    return undefined;
  }

  if (imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${siteConfig.url}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}
