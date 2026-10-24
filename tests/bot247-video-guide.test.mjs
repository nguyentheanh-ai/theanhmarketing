import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { createRequire } from "node:module";
const requireNode = createRequire(import.meta.url);

// Bộ video hướng dẫn Bot 24/7: chỉ mở bằng mã truy cập riêng từng đơn (HMAC), video phát từ R2 riêng tư, có tua (Range).
function loadTsModule(relativePath) {
  const source = fs.readFileSync(path.resolve(relativePath), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  const resolve = (base) => { for (const f of [base + ".ts", base + "/index.ts"]) if (fs.existsSync(path.resolve(f))) return loadTsModule(f); throw new Error(`Missing ${base}`); };
  const requireShim = (specifier) => {
    if (specifier.startsWith("@/")) return resolve(specifier.slice(2));
    if (specifier.startsWith(".")) return resolve(path.join(path.dirname(relativePath), specifier));
    return requireNode(specifier);
  };
  new Function("exports", "module", "require", compiled)(mod.exports, mod, requireShim);
  return mod.exports;
}

const SECRET = "test-secret-only";
const access = loadTsModule("lib/bot247/video-access.ts");
const { handleBot247GuideRequest } = loadTsModule("lib/cloudflare/bot247-video-guide.ts");

function fakeBucket(objects) {
  const meta = (key) => ({ size: objects[key].length, httpEtag: '"e"', writeHttpMetadata(h) { h.set("Content-Type", "video/mp4"); } });
  return {
    async head(key) { return objects[key] ? meta(key) : null; },
    async get(key, options) {
      if (!objects[key]) return null;
      const bytes = options?.range ? objects[key].subarray(options.range.offset, options.range.offset + options.range.length) : objects[key];
      return { ...meta(key), body: new Response(bytes).body };
    },
  };
}
const video = new Uint8Array(1000).map((_, i) => i % 256);
const env = { PRIVATE_ASSETS: fakeBucket({ "bot247/huong-dan/tap-01-bat-dau.mp4": video }), BOT247_VIDEO_LINK_SECRET: SECRET };
const site = "https://www.theanhmarketing.com";

test("access token is per order, tamper-proof and revocable", () => {
  const token = access.bot247VideoToken(SECRET, "tambot1");
  assert.match(token, /^TAMBOT1\.[A-Za-z0-9_-]{32}$/);
  assert.equal(access.verifyBot247VideoToken(SECRET, token), "TAMBOT1");
  assert.equal(access.verifyBot247VideoToken("other-secret", token), null);
  assert.equal(access.verifyBot247VideoToken(SECRET, token.replace("TAMBOT1", "TAMBOT2")), null);
  assert.equal(access.verifyBot247VideoToken(SECRET, token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")), null);
  assert.equal(access.verifyBot247VideoToken(SECRET, "TAMBOT1"), null);
  assert.equal(access.verifyBot247VideoToken(SECRET, ""), null);
  assert.equal(access.verifyBot247VideoToken(SECRET, token, "TAMX, tambot1"), null);
  assert.equal(access.verifyBot247VideoToken("", token), null);
  assert.equal(access.bot247VideoToken(SECRET, "../x"), null);
});

test("episode list needs a valid order link", async () => {
  const none = await handleBot247GuideRequest(new Request(`${site}/bot-24-7/huong-dan/api/tap`), env);
  assert.equal(none.status, 401);
  const bad = await handleBot247GuideRequest(new Request(`${site}/bot-24-7/huong-dan/api/tap?k=TAMBOT1.xxxxxxxx`), env);
  assert.equal(bad.status, 401);
  const k = access.bot247VideoToken(SECRET, "TAMBOT1");
  const ok = await handleBot247GuideRequest(new Request(`${site}/bot-24-7/huong-dan/api/tap?k=${encodeURIComponent(k)}`), env);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("cache-control"), "private, no-store");
  const data = await ok.json();
  assert.equal(data.orderCode, "TAMBOT1");
  assert.equal(data.episodes.length, 8);
  assert.equal(data.episodes[0].src, `/bot-24-7/huong-dan/video/tap-01-bat-dau.mp4?k=${encodeURIComponent(k)}`);
  assert.equal(await handleBot247GuideRequest(new Request(`${site}/bot-24-7/tai-ve`), env), null);
});

test("videos stream from private R2 only with a valid link, with Range for seeking", async () => {
  const k = encodeURIComponent(access.bot247VideoToken(SECRET, "TAMBOT1"));
  const url = `${site}/bot-24-7/huong-dan/video/tap-01-bat-dau.mp4`;
  assert.equal((await handleBot247GuideRequest(new Request(url), env)).status, 401);
  assert.equal((await handleBot247GuideRequest(new Request(`${url}?k=bad.token`), env)).status, 401);
  assert.equal((await handleBot247GuideRequest(new Request(`${site}/bot-24-7/huong-dan/video/..%2Fsecret.mp4?k=${k}`), env)).status, 404);
  assert.equal((await handleBot247GuideRequest(new Request(`${url}?k=${k}`, { method: "POST" }), env)).status, 405);
  const full = await handleBot247GuideRequest(new Request(`${url}?k=${k}`), env);
  assert.equal(full.status, 200);
  assert.equal((await full.arrayBuffer()).byteLength, 1000);
  const part = await handleBot247GuideRequest(new Request(`${url}?k=${k}`, { headers: { Range: "bytes=100-199" } }), env);
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("content-range"), "bytes 100-199/1000");
  assert.deepEqual(new Uint8Array(await part.arrayBuffer()), video.subarray(100, 200));
  const missing = await handleBot247GuideRequest(new Request(`${url}?k=${k}`), { BOT247_VIDEO_LINK_SECRET: SECRET });
  assert.equal(missing.status, 503);
});

const botOrder = {
  id: "order-bot", orderCode: "TAMBOT1", studentName: "Nguyen Van B", email: "shop@example.com", phone: "0900000001",
  courseSlug: "bot-24-7", courseTitle: "Bot 24/7", amount: 990000, amountLabel: "990.000đ",
  currency: "VND", status: "paid", orderItems: [{ slug: "bot-24-7", title: "Bot 24/7", price: 990000 }],
};

test("Bot 24/7 paid email carries the order's own video link", () => {
  const { buildPaymentSuccessEmailPayload } = loadTsModule("lib/notifications/payment-success-email.ts");
  const payload = buildPaymentSuccessEmailPayload(botOrder, { siteUrl: site, bot247VideoSecret: SECRET });
  const link = `${site}/bot-24-7/huong-dan?k=${encodeURIComponent(access.bot247VideoToken(SECRET, "TAMBOT1"))}`;
  assert.ok(payload.html.includes(link.replaceAll("&", "&amp;")));
  assert.ok(payload.text.includes(link));
  assert.match(payload.html, /Xem bộ video hướng dẫn/);
  assert.match(payload.html, /drive\.google\.com/);
  const noSecret = buildPaymentSuccessEmailPayload(botOrder, { siteUrl: site, bot247VideoSecret: "" });
  assert.doesNotMatch(noSecret.html, /huong-dan\?k=/);
  assert.match(noSecret.html, /drive\.google\.com/);
});

test("guide page is wired, private and keeps the access key off the address bar", () => {
  const worker = fs.readFileSync(path.resolve("cloudflare-worker.ts"), "utf8");
  assert.match(worker, /"\/bot-24-7\/huong-dan": "\/academy\/bot-24-7-huong-dan"/);
  assert.ok(worker.indexOf("handleBot247GuideRequest(request") < worker.indexOf("if (alias && assets"));
  const html = fs.readFileSync(path.resolve("public/academy/bot-24-7-huong-dan.html"), "utf8");
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /history\.replaceState/);
  assert.doesNotMatch(html, /fbq\(|connect\.facebook\.net/);
  assert.doesNotMatch(html, /\.mp4"/);
});
