import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

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
  runner(cjsModule.exports, cjsModule, () => ({}));
  return cjsModule.exports;
}

test("student dashboard chooses the owned course from access order, not raw course order", () => {
  const {
    getDashboardCourseOrderSlugs,
    getOwnedCoursesInAccessOrder,
    getPrimaryDashboardCourse,
    getSuggestedCoursesForDashboard,
  } = loadTsModule("lib/student-dashboard-courses.ts");

  const rawCourses = [
    { slug: "marketing-gioi-phai-kiem-duoc-tien", title: "Marketing gioi" },
    { slug: "facebook-ads-2026", title: "Facebook Ads" },
    { slug: "ai-master-x10-hieu-suat", title: "AI Master" },
  ];

  assert.deepEqual(getDashboardCourseOrderSlugs(rawCourses), [
    "facebook-ads-2026",
    "ai-master-x10-hieu-suat",
    "marketing-gioi-phai-kiem-duoc-tien",
  ]);

  const ownedCourses = getOwnedCoursesInAccessOrder(rawCourses, [
    "facebook-ads-2026",
    "marketing-gioi-phai-kiem-duoc-tien",
  ]);

  assert.deepEqual(
    ownedCourses.map((course) => course.slug),
    ["facebook-ads-2026", "marketing-gioi-phai-kiem-duoc-tien"],
  );
  assert.equal(getPrimaryDashboardCourse(rawCourses, ["facebook-ads-2026"])?.slug, "facebook-ads-2026");
  assert.deepEqual(
    getSuggestedCoursesForDashboard(rawCourses, ["facebook-ads-2026"]).map((course) => course.slug),
    ["ai-master-x10-hieu-suat", "marketing-gioi-phai-kiem-duoc-tien"],
  );
});
