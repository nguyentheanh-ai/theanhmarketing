import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("components/site/header-auth-actions.tsx", "utf8");

test("header primary CTA changes by auth state", () => {
  assert.match(source, /isStudent \? "\/dashboard" : "\/dang-ky"/);
  assert.match(source, /isStudent \? "Khóa học của tôi" : "Học thử ngay"/);
  assert.doesNotMatch(source, /Growth Hub/);
  assert.doesNotMatch(source, /Khám phá Growth System/);
});
