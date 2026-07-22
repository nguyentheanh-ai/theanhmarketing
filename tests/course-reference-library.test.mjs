import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const expectedPublicFiles = [
  "public/course-resources/facebook-ads-2026/bo-nghien-cuu-doi-thu-facebook-ads.zip",
  "public/course-resources/facebook-ads-2026/bo-ke-hoach-chien-dich-facebook-ads.zip",
  "public/course-resources/facebook-ads-2026/bo-hinh-anh-ai-tham-khao.zip",
  "public/course-resources/facebook-ads-2026/nghien-cuu-doi-thu-facebook-ads.png",
  "public/course-resources/facebook-ads-2026/ke-hoach-chien-dich-facebook-ads.png",
  "public/course-resources/facebook-ads-2026/hinh-anh-ai-tham-khao.png",
];

test("Facebook Ads course defines exactly three safe reference download packs", () => {
  assert.ok(exists("data/course-reference-packs.ts"), "reference pack configuration must exist");
  const source = read("data/course-reference-packs.ts");

  assert.match(source, /"facebook-ads-2026"/);
  assert.equal(
    (source.match(/downloadUrl:\s*"\/course-resources\/facebook-ads-2026\//g) ?? []).length,
    3,
  );
  assert.doesNotMatch(source, /99_Tam|04_Bao_cao_quang_cao|CRM|VOICE_DNA|scratch/i);

  for (const relativePath of expectedPublicFiles) {
    assert.ok(exists(relativePath), `${relativePath} must exist`);
    assert.ok(fs.statSync(path.join(root, relativePath)).size > 0, `${relativePath} must not be empty`);
  }
});

test("lesson route passes course-specific reference packs into the learning room", () => {
  const lessonPage = read("app/learn/[course]/[lesson]/page.tsx");
  assert.match(lessonPage, /getCourseReferencePacks\(course\.slug\)/);
  assert.match(lessonPage, /referencePacks=\{referencePacks\}/);
});

test("reference library renders the three approved packs and safety note", () => {
  assert.ok(exists("components/course/course-reference-library.tsx"), "reference library component must exist");
  const component = read("components/course/course-reference-library.tsx");

  assert.match(component, /Tài liệu mẫu tham khảo/);
  assert.match(component, /Bộ nghiên cứu đối thủ Facebook Ads/);
  assert.match(component, /Bộ kế hoạch chiến dịch mẫu/);
  assert.match(component, /Bộ hình ảnh AI tham khảo/);
  assert.match(component, /case mẫu/);
  assert.match(component, /không phải cam kết hiệu quả/);
  assert.match(component, /\bdownload\b/);
});

