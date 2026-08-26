import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadContract() {
  const modulePath = path.resolve("public/landing-assets/facebook-ads-event-contract.js");
  delete require.cache[modulePath];
  return require(modulePath);
}

test("Facebook Ads engagement event contract is wired only to explicit primary CTAs", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const eventModule = read("public/landing-assets/facebook-ads-event-contract.js");
  const ctas = [...html.matchAll(/<a\b[^>]*\bdata-meta-cta\b[^>]*>/g)].map((match) => match[0]);

  assert.equal(ctas.length, 6);
  assert.equal(new Set(ctas.map((cta) => cta.match(/data-cta-id="([^"]+)"/)?.[1])).size, 6);
  for (const cta of ctas) {
    assert.match(cta, /\bdata-cta\b/);
    assert.match(cta, /data-cta-id="[a-z0-9-]+"/);
    assert.match(cta, /href="#hoc-phi"/);
  }
  assert.doesNotMatch(html, /<a class="btn btn-secondary"[^>]*data-meta-cta/);
  assert.match(eventModule, /document\.querySelectorAll\("\[data-meta-cta\]"\)/);
});

test("EngagedView fires once only after 30 seconds of visible engagement", () => {
  const events = [];
  const { createFacebookAdsEventContract } = loadContract();
  const contract = createFacebookAdsEventContract((name, payload) => events.push({ name, payload }));

  contract.recordVisibleMilliseconds(29_999);
  assert.deepEqual(events, []);

  contract.recordVisibleMilliseconds(1);
  contract.recordVisibleMilliseconds(30_000);
  assert.deepEqual(events, [
    {
      name: "EngagedView",
      payload: { engaged_seconds: 30 },
    },
  ]);
});

test("ScrollDepth fires 50, 75 and 90 once per page load when thresholds are crossed", () => {
  const events = [];
  const { createFacebookAdsEventContract } = loadContract();
  const contract = createFacebookAdsEventContract((name, payload) => events.push({ name, payload }));

  contract.recordScrollPercent(49.99);
  contract.recordScrollPercent(50);
  contract.recordScrollPercent(74.99);
  contract.recordScrollPercent(75);
  contract.recordScrollPercent(95);
  contract.recordScrollPercent(100);

  assert.deepEqual(events, [
    { name: "ScrollDepth", payload: { scroll_depth: 50 } },
    { name: "ScrollDepth", payload: { scroll_depth: 75 } },
    { name: "ScrollDepth", payload: { scroll_depth: 90 } },
  ]);
});

test("CTAClick sends the approved identifier, visible text and absolute destination", () => {
  const events = [];
  const { createFacebookAdsEventContract } = loadContract();
  const contract = createFacebookAdsEventContract((name, payload) => events.push({ name, payload }));

  contract.recordCtaClick({
    ctaId: "hero-primary",
    ctaText: "  Nhận toàn bộ hệ thống Facebook Ads – 799.000đ  ",
    destinationUrl: "https://www.theanhmarketing.com/academy/facebook-ads-master-2026#hoc-phi",
  });

  assert.deepEqual(events, [
    {
      name: "CTAClick",
      payload: {
        cta_id: "hero-primary",
        cta_text: "Nhận toàn bộ hệ thống Facebook Ads – 799.000đ",
        destination_url: "https://www.theanhmarketing.com/academy/facebook-ads-master-2026#hoc-phi",
      },
    },
  ]);
});

test("VideoProgress milestones are one-shot per real video and absent from this GIF-only landing", () => {
  const events = [];
  const { createFacebookAdsEventContract } = loadContract();
  const contract = createFacebookAdsEventContract((name, payload) => events.push({ name, payload }));

  contract.recordVideoPercent("lesson-preview", "Lesson preview", 24.99);
  contract.recordVideoPercent("lesson-preview", "Lesson preview", 25);
  contract.recordVideoPercent("lesson-preview", "Lesson preview", 50);
  contract.recordVideoPercent("lesson-preview", "Lesson preview", 98);
  contract.recordVideoPercent("lesson-preview", "Lesson preview", 100);

  assert.deepEqual(events, [
    { name: "VideoProgress", payload: { video_id: "lesson-preview", video_title: "Lesson preview", video_percent: 25 } },
    { name: "VideoProgress", payload: { video_id: "lesson-preview", video_title: "Lesson preview", video_percent: 50 } },
    { name: "VideoProgress", payload: { video_id: "lesson-preview", video_title: "Lesson preview", video_percent: 75 } },
    { name: "VideoProgress", payload: { video_id: "lesson-preview", video_title: "Lesson preview", video_percent: 95 } },
  ]);

  const html = read("public/ladipage/facebook-ads-2026.html");
  assert.doesNotMatch(html, /<video\b|data-meta-video-id=/i);
});

test("Custom engagement events preserve standard Meta event semantics and dedup timing", () => {
  const html = read("public/ladipage/facebook-ads-2026.html");
  const eventModule = read("public/landing-assets/facebook-ads-event-contract.js");

  assert.match(eventModule, /fbq\("trackCustom", eventName, payload\)/);
  assert.doesNotMatch(eventModule, /ViewContent|Contact|FindLocation|InitiateCheckout|Purchase|LandingPageView/);
  assert.match(html, /fbq\("track", "PageView"\)/);
  assert.match(html, /fbq\("track", "ViewContent", \{/);
  assert.doesNotMatch(html, /track\("InitiateCheckout"|track\("Purchase"/);

  const ctaBinding = html.match(/document\.querySelectorAll\("\[data-meta-cta\]"\)[\s\S]*?\n\s*\}\);/)?.[0] || "";
  assert.doesNotMatch(ctaBinding, /track\("Lead"/);
  assert.match(
    html,
    /if \(!response\.ok \|\| !payload\.order \|\| !payload\.order\.orderCode\) \{[\s\S]*?\}\s*track\("Lead", \{[\s\S]*?event_id: leadId,[\s\S]*?\}\);\s*window\.location\.href = "\/thanh-toan\//
  );
});
