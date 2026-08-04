export type ReportProductKey = "ebook" | "facebook_ads_course" | "unclassified";

export type IsoWindow = {
  startIso: string;
  endIso: string;
};

type OrderProductIdentity = {
  courseSlug?: string | null;
  courseTitle?: string | null;
  productName?: string | null;
};

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function normalized(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function classifyCampaignProduct(campaignName: string): ReportProductKey {
  const name = normalized(campaignName);
  if (/\bebook\b/.test(name)) return "ebook";
  if (/\bfba\b/.test(name) || /\bfb\s*ads\s*2026\b/.test(name)) return "facebook_ads_course";
  return "unclassified";
}

export function classifyOrderProduct(identity: OrderProductIdentity): ReportProductKey {
  const value = normalized([
    identity.courseSlug,
    identity.courseTitle,
    identity.productName,
  ].filter(Boolean).join(" "));
  if (/\bebook\b/.test(value)) return "ebook";
  if (/facebook[-_\s]*ads|\bfba\b/.test(value)) return "facebook_ads_course";
  return "unclassified";
}

function latestClosedVietnamBusinessDay(now: Date) {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const todayAt14 = Date.UTC(
    vietnamNow.getUTCFullYear(),
    vietnamNow.getUTCMonth(),
    vietnamNow.getUTCDate(),
    7,
  );
  return new Date(now.getTime() >= todayAt14 ? todayAt14 : todayAt14 - DAY_MS);
}

export function buildSevenDayWindow(now: Date): IsoWindow {
  const end = latestClosedVietnamBusinessDay(now);
  return {
    startIso: new Date(end.getTime() - 7 * DAY_MS).toISOString(),
    endIso: end.toISOString(),
  };
}

export function buildMonthToDateWindow(now: Date): IsoWindow {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const start = new Date(Date.UTC(
    vietnamNow.getUTCFullYear(),
    vietnamNow.getUTCMonth(),
    1,
    -7,
  ));
  return { startIso: start.toISOString(), endIso: now.toISOString() };
}
