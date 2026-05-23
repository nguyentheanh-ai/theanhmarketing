import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("course service reads live course content instead of caching stale fallback lessons", () => {
  const source = fs.readFileSync(path.resolve("services/courseService.ts"), "utf8");

  assert.doesNotMatch(source, /unstable_cache/);
  assert.doesNotMatch(source, /courses-with-modules/);
  assert.doesNotMatch(source, /\.order\("sort_order"/);
});

test("course service filters empty demo courses before merging official courses", () => {
  const source = fs.readFileSync(path.resolve("services/courseService.ts"), "utf8");

  assert.match(source, /hasCourseContent/);
  assert.match(source, /module\.lessons\.length > 0/);
});
