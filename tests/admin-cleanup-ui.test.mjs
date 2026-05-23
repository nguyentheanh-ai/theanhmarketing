import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin shell uses a light SaaS workspace and avoids fixed logout overlap", () => {
  const source = read("components/app/admin-shell.tsx");

  assert.match(source, /bg-\[#f5f7fb\]/);
  assert.match(source, /lg:flex/);
  assert.doesNotMatch(source, /absolute inset-x-5 bottom-5/);
  assert.match(source, /Đơn hàng/);
});

test("admin course page renders real official courses instead of empty demo blocks", () => {
  const source = read("app/admin/khoa-hoc/page.tsx");

  assert.match(source, /Nguồn dữ liệu/);
  assert.match(source, /CourseEditor initialCourses/);
  assert.doesNotMatch(source, /demo/i);
  assert.doesNotMatch(source, /QuÃ|áº|Ã¡|Ä|Æ/i);
});

test("AI Master X10 course data has real modules for dashboard access", () => {
  const source = read("data/courses.ts");

  assert.match(source, /ai-master-x10-hieu-suat/);
  assert.match(source, /makeAiMasterModules/);
  assert.match(source, /AI Master X10 hiệu suất - Biến tri thức thành tiền/);
  assert.match(source, /Landing page và hệ thống bán hàng/);
});
