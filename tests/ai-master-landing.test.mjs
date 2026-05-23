import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const sourcePath = path.resolve("public/ladipage/ai-master-x10-hieu-suat.html");
const publishedPath = path.resolve("public/academy/ai-master-x10-hieu-suat.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("AI Master X10 landing source and published route stay synced", () => {
  assert.equal(read(sourcePath), read(publishedPath));
});

test("AI Master X10 landing posts to the order API with the correct course and price", () => {
  const html = read(sourcePath);

  assert.match(html, /\/api\/orders/);
  assert.match(html, /\/thanh-toan\//);
  assert.match(html, /ai-master-x10-hieu-suat/);
  assert.match(html, /1299000/);
  assert.match(html, /1\.299\.000/);
  assert.match(html, /Biến tri thức thành tiền/);
});

test("AI Master X10 landing is rewritten for The Anh Marketing, not copied from the reference", () => {
  const html = read(sourcePath);

  assert.doesNotMatch(html, /topexpert/i);
  assert.doesNotMatch(html, /Hivi/i);
  assert.doesNotMatch(html, /Mai Kim Quý/i);
  assert.doesNotMatch(html, /Hoàn tiền/i);
});

test("Next and CSP config expose the AI Master X10 academy route", () => {
  const nextConfig = read(path.resolve("next.config.ts"));
  const proxy = read(path.resolve("proxy.ts"));

  assert.match(nextConfig, /\/academy\/ai-master-x10-hieu-suat/);
  assert.match(nextConfig, /\/academy\/ai-master-x10-hieu-suat\.html/);
  assert.match(proxy, /\/academy\/ai-master-x10-hieu-suat/);
  assert.match(proxy, /\/academy\/ai-master-x10-hieu-suat\.html/);
});
