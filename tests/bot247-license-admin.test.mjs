import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { createRequire } from "node:module";
const requireNode = createRequire(import.meta.url);

// Bot 24/7 › Mã kích hoạt: tự cấp mã khi đơn Bot thanh toán (không tài khoản học viên), email có mã, CRM gọi cổng.
function load(relativePath, mocks = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(relativePath), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
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

const order = { id: "o1", orderCode: "TAMBOT9", studentName: "Chị Lan", email: "lan@example.com", phone: "0900", courseSlug: "bot-24-7", courseTitle: "Bot 24/7", amount: 990000, amountLabel: "990.000đ", status: "paid", orderItems: [{ slug: "bot-24-7", title: "Bot 24/7", price: 990000 }], paymentEmailSentAt: null };
const CODE = "B247-ABCD-EFGH-JKLM";

function harness({ license = async () => CODE } = {}) {
  const service = load("services/sourcePaidFulfillmentService.ts", {
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => { throw new Error("no db"); } },
    "@/services/studentAccountService": { ensureStudentAccountForPaidOrder: () => { throw new Error("must not create student account"); } },
    "@/services/studentPortalProvisioningService": { notifyStudentPortalProvisioning: () => { throw new Error("must not call App B"); } },
    "@/lib/notifications/consultation-payment-email": {},
  });
  const row = { payment_email_last_error: service.initialSepayFulfillmentReceipt(), payment_email_sent_at: null };
  const calls = { license: 0, sent: [] };
  const store = { read: async () => ({ ...row }), replace: async (_c, prev, next, sentAt) => { if (prev !== row.payment_email_last_error) return false; row.payment_email_last_error = next; if (sentAt) row.payment_email_sent_at = sentAt; return true; } };
  const { buildPaymentSuccessEmailPayload } = load("lib/notifications/payment-success-email.ts");
  const deps = {
    store, account: () => { throw new Error("no account"); }, portal: () => { throw new Error("no portal"); }, now: () => 1_800_000_000_000,
    build: (o, options) => buildPaymentSuccessEmailPayload(o, { ...options, bot247VideoSecret: "s" }),
    send: async (o, options) => { calls.sent.push(buildPaymentSuccessEmailPayload(o, { ...options, bot247VideoSecret: "s" })); return { ok: true, skipped: false, resendEmailId: "re_fixture" }; },
    license: async (o) => { calls.license++; return license(o); },
  };
  return { run: () => service.fulfillSourcePaidOrder(order, deps, "bot247"), calls, row };
}

test("paid Bot order issues one license and emails it, without student account or App B", async () => {
  const h = harness();
  const result = await h.run();
  assert.equal(result.ok, true);
  assert.equal(h.calls.license, 1);
  assert.equal(h.calls.sent.length, 1);
  assert.match(h.calls.sent[0].html, new RegExp(CODE));
  assert.match(h.calls.sent[0].text, new RegExp(`Mã kích hoạt: ${CODE}`));
  assert.doesNotMatch(h.calls.sent[0].html, /sẽ được Thế Anh Marketing gửi riêng/);
  assert.match(h.calls.sent[0].subject, /Mã kích hoạt/);
  assert.ok(h.row.payment_email_sent_at);
});

test("gateway outage still sends the Bot email (code to follow) and does not retry issuing", async () => {
  const h = harness({ license: async () => null });
  await h.run();
  assert.equal(h.calls.sent.length, 1);
  assert.match(h.calls.sent[0].html, /sẽ được Thế Anh Marketing gửi riêng/);
});

test("webhook routes Bot orders to the bot247 fulfillment", () => {
  const route = fs.readFileSync("app/api/sepay/webhook/route.ts", "utf8");
  assert.match(route, /isBot247Order\(confirmation\.order\) \? 'bot247'/);
});

test("license gateway client is idempotent per order and fails soft", async () => {
  const seen = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { seen.push({ url, init }); return Response.json({ code: CODE, instance: "chi-lan-abc123" }); };
  process.env.BOT247_GATEWAY_ADMIN_TOKEN = "x".repeat(40);
  try {
    const gw = load("lib/bot247/license-gateway.ts");
    assert.equal(await gw.ensureBot247LicenseForOrder(order), CODE);
    assert.equal(seen[0].url, "https://connect.theanhmarketing.com/v1/admin/licenses");
    assert.equal(seen[0].init.headers.Authorization, `Bearer ${"x".repeat(40)}`);
    assert.deepEqual({ ...JSON.parse(seen[0].init.body), note: undefined, by: undefined }, { action: "new", name: "Chị Lan", email: "lan@example.com", phone: "0900", orderCode: "TAMBOT9", note: undefined, by: undefined });
    globalThis.fetch = async () => new Response("{\"error\":\"down\"}", { status: 502 });
    assert.equal(await gw.ensureBot247LicenseForOrder(order), null);
    delete process.env.BOT247_GATEWAY_ADMIN_TOKEN;
    assert.equal(await gw.ensureBot247LicenseForOrder(order), null);
  } finally { globalThis.fetch = realFetch; delete process.env.BOT247_GATEWAY_ADMIN_TOKEN; }
});

test("manual license email has the code, download page and a private video link", () => {
  const { buildBot247LicenseEmail } = load("lib/notifications/payment-success-email.ts");
  const p = buildBot247LicenseEmail({ name: "Anh Minh", email: "minh@example.com", activationCode: CODE }, { bot247VideoSecret: "s" });
  assert.equal(p.to, "minh@example.com");
  assert.match(p.subject, /Mã kích hoạt/);
  assert.match(p.html, new RegExp(CODE));
  assert.match(p.html, /bot-24-7\/tai-ve/);
  assert.match(p.html, /bot-24-7\/huong-dan\?k=B247-ABCD-EFGH-JKLM\./);
  assert.doesNotMatch(p.html, /đã thanh toán thành công/);
});

test("CRM page and actions are owner-only and listed in the owner nav", () => {
  const page = fs.readFileSync("app/admin/crm-v2/bot247/page.tsx", "utf8");
  assert.match(page, /requireAdminAuth\("\/admin\/crm-v2\/bot247", \["owner"\]\)/);
  for (const f of ["app/api/admin/crm-v2/bot247/route.ts", "app/api/admin/crm-v2/bot247/actions/route.ts"]) assert.match(fs.readFileSync(f, "utf8"), /requireCrmV2OwnerRequest\(request/);
  assert.match(fs.readFileSync("components/crm-v2/crm-components.tsx", "utf8"), /"\/admin\/crm-v2\/bot247", label: "Bot 24\/7 · Mã kích hoạt"/);
});
