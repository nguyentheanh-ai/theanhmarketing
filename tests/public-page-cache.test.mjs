import test from "node:test";
import assert from "node:assert/strict";
import { isCacheablePublicRequest, servePublicPage } from "../lib/cloudflare/public-page-cache.ts";

const html = { accept: "text/html" };
const mem = () => { const m = new Map(); return { match: async (k) => m.get(k.url)?.clone(), put: async (k, v) => { m.set(k.url, v); } }; };

test("only anonymous HTML GETs to public marketing paths are cacheable", () => {
  assert.equal(isCacheablePublicRequest(new Request("https://www.theanhmarketing.com/?utm_source=fb", { headers: html })), true);
  assert.equal(isCacheablePublicRequest(new Request("https://www.theanhmarketing.com/academy/codex-x10-hieu-suat", { headers: html })), true);
  assert.equal(isCacheablePublicRequest(new Request("https://www.theanhmarketing.com/dashboard", { headers: html })), false);
  assert.equal(isCacheablePublicRequest(new Request("https://www.theanhmarketing.com/", { headers: { ...html, cookie: "_fbp=1; __Host-tam-session=x" } })), false);
  assert.equal(isCacheablePublicRequest(new Request("https://www.theanhmarketing.com/", { headers: { ...html, rsc: "1" } })), false);
  assert.equal(isCacheablePublicRequest(new Request("https://www.theanhmarketing.com/", { method: "POST", headers: html })), false);
});

test("second guest visit is served from cache without rendering; Set-Cookie responses are never stored", async () => {
  const cache = mem(); let renders = 0;
  const render = async () => { renders++; return new Response("<p>hi</p>", { headers: { "content-type": "text/html" } }); };
  const first = await servePublicPage(new Request("https://www.theanhmarketing.com/?fbclid=a", { headers: html }), render, undefined, cache);
  assert.equal(await first.text(), "<p>hi</p>");
  const second = await servePublicPage(new Request("https://www.theanhmarketing.com/?fbclid=b", { headers: html }), render, undefined, cache);
  assert.equal(second.headers.get("x-edge-cache"), "HIT"); assert.equal(await second.text(), "<p>hi</p>"); assert.equal(renders, 1);
  const c2 = mem();
  await servePublicPage(new Request("https://www.theanhmarketing.com/khoa-hoc", { headers: html }), async () => new Response("x", { headers: { "set-cookie": "a=1" } }), undefined, c2);
  assert.equal(await c2.match(new Request("https://www.theanhmarketing.com/khoa-hoc")), undefined);
});
