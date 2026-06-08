import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

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
  const requireShim = (specifier) => {
    if (specifier === "@/lib/notifications/email-link-bridge") {
      return loadTsModule("lib/notifications/email-link-bridge.ts");
    }

    throw new Error(`Unsupported test import: ${specifier}`);
  };
  runner(cjsModule.exports, cjsModule, requireShim);
  return cjsModule.exports;
}

const paidOrder = {
  id: "order-1",
  orderCode: "TAM123",
  studentName: "Nguyen Van A",
  email: "student@example.com",
  phone: "0900000000",
  courseSlug: "facebook-ads-2026",
  courseTitle: "Facebook Ads Master 2026",
  amount: 399000,
  amountLabel: "399.000d",
  currency: "VND",
  status: "paid",
  paymentMethod: "sepay",
  paymentQrUrl: "",
  paidAt: "2026-05-23T10:00:00.000Z",
  expiresAt: null,
  createdAt: "2026-05-23T09:55:00.000Z",
  sepayReferenceCode: null,
  orderItems: [],
  paymentEmailSentAt: null,
  paymentEmailLastError: null,
};

test("student access landing page is public and does not auto-redirect", () => {
  const page = read("app/vao-khoa-hoc/page.tsx");

  assert.match(page, /Truy c.p khu v.c h.c vi.n/s);
  assert.match(page, /theanhmarketing\.com/);
  assert.match(page, /\/dang-nhap\?next=%2Fdashboard/);
  assert.doesNotMatch(page, /redirect\(/);
  assert.doesNotMatch(page, /router\.push/);
  assert.doesNotMatch(page, /<iframe/i);
  assert.doesNotMatch(page, /<script/i);
});

test("paid student emails use the official access landing link", () => {
  const { buildPaymentSuccessEmailPayload } = loadTsModule("lib/notifications/payment-success-email.ts");
  const { buildStudentAccessEmailPayload } = loadTsModule("lib/notifications/student-access-email.ts");

  const paymentPayload = buildPaymentSuccessEmailPayload(paidOrder, {
    siteUrl: "https://www.theanhmarketing.com",
  });
  const accessPayload = buildStudentAccessEmailPayload(
    {
      action: "grant",
      studentName: "Nguyen Van A",
      email: "student@example.com",
      courseTitles: ["Facebook Ads Master 2026"],
    },
    { siteUrl: "https://www.theanhmarketing.com" },
  );

  for (const payload of [paymentPayload, accessPayload]) {
    assert.match(payload.html, /https:\/\/theanhmarketing\.com\/go\?to=https%3A%2F%2Ftheanhmarketing\.com%2Fvao-khoa-hoc/);
    assert.match(payload.text, /https:\/\/theanhmarketing\.com\/vao-khoa-hoc/);
    assert.match(payload.html, /Truy c.p khu v.c h.c vi.n/s);
    assert.match(payload.html, /theanhmarketing\.com/);
    assert.doesNotMatch(payload.html, /https:\/\/www\.theanhmarketing\.com\/dang-nhap\?next=%2Fdashboard/);
    assert.doesNotMatch(payload.text, /\/dang-nhap\?next=%2Fdashboard/);
  }
});

test("canonical site config and proxy prefer non-www HTTPS", () => {
  const site = read("data/site.ts");
  const proxy = read("proxy.ts");
  const envExample = read(".env.example");

  assert.match(site, /url:\s*"https:\/\/theanhmarketing\.com"/);
  assert.match(envExample, /APP_BASE_URL=https:\/\/theanhmarketing\.com/);
  assert.match(proxy, /canonicalHost\s*=\s*"theanhmarketing\.com"/);
  assert.match(proxy, /ENABLE_WWW_TO_APEX_REDIRECT/);
  assert.match(proxy, /www\.theanhmarketing\.com/);
  assert.match(proxy, /url\.port\s*=\s*""/);
  assert.match(proxy, /NextResponse\.redirect\(url,\s*301\)/);
});

test("student access landing is exempt from frame blocking headers", () => {
  const proxy = read("proxy.ts");
  const nextConfig = read("next.config.ts");

  assert.match(proxy, /function isStudentAccessBridgeRoute/);
  assert.match(proxy, /stripFrameAncestors/);
  assert.match(proxy, /!isStudentAccessBridgeRoute\(request\.nextUrl\.pathname\)[\s\S]*?X-Frame-Options/);
  assert.doesNotMatch(nextConfig, /key:\s*"X-Frame-Options"/);
});

test("next parameter rejects external and encoded external redirects", () => {
  const { getSafeNextPath } = loadTsModule("lib/navigation.ts");

  assert.equal(getSafeNextPath("/dashboard", "/dashboard"), "/dashboard");
  assert.equal(getSafeNextPath("/khoa-hoc", "/dashboard"), "/khoa-hoc");
  assert.equal(getSafeNextPath("/tai-khoan", "/dashboard"), "/tai-khoan");
  assert.equal(getSafeNextPath("https://domain-khac.com", "/dashboard"), "/dashboard");
  assert.equal(getSafeNextPath("//domain-khac.com", "/dashboard"), "/dashboard");
  assert.equal(getSafeNextPath("%2F%2Fdomain-khac.com", "/dashboard"), "/dashboard");
  assert.equal(getSafeNextPath("javascript:alert(1)", "/dashboard"), "/dashboard");
  assert.equal(getSafeNextPath("data:text/html,hi", "/dashboard"), "/dashboard");
});
