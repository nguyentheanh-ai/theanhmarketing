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

test("catalog uses full Vietnamese price labels and keeps only the two requested exceptions", () => {
  const courses = read("data/courses.ts");
  const standardPrices = courses.match(/price: "990\.000đ"/g) ?? [];

  assert.equal(standardPrices.length, 6);
  assert.match(courses, /title: "Quảng cáo Facebook Master 2026"[\s\S]*?price: "799\.000đ"/);
  assert.match(courses, /title: "Thư viện kiến thức Facebook Ads 2026"[\s\S]*?price: "399\.000đ"/);
  assert.match(courses, /title: "Đội ngũ nhân sự AI"[\s\S]*?price: "799\.000đ"/);
  assert.match(courses, /Bộ 8 Nhân viên AI dành cho doanh nghiệp/);
  assert.doesNotMatch(courses, /price: "[\d.]+K"/);
});

test("catalog uses validated colorful course covers and landing-derived v3 AI banners", () => {
  const courses = read("data/courses.ts");
  const v2Covers = courses.match(/course-thumbnails\/[\w-]+-v2\.webp/g) ?? [];

  assert.equal(v2Covers.length, 8);
  assert.match(courses, /quang-cao-facebook-master-2026-v2\.webp/);
  assert.match(courses, /ebook-facebook-ads-2026-v2\.webp/);
  assert.match(courses, /marketing-gioi-phai-kiem-duoc-tien-v2\.webp/);
  assert.match(courses, /ai-master-x10-hieu-suat-v3\.webp/);
  assert.match(courses, /bo-agent-kit-x10-hieu-suat-cong-viec-v3\.webp/);
  assert.equal(existsSync("public/course-thumbnails/ai-master-x10-hieu-suat-v3.webp"), true);
  assert.equal(existsSync("public/course-thumbnails/bo-agent-kit-x10-hieu-suat-cong-viec-v3.webp"), true);
});

test("only four courses open their exact approved landing pages", () => {
  const courses = read("data/courses.ts");
  const card = read("components/content/course-card.tsx");
  const detail = read("app/khoa-hoc/[slug]/page.tsx");

  assert.match(courses, /slug: "facebook-ads-2026"[\s\S]*?landingPageUrl: "\/academy\/facebook-ads-master-2026"[\s\S]*?status: "open"/);
  assert.match(courses, /slug: "ebook-facebook-ads-2026"[\s\S]*?landingPageUrl: "\/academy\/ebook-facebook-ads-2026-premium"[\s\S]*?status: "open"/);
  assert.match(courses, /slug: "ai-master-x10-hieu-suat"[\s\S]*?landingPageUrl: "\/academy\/ai-master-x10-hieu-suat"[\s\S]*?status: "open"/);
  assert.match(courses, /slug: "bo-agent-kit-x10-hieu-suat-cong-viec"[\s\S]*?landingPageUrl: "\/academy\/bo-kit-agent-doanh-nghiep"[\s\S]*?status: "open"/);
  assert.equal((courses.match(/status: "coming-soon"/g) ?? []).length, 6);
  assert.doesNotMatch(card, /AddToCartButton/);
  assert.match(card, /course\.status === "coming-soon"/);
  assert.match(card, /Sắp ra mắt/);
  assert.match(detail, /course\.status === "coming-soon"[\s\S]*?notFound\(\)/);
});
