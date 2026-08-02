import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const readRequired = (path) => {
  assert.equal(existsSync(path), true, `${path} must exist`);
  return read(path);
};

test("course catalog keeps service fetching on the server and browser filtering in a client component", () => {
  const page = read("app/khoa-hoc/page.tsx");
  const browser = readRequired("components/marketing/course-catalog-browser.tsx");

  assert.match(page, /await getCourses\(\)/);
  assert.match(page, /CourseCatalogBrowser/);
  assert.match(page, /courses=\{courses\}/);
  assert.match(browser, /"use client"/);
  assert.match(browser, /useMemo/);
  assert.match(browser, /keyword/);
  assert.match(browser, /activeCategory/);
  assert.match(browser, /normalize\("NFD"\)/);
});

test("course catalog derives categories and result counts from real course data", () => {
  const browser = readRequired("components/marketing/course-catalog-browser.tsx");

  assert.match(browser, /new Set/);
  assert.match(browser, /courses\.map/);
  assert.match(browser, /filteredCourses\.length/);
  assert.doesNotMatch(browser, /9\s+sản phẩm|9\s+khóa học/i);
  assert.match(browser, /Xóa bộ lọc/);
  assert.match(browser, /Chưa tìm thấy chương trình phù hợp/);
});

test("course catalog renders the same reusable course card used on the homepage", () => {
  const browser = readRequired("components/marketing/course-catalog-browser.tsx");

  assert.match(browser, /CourseCard/);
  assert.match(browser, /filteredCourses\.map/);
});

test("catalog keeps the latest Agent Kit offer from the recovered backup", () => {
  const courses = read("data/courses.ts");

  assert.match(courses, /title: "Bộ Agent Kit X10 hiệu suất công việc"[\s\S]*?price: "990K"/);
  assert.match(courses, /Trọn bộ 30 skill cho marketing, bán hàng, vận hành và hệ thống quảng cáo/);
});

test("catalog uses the colorful rounded-type v2 course covers", () => {
  const courses = read("data/courses.ts");
  const v2Covers = courses.match(/course-thumbnails\/[\w-]+-v2\.webp/g) ?? [];

  assert.equal(v2Covers.length, 10);
  assert.match(courses, /quang-cao-facebook-master-2026-v2\.webp/);
  assert.match(courses, /ebook-facebook-ads-2026-v2\.webp/);
  assert.match(courses, /marketing-gioi-phai-kiem-duoc-tien-v2\.webp/);
});
