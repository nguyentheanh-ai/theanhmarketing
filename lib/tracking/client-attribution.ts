"use client";

function getCookieValue(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  const value =
    document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${name}=`))
      ?.split("=")
      .slice(1)
      .join("=") ?? "";

  return value ? decodeURIComponent(value) : "";
}

function clean(value: string | null, maxLength = 220) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function getClientAttribution() {
  if (typeof window === "undefined") {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  const fbclid = clean(params.get("fbclid"), 220);
  const cookieFbc = clean(getCookieValue("_fbc"), 220);
  const fbc = cookieFbc || (fbclid ? `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}` : "");

  return {
    utmSource: clean(params.get("utm_source"), 120),
    utmMedium: clean(params.get("utm_medium"), 120),
    utmCampaign: clean(params.get("utm_campaign"), 160),
    utmContent: clean(params.get("utm_content"), 160),
    utmId: clean(params.get("utm_id"), 160),
    utmTerm: clean(params.get("utm_term"), 160),
    campaignId: clean(params.get("campaign_id") || params.get("utm_id"), 120),
    campaignName: clean(params.get("campaign_name") || params.get("utm_campaign"), 200),
    adsetId: clean(params.get("adset_id"), 120),
    adId: clean(params.get("ad_id"), 120),
    adName: clean(params.get("ad_name"), 200),
    fbclid,
    fbc,
    fbp: clean(getCookieValue("_fbp"), 180),
    landingPage: window.location.href,
  };
}
