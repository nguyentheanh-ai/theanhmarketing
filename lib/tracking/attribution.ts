export type AttributionInput = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmId?: string | null;
  utmTerm?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  adsetId?: string | null;
  adId?: string | null;
  adName?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  landingPage?: string | null;
  pageUrl?: string | null;
};

export type Attribution = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmId: string;
  utmTerm: string;
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adId: string;
  adName: string;
  fbclid: string;
  fbc: string;
  fbp: string;
  landingPage: string;
  source: string;
};

function clean(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanUrlish(value: unknown) {
  return clean(value, 700);
}

function normalizeFbc(input: AttributionInput) {
  const fbc = clean(input.fbc, 220);
  if (fbc) return fbc;

  const fbclid = clean(input.fbclid, 220);
  if (!fbclid) return "";

  return `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
}

export function normalizeAttribution(input: AttributionInput = {}): Attribution {
  const utmSource = clean(input.utmSource, 120);
  const utmMedium = clean(input.utmMedium, 120);
  const utmCampaign = clean(input.utmCampaign, 180);
  const utmContent = clean(input.utmContent, 180);
  const utmId = clean(input.utmId, 120);
  const utmTerm = clean(input.utmTerm, 180);
  const campaignId = clean(input.campaignId, 120) || utmId;
  const campaignName = clean(input.campaignName, 220) || utmCampaign;
  const adsetId = clean(input.adsetId, 120);
  const adId = clean(input.adId, 120);
  const adName = clean(input.adName, 220);
  const fbclid = clean(input.fbclid, 220);
  const landingPage = cleanUrlish(input.pageUrl) || cleanUrlish(input.landingPage);

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmId,
    utmTerm,
    campaignId,
    campaignName,
    adsetId,
    adId,
    adName,
    fbclid,
    fbc: normalizeFbc(input),
    fbp: clean(input.fbp, 180),
    landingPage,
    source: campaignId ? utmSource || "facebook_ads" : "organic/unknown",
  };
}

export function attributionToDbColumns(attribution: Attribution) {
  return {
    utm_source: attribution.utmSource || null,
    utm_medium: attribution.utmMedium || null,
    utm_campaign: attribution.utmCampaign || null,
    utm_content: attribution.utmContent || null,
    utm_id: attribution.utmId || null,
    utm_term: attribution.utmTerm || null,
    campaign_id: attribution.campaignId || null,
    campaign_name: attribution.campaignName || null,
    adset_id: attribution.adsetId || null,
    ad_id: attribution.adId || null,
    ad_name: attribution.adName || null,
    fbclid: attribution.fbclid || null,
    fbc: attribution.fbc || null,
    fbp: attribution.fbp || null,
    landing_page: attribution.landingPage || null,
  };
}

export function attributionNoteLines(attribution: Attribution) {
  return [
    `UTM source: ${attribution.utmSource}`,
    `UTM medium: ${attribution.utmMedium}`,
    `UTM campaign: ${attribution.utmCampaign}`,
    `UTM content: ${attribution.utmContent}`,
    `UTM id: ${attribution.utmId}`,
    `UTM term: ${attribution.utmTerm}`,
    `Campaign ID: ${attribution.campaignId}`,
    `Campaign name: ${attribution.campaignName}`,
    `Adset ID: ${attribution.adsetId}`,
    `Ad ID: ${attribution.adId}`,
    `Ad name: ${attribution.adName}`,
    `fbclid: ${attribution.fbclid}`,
    `fbp: ${attribution.fbp}`,
    `fbc: ${attribution.fbc}`,
    `Landing page: ${attribution.landingPage}`,
  ];
}
