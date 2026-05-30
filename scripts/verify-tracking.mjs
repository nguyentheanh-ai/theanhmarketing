import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [];

function read(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing ${path}`);
  }
  return readFileSync(fullPath, "utf8");
}

function expectIncludes(path, snippets) {
  const content = read(path);

  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      checks.push(`${path} missing ${snippet}`);
    }
  }
}

expectIncludes("services/marketingSettingsService.ts", [
  "site_settings",
  '"marketing"',
]);

expectIncludes("lib/marketing-settings.ts", [
  "facebookPixelId",
  "gaMeasurementId",
  "gtmId",
]);

expectIncludes("components/site/marketing-scripts.tsx", [
  "connect.facebook.net",
  "googletagmanager.com",
  "TrackingPageView",
]);

expectIncludes("components/admin/marketing-settings-manager.tsx", [
  "Facebook Pixel",
  "Google Analytics",
  "Google Tag Manager",
  "Search Console",
]);

expectIncludes("app/admin/seo/page.tsx", [
  "MarketingSettingsManager",
  "SEO",
  "Pixel",
]);

expectIncludes("app/layout.tsx", [
  "MarketingScripts",
  "getMarketingSettings",
  "generateMetadata",
]);

expectIncludes("proxy.ts", [
  "https://connect.facebook.net",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
]);

expectIncludes("lib/tracking/events.ts", [
  "trackMarketingEvent",
  "Lead",
  "AddToCart",
  "InitiateCheckout",
]);

if (checks.length > 0) {
  console.error("Tracking verification failed:");
  for (const check of checks) {
    console.error(`- ${check}`);
  }
  process.exit(1);
}

console.log("Tracking verification passed.");
