import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const fullPath = path.resolve(relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", "require", compiled);
  runner(cjsModule.exports, cjsModule, require);
  return cjsModule.exports;
}

test("Meta CAPI helper hashes customer data and keeps website lead ids out of Meta lead_id", () => {
  const {
    buildMetaLeadEvent,
    hashMetaValue,
    normalizeMetaPhone,
  } = loadTsModule("lib/meta/conversions-api.ts");

  const event = buildMetaLeadEvent({
    orderCode: "TAM123",
    studentName: "Test",
    email: "  Student@Example.COM ",
    phone: "0904 160 809",
    courseTitle: "Facebook Ads Master 2026",
    amount: 399000,
    currency: "VND",
    status: "pending",
    pageUrl: "https://www.theanhmarketing.com/academy/facebook-ads-master-2026",
    referrer: "https://facebook.com",
    utmSource: "fb",
    utmCampaign: "campaign-1",
    fbp: "fb.1.1779.abc",
    fbc: "fb.1.1779.click",
    leadId: "web.1779628866719.5636929147258652",
    ipAddress: "127.0.0.1",
    userAgent: "node-test",
  });

  assert.equal(normalizeMetaPhone("0904 160 809"), "84904160809");
  assert.equal(event.event_name, "Lead");
  assert.equal(event.action_source, "website");
  assert.equal(event.event_id, "lead:TAM123");
  assert.equal(event.event_source_url, "https://www.theanhmarketing.com/academy/facebook-ads-master-2026");
  assert.deepEqual(event.user_data.em, [hashMetaValue("student@example.com")]);
  assert.deepEqual(event.user_data.ph, [hashMetaValue("84904160809")]);
  assert.equal(event.user_data.fbp, "fb.1.1779.abc");
  assert.equal(event.user_data.fbc, "fb.1.1779.click");
  assert.equal(event.user_data.client_ip_address, "127.0.0.1");
  assert.equal(event.user_data.client_user_agent, "node-test");
  assert.equal(event.user_data.lead_id, undefined);
  assert.equal(event.custom_data.event_source, "crm");
  assert.equal(event.custom_data.lead_event_source, "The Anh Marketing CRM");
  assert.equal(event.custom_data.value, 399000);
});

test("Meta CAPI helper sends numeric Meta lead ids only and skips network without config", async () => {
  const { buildMetaLeadEvent, sendMetaLeadEvent } = loadTsModule("lib/meta/conversions-api.ts");

  const event = buildMetaLeadEvent({
    orderCode: "LEAD-2",
    email: "lead@example.com",
    phone: "+84 904 160 809",
    leadId: "1234567890123456",
  });

  assert.equal(event.user_data.lead_id, 1234567890123456);

  const previousToken = process.env.META_CAPI_ACCESS_TOKEN;
  const previousDataset = process.env.META_CAPI_DATASET_ID;
  const previousPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const previousAdditionalPixels = process.env.NEXT_PUBLIC_META_ADDITIONAL_PIXEL_IDS;
  delete process.env.META_CAPI_ACCESS_TOKEN;
  delete process.env.META_CAPI_DATASET_ID;
  delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  delete process.env.NEXT_PUBLIC_META_ADDITIONAL_PIXEL_IDS;

  try {
    const result = await sendMetaLeadEvent({ orderCode: "LEAD-3", email: "lead@example.com" });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "Missing Meta CAPI config");
  } finally {
    if (previousToken === undefined) delete process.env.META_CAPI_ACCESS_TOKEN;
    else process.env.META_CAPI_ACCESS_TOKEN = previousToken;
    if (previousDataset === undefined) delete process.env.META_CAPI_DATASET_ID;
    else process.env.META_CAPI_DATASET_ID = previousDataset;
    if (previousPixel === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_PIXEL_ID = previousPixel;
    if (previousAdditionalPixels === undefined) delete process.env.NEXT_PUBLIC_META_ADDITIONAL_PIXEL_IDS;
    else process.env.NEXT_PUBLIC_META_ADDITIONAL_PIXEL_IDS = previousAdditionalPixels;
  }
});

