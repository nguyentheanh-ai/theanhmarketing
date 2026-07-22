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

const expectedApprovedSampleFiles = [
  "public/course-resources/facebook-ads-2026/approved-samples/plan-board-facebook-ads-18-phan.html",
  "public/course-resources/facebook-ads-2026/approved-samples/plan-board-facebook-ads-deep.html",
  "public/course-resources/facebook-ads-2026/approved-samples/imc-deep-plan-facebook-ads.md",
  "public/course-resources/facebook-ads-2026/approved-samples/content-plan-facebook-ads.csv",
  "public/course-resources/facebook-ads-2026/approved-samples/ads-plan-facebook-ads.md",
  "public/course-resources/facebook-ads-2026/approved-samples/measurement-plan-facebook-ads.md",
  "public/course-resources/facebook-ads-2026/approved-samples/evidence-log-facebook-ads.csv",
  "public/course-resources/facebook-ads-2026/approved-samples/assumption-test-plan-facebook-ads.csv",
  "public/course-resources/facebook-ads-2026/approved-samples/design-media-brief-facebook-ads.md",
  "public/course-resources/facebook-ads-2026/approved-samples/nghien-cuu-doi-thu-facebook-ads-theo-mau-ad-library.xlsx",
  "public/course-resources/facebook-ads-2026/approved-samples/bao-cao-nghien-cuu-doi-thu-facebook-ad-library.xlsx",
  "public/course-resources/facebook-ads-2026/approved-samples/workflow-nghien-cuu-doi-thu-facebook-ad-library.xlsx",
  "public/course-resources/facebook-ads-2026/approved-samples/phan-tich-doi-thu-facebook-ads-quet-lai.md",
  "public/course-resources/facebook-ads-2026/approved-samples/phan-tich-ad-library-facebook-ads-ap-dung.md",
  "public/course-resources/facebook-ads-2026/approved-samples/research-overview.png",
  "public/course-resources/facebook-ads-2026/approved-samples/research-competitor-map.png",
  "public/course-resources/facebook-ads-2026/approved-samples/research-ad-angle.png",
  "public/course-resources/facebook-ads-2026/approved-samples/research-opportunities.png",
  "public/course-resources/facebook-ads-2026/approved-samples/research-sources-limitations.png",
];

test("Facebook Ads course keeps prompts while defining Sheets and approved samples", () => {
  assert.ok(exists("data/course-reference-packs.ts"), "reference pack configuration must exist");
  const source = read("data/course-reference-packs.ts");

  assert.match(source, /"facebook-ads-2026"/);
  assert.equal(
    (source.match(/downloadUrl:\s*"\/course-resources\/facebook-ads-2026\/master-prompts\//g) ?? []).length,
    6,
  );
  assert.equal((source.match(/docs\.google\.com\/spreadsheets\/d\/1LJHiGtwN3f_fj4AVhrKKTuT3dNHPVNGMYEh-3DpOBTc/g) ?? []).length, 1);
  assert.equal((source.match(/docs\.google\.com\/spreadsheets\/d\/1fqHbVsKF8cCZvTFB4L_lK12xe04hWeZwcrsLfNzOqR8/g) ?? []).length, 1);
  assert.equal((source.match(/docs\.google\.com\/spreadsheets\/d\/1mgLNECv-6c5r1gMZCivh7t7HqrfLVECJNe8YFo6H49A/g) ?? []).length, 1);
  assert.doesNotMatch(source, /99_Tam|04_Bao_cao_quang_cao|CRM|VOICE_DNA|scratch/i);

  for (const relativePath of expectedPromptFiles) {
    assert.ok(exists(relativePath), `${relativePath} must exist`);
    assert.ok(fs.statSync(path.join(root, relativePath)).size > 0, `${relativePath} must not be empty`);
  }

  for (const relativePath of expectedApprovedSampleFiles) {
    assert.ok(exists(relativePath), `${relativePath} must exist`);
    assert.ok(fs.statSync(path.join(root, relativePath)).size > 0, `${relativePath} must not be empty`);
  }
});

test("lesson route passes course-specific reference packs into the learning room", () => {
  const lessonPage = read("app/learn/[course]/[lesson]/page.tsx");
  assert.match(lessonPage, /getCourseReferencePacks\(course\.slug\)/);
  assert.match(lessonPage, /referencePacks=\{referencePacks\}/);
});

test("reference library puts every reference pack in one compact download table", () => {
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
  assert.equal((component.match(/<table/g) ?? []).length, 1);
  assert.match(component, /packs=\{packs\}/);
  assert.doesNotMatch(component, /const promptPacks/);
  assert.doesNotMatch(component, /Prompt & kịch bản mẫu/);
  assert.match(component, /Google Sheet/);
  assert.match(component, /visual/);
  assert.match(configuration, /section:\s*"plan"/);
  assert.match(configuration, /section:\s*"research"/);
  assert.match(component, /pack\.external/);
  assert.match(component, /target=\{pack\.external \? "_blank" : undefined\}/);
  assert.match(component, /\bdownload\b/);
});

test("Google Sheet script demo belongs in the plan table instead of prompt cards", () => {
  const configuration = read("data/course-reference-packs.ts");
  const scriptPack = configuration.match(/\{\s*id:\s*"video-script-sheet",[\s\S]*?\n\s*\},/);

  assert.ok(scriptPack, "the video script Google Sheet pack must remain in the catalog");
  assert.match(scriptPack[0], /section:\s*"plan"/);
  assert.doesNotMatch(scriptPack[0], /section:\s*"prompt"/);
});
