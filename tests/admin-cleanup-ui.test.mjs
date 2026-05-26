import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin shell uses the light management workspace and avoids fixed logout overlap", () => {
  const source = read("components/app/admin-shell.tsx");

  assert.match(source, /data-admin-theme="light"/);
  assert.match(source, /bg-\[#f7f8fb\]/);
  assert.match(source, /\/brand\/ta-logo\.svg/);
  assert.match(source, /AI Growth OS/);
  assert.match(source, /lg:flex/);
  assert.match(source, /lg:ml-64/);
  assert.match(source, /lg:px-8/);
  assert.match(source, /xl:px-10/);
  assert.match(source, /lg:py-8/);
  assert.doesNotMatch(source, /backdrop-blur/);
  assert.doesNotMatch(source, /absolute inset-x-5 bottom-5/);
  assert.match(source, /Đơn hàng/);
});

test("admin panels and orders page use roomy dashboard spacing", () => {
  const ui = read("components/admin/crm-ui.tsx");
  const uiShell = read("components/app/admin-shell.tsx");
  const ordersPage = read("app/admin/don-hang/page.tsx");

  assert.match(ui, /rounded-\[1\.35rem\]/);
  assert.match(ui, /shadow-\[0_22px_70px/);
  assert.match(uiShell, /max-w-\[1480px\]/);
  assert.match(ordersPage, /max-w-\[1440px\]/);
  assert.doesNotMatch(ordersPage, /max-w-\[1180px\]/);
  assert.match(ordersPage, /mt-8 grid gap-5/);
  assert.match(ordersPage, /mt-7 p-6/);
  assert.match(ordersPage, /\[\&_th\]:px-3/);
  assert.match(ordersPage, /\[\&_td\]:px-3/);
});

test("admin course page renders real official courses instead of empty blocks", () => {
  const source = read("app/admin/khoa-hoc/page.tsx");

  assert.match(source, /Nguồn dữ liệu/);
  assert.match(source, /CourseEditor initialCourses/);
  assert.doesNotMatch(source, /demo/i);
  assert.doesNotMatch(source, /QuÃƒ|Ã¡Âº|ÃƒÂ¡|Ã„|Ã†/i);
});

test("admin orders page shows phone numbers with a copy action", () => {
  const page = read("app/admin/don-hang/page.tsx");
  const button = read("components/admin/copy-phone-button.tsx");

  assert.match(page, /CopyPhoneButton/);
  assert.match(page, /order\.phone/);
  assert.match(page, /tel:\$\{order\.phone\}/);
  assert.match(button, /navigator\.clipboard/);
  assert.match(button, /Copy SĐT/);
});

test("AI Master X10 course data has real modules for dashboard access", () => {
  const source = read("data/courses.ts");

  assert.match(source, /ai-master-x10-hieu-suat/);
  assert.match(source, /makeAiMasterModules/);
  assert.match(source, /AI Master X10 hiệu suất - Biến tri thức thành tiền/);
  assert.match(source, /Landing page và hệ thống bán hàng/);
});
