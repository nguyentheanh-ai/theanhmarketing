import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("student dashboard course banners show full thumbnails without cropping", () => {
  const source = fs.readFileSync(path.resolve("components/app/student-dashboard.tsx"), "utf8");

  assert.match(source, /object-contain/);
  assert.doesNotMatch(source, /className=\{`h-full w-full object-cover/);
  assert.doesNotMatch(source, /className="h-full w-full object-cover"/);
});
