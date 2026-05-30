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
  assert.match(source, /Admin CRM/);
  assert.match(source, /\/admin\/facebook-ads/);
  assert.match(source, /\/admin\/thanh-vien-admin/);
  assert.match(source, /lg:flex/);
  assert.match(source, /lg:ml-64/);
  assert.match(source, /lg:px-8/);
  assert.match(source, /xl:px-10/);
  assert.match(source, /lg:py-8/);
  assert.doesNotMatch(source, /backdrop-blur/);
  assert.doesNotMatch(source, /absolute inset-x-5 bottom-5/);
  assert.match(source, /Ads & doanh thu/);
  assert.doesNotMatch(source, /Remarketing/);
  assert.doesNotMatch(source, /SEO\/Tracking/);
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
  assert.doesNotMatch(source, /QuÃƒÆ’|ÃƒÂ¡Ã‚Âº|ÃƒÆ’Ã‚Â¡|Ãƒâ€ž|Ãƒâ€ /i);
});

test("course editor uses a focused two-pane workspace with lazy heavy panels", () => {
  const page = read("app/admin/khoa-hoc/page.tsx");
  const source = read("components/admin/course-editor.tsx");

  assert.match(page, /getAdminCourses/);
  assert.doesNotMatch(page, /getCourses/);
  assert.doesNotMatch(page, /AdminPageHeader/);
  assert.doesNotMatch(page, /AdminPanel/);
  assert.match(source, /courseSearch/);
  assert.match(source, /statusFilter/);
  assert.match(source, /filteredCourses/);
  assert.match(source, /activePanel/);
  assert.match(source, /Tổng quan/);
  assert.match(source, /Media/);
  assert.match(source, /Nội dung/);
  assert.match(source, /getCourseStats/);
  assert.match(source, /Quản trị dữ liệu/);
  assert.match(source, /activePanel === "media"/);
  assert.match(source, /activePanel === "content"/);
  assert.doesNotMatch(source, /<SoftCard/);
  assert.doesNotMatch(source, /rounded-3xl/);
});

test("course editor follows LMS outline patterns instead of showing heavy lesson previews", () => {
  const source = read("components/admin/course-editor.tsx");

  assert.match(source, /useState<CourseEditorPanel>\("overview"\)/);
  assert.match(source, /Course outline/);
  assert.match(source, /Module title/);
  assert.match(source, /Lesson title/);
  assert.match(source, /Add item/);
  assert.match(source, /Tutor LMS/);
  assert.match(source, /Course Builder/);
  assert.match(source, /Canvas/);
  assert.match(source, /Open edX/);
  assert.doesNotMatch(source, /toYouTubeThumbnailUrl/);
  assert.doesNotMatch(source, /cleanLessonTitle/);
  assert.doesNotMatch(source, /Preview đồng bộ ngoài website/);
});

test("course editor starts as a Tutor LMS style course list and opens editing on demand", () => {
  const source = read("components/admin/course-editor.tsx");

  assert.match(source, /editorMode/);
  assert.match(source, /useState<"list" \| "edit">\("list"\)/);
  assert.match(source, /editorMode === "list"/);
  assert.match(source, /editorMode === "edit"/);
  assert.match(source, /openCourseEditor/);
  assert.match(source, /Mở phần sửa/);
  assert.match(source, /Quay lại danh sách/);
  assert.doesNotMatch(source, /xl:grid-cols-\[320px_minmax\(0,1fr\)\]/);
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