test("order and payment routes emit Meta Lead and Purchase events without blocking core flow", () => {
  const orderRoute = read("app/api/orders/route.ts");
  const sessionOrderRoute = read("app/api/orders/from-session/route.ts");
  const sepayRoute = read("app/api/sepay/webhook/route.ts");

  assert.match(orderRoute, /sendMetaLeadEvent/);
  assert.match(orderRoute, /await sendMetaLeadEvent\(/);
  assert.match(orderRoute, /Meta Lead event failed/);
  assert.match(orderRoute, /userAgent/);
  assert.match(orderRoute, /body\.fbp/);
  assert.match(orderRoute, /body\.fbc/);
  assert.match(orderRoute, /body\.leadId/);

  assert.match(sessionOrderRoute, /sendMetaLeadEvent/);
  assert.match(sessionOrderRoute, /await sendMetaLeadEvent\(/);
  assert.match(sessionOrderRoute, /Meta Lead event failed/);

  assert.match(sepayRoute, /sendMetaPurchaseEvent/);
  assert.match(sepayRoute, /!confirmation\.wasAlreadyPaid/);
  assert.match(sepayRoute, /await sendMetaPurchaseEvent\(/);
  assert.match(sepayRoute, /Meta Purchase event failed/);
});

test("environment and browser pixel fallback are documented without hard-coded secrets", () => {
  const envExample = read(".env.example");
  const marketingSettings = read("lib/marketing-settings.ts");
  const marketingSettingsService = read("services/marketingSettingsService.ts");
  const capiSource = read("lib/meta/conversions-api.ts");

  assert.match(envExample, /NEXT_PUBLIC_META_PIXEL_ID=/);
  assert.match(envExample, /NEXT_PUBLIC_META_ADDITIONAL_PIXEL_IDS=/);
  assert.match(envExample, /META_CAPI_DATASET_ID=/);
  assert.match(envExample, /META_CAPI_ACCESS_TOKEN=/);
  assert.match(envExample, /META_CAPI_API_VERSION=v25\.0/);
  assert.match(envExample, /META_CAPI_TEST_EVENT_CODE=/);
  assert.match(marketingSettings, /NEXT_PUBLIC_META_PIXEL_ID/);
  assert.match(marketingSettings, /NEXT_PUBLIC_META_ADDITIONAL_PIXEL_IDS/);
  assert.match(marketingSettings, /facebookPixelIds/);
  assert.match(marketingSettings, /envFacebookPixelId/);
  assert.match(marketingSettingsService, /normalizeMarketingSettings\(fallbackMarketingSettings\)/);
  assert.doesNotMatch(capiSource, /EAA[A-Za-z0-9_-]{20,}/);
});

test("all sales landing surfaces include browser Pixel and pass fbp/fbc into order CAPI", () => {
  const marketingScripts = read("components/site/marketing-scripts.tsx");
  const aiMasterSource = read("public/ladipage/ai-master-x10-hieu-suat.html");
  const aiMasterPublished = read("public/academy/ai-master-x10-hieu-suat.html");
  const facebookAdsSource = read("public/ladipage/facebook-ads-2026.html");
  const facebookAdsPublished = read("public/academy/facebook-ads-master-2026.html");
  const staticLandingPages = [
    aiMasterSource,
    aiMasterPublished,
    facebookAdsSource,
    facebookAdsPublished,
  ];

  assert.match(marketingScripts, /facebookPixelIds\.map/);
  assert.match(marketingScripts, /fbq\('init', '\$\{pixelId\}'\)/);
  assert.match(marketingScripts, /facebook\.com\/tr\?id=\$\{pixelId\}&ev=PageView/);

  for (const html of staticLandingPages) {
    assert.match(html, /connect\.facebook\.net\/en_US\/fbevents\.js/);
    assert.match(html, /fbq\(["']init["'], ["']1315653423712065["']\)/);
    assert.match(html, /fbq\(["']track["'], ["']PageView["']\)/);
    assert.match(html, /(?:fbq\(["']track["'], ["']Lead["']|track\(["']Lead["'])/);
    assert.match(html, /(?:fbq\(["']track["'], ["']InitiateCheckout["']|track\(["']InitiateCheckout["'])/);
    assert.match(html, /\/api\/orders/);
    assert.match(html, /fbp:\s*getCookie\(["']_fbp["']\)/);
    assert.match(html, /fbc:\s*getCookie\(["']_fbc["']\)/);
  }
});
