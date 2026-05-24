import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("components/course/learning-room.tsx", "utf8");

test("learning room uses a YouTube-style hidden sidebar and compact lesson header", () => {
  assert.match(source, /useState\(false\)/);
  assert.match(source, /aria-label="Mở menu khóa học"/);
  assert.doesNotMatch(source, /lg:ml-72/);
  assert.doesNotMatch(source, /href="#support"/);
  assert.doesNotMatch(source, /id="support"/);
});

test("learning room removes support and lesson meta badges from the main lesson card", () => {
  assert.doesNotMatch(source, /Hỗ trợ học viên/);
  assert.doesNotMatch(source, /Gửi email hỗ trợ/);
  assert.doesNotMatch(source, /Tiến độ \{progressPercent\}%/);
  assert.doesNotMatch(source, /currentLesson\.duration/);
});

test("lesson list no longer prints the video lesson label", () => {
  assert.doesNotMatch(source, /lesson\.duration/);
  assert.match(source, /\{getAccessLabel\(lesson\.access\)\}/);
});
