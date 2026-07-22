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

test("lesson list is one flat sequence with continuous numbering", () => {
  assert.doesNotMatch(source, /getModuleGroups/);
  assert.doesNotMatch(source, /moduleGroups\.map/);
  assert.match(source, /\{lessons\.map\(\(lesson, index\) =>/);
  assert.match(source, /\{index \+ 1\}/);
});

test("Facebook Ads reference library sits below the video and above lesson controls", () => {
  const videoIndex = source.indexOf('className="aspect-video w-full bg-black"');
  const referenceLibraryIndex = source.indexOf("<CourseReferenceLibrary");
  const lessonControlsIndex = source.indexOf('<div className="mt-4 grid gap-4">');

  assert.ok(videoIndex !== -1, "video player must remain in the learning room");
  assert.ok(referenceLibraryIndex > videoIndex, "reference library must render after the video player");
  assert.ok(
    lessonControlsIndex > referenceLibraryIndex,
    "lesson title, progress and navigation controls must remain below the reference library",
  );
});
