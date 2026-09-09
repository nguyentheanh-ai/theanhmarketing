import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
function load(file) {
  const absolute = path.resolve(file);
  const source = fs.readFileSync(absolute, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loadedModule = { exports: {} };
  const require = (id) => id.startsWith("@/") ? load(`${id.slice(2)}.ts`)
    : id.startsWith(".") ? load(`${path.resolve(path.dirname(absolute), id)}.ts`) : nativeRequire(id);
  new Function("exports", "module", "require", compiled)(loadedModule.exports, loadedModule, require);
  return loadedModule.exports;
}
const codexUrl = "https://www.theanhmarketing.com/academy/codex-x10-hieu-suat";
const kitUrl = "https://www.theanhmarketing.com/academy/bo-kit-agent-doanh-nghiep";
test("Codex matches exact landing, never shared course or foreign URL", () => {
  const { isCodexLanding } = load("lib/meta/codex-pixel.ts");
  for (const url of [codexUrl, `${codexUrl}/?utm_source=facebook`, "academy/codex-x10-hieu-suat", kitUrl, `${kitUrl}/?utm_source=facebook`, "academy/bo-kit-agent-doanh-nghiep"]) assert.equal(isCodexLanding(url), true);
  for (const url of ["https://evil.example/academy/codex-x10-hieu-suat", `${codexUrl}-other`, `${kitUrl}-other`, "https://evil.example/academy/bo-kit-agent-doanh-nghiep", "/academy/ai-master-x10-hieu-suat", "/?next=/academy/bo-kit-agent-doanh-nghiep", null]) assert.equal(isCodexLanding(url), false);
});
test("browser targets Codex only on landing or its attributed checkout, including SPA exit", () => {
  const calls = [];
  global.window = { location: new URL(codexUrl), fbq: (...args) => calls.push(args) };
  const { trackMarketingEvent } = load("lib/tracking/events.ts");
  try {
    trackMarketingEvent("PageView");
    trackMarketingEvent("Lead", { event_id: "TEST-ORDER" });
    assert.equal(calls.filter(c => c[0] === "init" && c[1] === "1369910554822777").length, 1);
    assert.equal(calls.some(c => c[0] === "trackSingle" && c[1] === "1369910554822777" && c[2] === "Lead" && c[4].eventID === "TEST-ORDER"), true);
    calls.length = 0;
    window.location = new URL(kitUrl);
    for (const event of ["PageView", "ViewContent", "Lead", "InitiateCheckout"]) trackMarketingEvent(event, { event_id: "TEST-KIT" });
    assert.equal(calls.filter(c => c[1] === "1369910554822777").length, 4);
    assert.equal(calls.some(c => c[0] === "init"), false, "SPA transition between both landings must not initialize again");
    calls.length = 0;
    window.location = new URL("https://www.theanhmarketing.com/academy/ai-master-x10-hieu-suat");
    trackMarketingEvent("PageView");
    assert.equal(calls.some(c => c[1] === "1369910554822777"), false);
    window.location = new URL("https://www.theanhmarketing.com/thanh-toan/TEST-ORDER");
    trackMarketingEvent("InitiateCheckout", { event_id: "TEST-ORDER", landing_page: codexUrl });
    assert.equal(calls.some(c => c[1] === "1369910554822777" && c[2] === "InitiateCheckout"), true);
    calls.length = 0;
    trackMarketingEvent("InitiateCheckout", { event_id: "TEST-KIT", landing_page: kitUrl });
    assert.equal(calls.some(c => c[1] === "1369910554822777" && c[2] === "InitiateCheckout" && c[4].eventID === "TEST-KIT"), true);
    assert.equal(calls.some(c => c[0] === "track"), false);
  } finally { delete global.window; }
});
test("server mirrors attributed conversions with same ID, and does not mirror other landings", async () => {
  const previous = { fetch: global.fetch, token: process.env.META_CAPI_ACCESS_TOKEN, codex: process.env.META_CODEX_CAPI_ACCESS_TOKEN };
  process.env.META_CAPI_ACCESS_TOKEN = "fixture-primary";
  process.env.META_CODEX_CAPI_ACCESS_TOKEN = "fixture-codex";
  const requests = [];
  global.fetch = async (url, options) => { requests.push({ url, payload: JSON.parse(options.body) }); return { ok: true, json: async () => ({ events_received: 1 }) }; };
  try {
    const { sendMetaPurchaseEvent, sendMetaLeadEvent } = load("lib/meta/conversions-api.ts");
    const result = await sendMetaPurchaseEvent({ orderCode: "TEST-ORDER", amount: 399000, currency: "VND", landingPage: codexUrl, pageUrl: "https://www.theanhmarketing.com/thanh-toan/TEST-ORDER" });
    assert.equal(result.ok, true);
    assert.equal(requests.length, 2);
    assert.equal(requests.some(r => r.url.includes("/1369910554822777/events")), true);
    assert.deepEqual(requests[0].payload.data, requests[1].payload.data);
    assert.equal(requests[1].payload.data[0].event_id, "TEST-ORDER");
    requests.length = 0;
    await sendMetaLeadEvent({ courseSlug: "bo-agent-kit-x10-hieu-suat-cong-viec", landingPage: "/academy/bo-kit-agent-doanh-nghiep" });
    assert.equal(requests.length, 2);
    requests.length = 0;
    await sendMetaPurchaseEvent({ orderCode: "TEST-KIT", amount: 399000, currency: "VND", landingPage: kitUrl, pageUrl: "https://www.theanhmarketing.com/thanh-toan/TEST-KIT" });
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0].payload.data, requests[1].payload.data);
    assert.equal(requests[1].payload.data[0].event_id, "TEST-KIT");
    requests.length = 0;
    await sendMetaLeadEvent({ courseSlug: "bo-agent-kit-x10-hieu-suat-cong-viec", landingPage: "/academy/ai-master-x10-hieu-suat" });
    assert.equal(requests.length, 1);
    requests.length = 0;
    delete process.env.META_CODEX_CAPI_ACCESS_TOKEN;
    const missing = await sendMetaPurchaseEvent({ orderCode: "TEST-ORDER", landingPage: codexUrl });
    assert.equal(missing.ok, false, "outbox must retry when Codex is unconfigured");
    process.env.META_CODEX_CAPI_ACCESS_TOKEN = "fixture-codex";
    global.fetch = async (url) => url.includes("/1369910554822777/events")
      ? { ok: false, status: 503, json: async () => ({ error: { message: "Fixture unavailable" } }) }
      : { ok: true, json: async () => ({ events_received: 1 }) };
    const partial = await sendMetaPurchaseEvent({ orderCode: "TEST-ORDER", landingPage: codexUrl });
    assert.equal(partial.ok, false, "primary acceptance must not hide a Codex failure from the outbox");
  } finally {
    global.fetch = previous.fetch;
    for (const [key, value] of [["META_CAPI_ACCESS_TOKEN", previous.token], ["META_CODEX_CAPI_ACCESS_TOKEN", previous.codex]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
