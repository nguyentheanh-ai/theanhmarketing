import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { createRequire } from "node:module";
const requireNode = createRequire(import.meta.url);

// Trang Tải về Bot 24/7: chỉ khách đã mua tải được. Đăng nhập bằng email → link riêng gửi vào chính email đó.
function load(relativePath, mocks = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(relativePath), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  const resolve = (base) => { for (const f of [base + ".ts", base + "/index.ts"]) if (fs.existsSync(path.resolve(f))) return load(f, mocks); throw new Error(`Missing ${base}`); };
  new Function("exports", "module", "require", compiled)(mod.exports, mod, (id) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith("@/")) return resolve(id.slice(2));
    if (id.startsWith(".")) return resolve(path.join(path.dirname(relativePath), id));
    return requireNode(id);
  });
  return mod.exports;
}
const SECRET = "test-secret";
const access = load("lib/bot247/video-access.ts");
const { handleBot247GuideRequest } = load("lib/cloudflare/bot247-video-guide.ts");
const env = { PRIVATE_ASSETS: { head: async () => null, get: async () => null }, BOT247_VIDEO_LINK_SECRET: SECRET };
const site = "https://www.theanhmarketing.com";

test("installer links need a valid access key", async () => {
  assert.equal((await handleBot247GuideRequest(new Request(`${site}/bot-24-7/tai-ve/api/links`), env)).status, 401);
  assert.equal((await handleBot247GuideRequest(new Request(`${site}/bot-24-7/tai-ve/api/links?k=TAM1.bad`), env)).status, 401);
  const k = access.bot247VideoToken(SECRET, "TAMBOT1");
  const ok = await handleBot247GuideRequest(new Request(`${site}/bot-24-7/tai-ve/api/links?k=${encodeURIComponent(k)}`), env);
  assert.equal(ok.status, 200);
  const d = await ok.json();
  assert.match(d.installers.windows, /drive\.google\.com/);
  assert.equal(d.videoUrl, `/bot-24-7/huong-dan?k=${encodeURIComponent(k)}`);
  assert.equal(ok.headers.get("cache-control"), "private, no-store");
});

function loginRoute({ orders = [], licenses = [], sent = [] }) {
  const query = { select() { return this; }, eq(f, v) { this.f = { ...(this.f || {}), [f]: v }; return this; }, order() { return this; },
    limit() { const f = this.f; return Promise.resolve({ data: orders.filter((o) => o.status === f.status && o.course_slug === f.course_slug && o.email === f.email) }); } };
  return load("app/api/bot-24-7/dang-nhap/route.ts", {
    "next/server": { NextResponse: { json: (b, init) => Response.json(b, init) } },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => ({ from: () => Object.create(query) }) },
    "@/lib/bot247/license-gateway": { listBot247Licenses: async () => licenses },
    "@/lib/notifications/payment-success-email": { sendBot247LoginEmail: async (input) => { sent.push(input); return { ok: true }; } },
  });
}
const post = (route, email, ip = "1.1.1.1") => route.POST(new Request(`${site}/api/bot-24-7/dang-nhap`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip, "cf-connecting-ip": ip }, body: JSON.stringify({ email }) }));

test("login sends the private link only to a paid buyer's own email, same answer either way", async () => {
  const sent = [];
  const route = loginRoute({ sent, orders: [{ order_code: "TAMBOT1", student_name: "Lan", status: "paid", course_slug: "bot-24-7", email: "lan@shop.vn" }, { order_code: "TAMX", status: "pending", course_slug: "bot-24-7", email: "chua@shop.vn" }],
    licenses: [{ code: "B247-AAAA-BBBB-CCCC", email: "tay@shop.vn", name: "Khách tay" }, { code: "B247-DDDD-EEEE-FFFF", email: "huy@shop.vn", revoked: true }] });
  const a = await (await post(route, " LAN@shop.vn ", "2.2.2.1")).json();
  const b = await (await post(route, "chua@shop.vn", "2.2.2.2")).json();
  const c = await (await post(route, "tay@shop.vn", "2.2.2.3")).json();
  await post(route, "huy@shop.vn", "2.2.2.4");
  assert.equal(a.message, b.message);
  assert.deepEqual(sent.map((s) => [s.email, s.accessId]), [["lan@shop.vn", "TAMBOT1"], ["tay@shop.vn", "B247-AAAA-BBBB-CCCC"]]);
  assert.equal(c.ok, true);
  assert.equal((await post(route, "khong-phai-email", "2.2.2.5")).status, 400);
});

test("login email links to the download page and videos with the buyer's key", () => {
  const { buildBot247LoginEmail } = load("lib/notifications/payment-success-email.ts");
  const p = buildBot247LoginEmail({ name: "Lan", email: "lan@shop.vn", accessId: "TAMBOT1" }, { bot247VideoSecret: SECRET });
  const k = encodeURIComponent(access.bot247VideoToken(SECRET, "TAMBOT1"));
  assert.equal(p.to, "lan@shop.vn");
  assert.ok(p.text.includes(`${site}/bot-24-7/tai-ve?k=${k}`));
  assert.ok(p.text.includes(`${site}/bot-24-7/huong-dan?k=${k}`));
  assert.equal(buildBot247LoginEmail({ name: "x", email: "x@y.z", accessId: "TAMBOT1" }, { bot247VideoSecret: "" }), null);
});

test("download page hides installers until unlocked and strips the key before the pixel", () => {
  const html = fs.readFileSync("public/academy/bot-24-7-tai-ve.html", "utf8");
  assert.doesNotMatch(html, /drive\.google\.com/);
  assert.match(html, /id="acts" hidden/);
  assert.match(html, /id="login" hidden/);
  assert.match(html, /\/bot-24-7\/tai-ve\/api\/links\?k=/);
  assert.match(html, /\/api\/bot-24-7\/dang-nhap/);
  assert.ok(html.indexOf("history.replaceState") < html.indexOf('fbq("init"'));
  const email = fs.readFileSync("lib/notifications/payment-success-email.ts", "utf8");
  assert.match(email, /bot247DownloadUrl\(site, videoSecret, order\.orderCode\)/);
});
