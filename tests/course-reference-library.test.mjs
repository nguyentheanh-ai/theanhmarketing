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

const expectedPromptFiles = [
  "public/course-resources/facebook-ads-2026/master-prompts/01_MASTER_PROMPT_NGHIEN_CUU_DOI_THU_FACEBOOK.txt",
  "public/course-resources/facebook-ads-2026/master-prompts/02_MASTER_PROMPT_TAO_HINH_ANH_HANG_LOAT_CHATGPT.txt",
  "public/course-resources/facebook-ads-2026/master-prompts/03_MASTER_PROMPT_PHAN_TICH_VA_TAI_TAO_VISUAL.txt",
  "public/course-resources/facebook-ads-2026/master-prompts/04_MASTER_PROMPT_XUAT_TOAN_BO_CHI_SO_QUANG_CAO.txt",
  "public/course-resources/facebook-ads-2026/master-prompts/05_MASTER_PROMPT_LAP_KE_HOACH_CONTENT.txt",
  "public/course-resources/facebook-ads-2026/master-prompts/06_MASTER_PROMPT_LAP_KE_HOACH_QUANG_CAO.txt",
];

test("Facebook Ads course defines six approved prompt downloads and one Sheet demo", () => {
  assert.ok(exists("data/course-reference-packs.ts"), "reference pack configuration must exist");
  const source = read("data/course-reference-packs.ts");

  assert.match(source, /"facebook-ads-2026"/);
  assert.equal(
    (source.match(/downloadUrl:\s*"\/course-resources\/facebook-ads-2026\/master-prompts\//g) ?? []).length,
    6,
  );
  assert.equal((source.match(/docs\.google\.com\/spreadsheets\/d\/1LJHiGtwN3f_fj4AVhrKKTuT3dNHPVNGMYEh-3DpOBTc/g) ?? []).length, 1);
  assert.doesNotMatch(source, /99_Tam|04_Bao_cao_quang_cao|CRM|VOICE_DNA|scratch/i);

  for (const relativePath of expectedPromptFiles) {
    assert.ok(exists(relativePath), `${relativePath} must exist`);
    assert.ok(fs.statSync(path.join(root, relativePath)).size > 0, `${relativePath} must not be empty`);
  }
});

test("lesson route passes course-specific reference packs into the learning room", () => {
  const lessonPage = read("app/learn/[course]/[lesson]/page.tsx");
  assert.match(lessonPage, /getCourseReferencePacks\(course\.slug\)/);
  assert.match(lessonPage, /referencePacks=\{referencePacks\}/);
});

test("reference library renders download-only prompt cards and the external Sheet action", () => {
  assert.ok(exists("components/course/course-reference-library.tsx"), "reference library component must exist");
  const component = read("components/course/course-reference-library.tsx");
  const configuration = read("data/course-reference-packs.ts");
  const renderedContract = `${component}\n${configuration}`;

  assert.match(renderedContract, /Tài liệu mẫu tham khảo/);
  assert.match(renderedContract, /Nghiên cứu đối thủ Facebook/);
  assert.match(renderedContract, /Tạo hình ảnh hàng loạt bằng ChatGPT/);
  assert.match(renderedContract, /Lập kế hoạch quảng cáo/);
  assert.match(renderedContract, /Demo kịch bản quảng cáo trên Google Sheet/);
  assert.doesNotMatch(component, /next\/image|<Image|previewUrl/);
  assert.match(component, /pack\.external/);
  assert.match(component, /target=\{pack\.external \? "_blank" : undefined\}/);
  assert.match(component, /\bdownload\b/);
});
