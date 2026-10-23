import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

// Bot 24/7 là phần mềm (slug "bot-24-7"): email sau thanh toán gửi bộ cài + hướng dẫn, không gửi link vào khóa học,
// không tạo tài khoản học viên; landing tĩnh đặt hàng qua /api/orders với đúng slug.
function loadTsModule(relativePath) {
  const source = fs.readFileSync(path.resolve(relativePath), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  const requireShim = (specifier) => {
    if (specifier === "@/lib/notifications/email-link-bridge") return loadTsModule("lib/notifications/email-link-bridge.ts");
    throw new Error(`Unsupported test import: ${specifier}`);
  };
  new Function("exports", "module", "require", compiled)(mod.exports, mod, requireShim);
  return mod.exports;
}

const botOrder = {
  id: "order-bot", orderCode: "TAMBOT1", studentName: "Nguyen Van B", email: "shop@example.com", phone: "0900000001",
  courseSlug: "bot-24-7", courseTitle: "Bot 24/7 - Đội nhân viên AI cho doanh nghiệp", amount: 990000, amountLabel: "990.000đ",
  currency: "VND", status: "paid", orderItems: [{ slug: "bot-24-7", title: "Bot 24/7", price: 990000 }],
};

test("Bot 24/7 paid email sends installer links and no course access link", () => {
  const { buildPaymentSuccessEmailPayload, isBot247Order } = loadTsModule("lib/notifications/payment-success-email.ts");
  assert.equal(isBot247Order(botOrder), true);
  assert.equal(isBot247Order({ courseSlug: "facebook-ads-2026", orderItems: [] }), false);
  const payload = buildPaymentSuccessEmailPayload(botOrder, { siteUrl: "https://www.theanhmarketing.com" });
  assert.equal(payload.to, "shop@example.com");
  assert.match(payload.subject, /Bot 24\/7/);
  assert.match(payload.html, /drive\.google\.com/);
  assert.match(payload.html, /Mã kích hoạt/);
  assert.doesNotMatch(payload.html, /vao-khoa-hoc/);
  assert.doesNotMatch(payload.text, /vao-khoa-hoc/);
  assert.match(payload.text, /theanhmarketing\.com\/bot-24-7\/tai-ve/);
  assert.match(payload.html, /bot-24-7\/dieu-khoan/);
});

test("Bot 24/7 orders skip student account creation", () => {
  const source = fs.readFileSync(path.resolve("services/studentAccountService.ts"), "utf8");
  assert.match(source, /order\.courseSlug === "bot-24-7"/);
  assert.match(source, /no student account/);
});

test("Bot 24/7 landing posts the bot-24-7 slug to /api/orders and redirects to checkout", () => {
  const html = fs.readFileSync(path.resolve("public/academy/bot-24-7.html"), "utf8");
  assert.match(html, /COURSE_SLUG = "bot-24-7"/);
  assert.match(html, /fetch\("\/api\/orders"/);
  assert.match(html, /\/thanh-toan\//);
  assert.match(html, /fbq\("init", "1315653423712065"\)/);
  const products = fs.readFileSync(path.resolve("data/marketing-courses.ts"), "utf8");
  assert.match(products, /price: "990K"/);
});

test("Bot 24/7 download and terms pages are routed and linked", () => {
  const config = fs.readFileSync(path.resolve("next.config.ts"), "utf8");
  assert.match(config, /source: "\/bot-24-7\/tai-ve"/);
  assert.match(config, /source: "\/bot-24-7\/dieu-khoan"/);
  const dl = fs.readFileSync(path.resolve("public/academy/bot-24-7-tai-ve.html"), "utf8");
  for (const id of ["1JvTaFJMhzYtI7LQVews2pyou2z6JYQ3R", "1s6AJX7BlOZyXWWbovE9EWYn-q8UonTCD", "1IFfRumCpDbD7Bu4Ovn0A0Rf4Ibdlg7kP"]) assert.match(dl, new RegExp(id));
  const terms = fs.readFileSync(path.resolve("public/academy/bot-24-7-dieu-khoan.html"), "utf8");
  for (const id of ["rieng-tu", "tai-khoan", "yeu-cau", "phap-luat"]) assert.match(terms, new RegExp(`id="${id}"`));
  const landing = fs.readFileSync(path.resolve("public/academy/bot-24-7.html"), "utf8");
  assert.match(landing, /href="\/bot-24-7\/dieu-khoan"/);
  assert.match(landing, /href="\/bot-24-7\/tai-ve"/);
});
