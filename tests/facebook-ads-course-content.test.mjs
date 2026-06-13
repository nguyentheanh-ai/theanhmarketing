import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Facebook Ads course fallback includes the message ads YouTube lesson", () => {
  const source = read("data/courses.ts");

  assert.match(source, /lesson-message-ads/);
  assert.match(source, /Bài 17 - Hướng dẫn lên quảng cáo tin nhắn/);
  assert.match(source, /https:\/\/www\.youtube\.com\/watch\?v=auPdBJGY_pQ/);
  assert.match(source, /https:\/\/www\.youtube\.com\/embed\/auPdBJGY_pQ/);
});

test("Facebook Ads production SQL patch can idempotently add the message ads lesson", () => {
  const sql = read("docs/SUPABASE_ADD_FACEBOOK_ADS_MESSAGE_ADS_LESSON_20260613.sql");

  assert.match(sql, /facebook-ads-2026/);
  assert.match(sql, /Bài 17 - Hướng dẫn lên quảng cáo tin nhắn/);
  assert.match(sql, /https:\/\/www\.youtube\.com\/watch\?v=auPdBJGY_pQ/);
  assert.match(sql, /https:\/\/www\.youtube\.com\/embed\/auPdBJGY_pQ/);
  assert.match(sql, /if not exists/i);
});
