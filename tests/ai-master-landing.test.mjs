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

test("AI Master X10 landing follows the premium gold reference system with course-owned content", () => {
  const html = read(sourcePath);

  assert.match(html, /Plus\+Jakarta\+Sans/);
  assert.match(html, /Playfair\+Display/);
  assert.match(html, /--gold:\s*#D6A928/i);
  assert.match(html, /asset-placeholder/);
  assert.match(html, /data-visual-slot="instructor-photo"/);
  assert.match(html, /radar-chart/);
  assert.match(html, /Research/);
  assert.match(html, /Create/);
  assert.match(html, /Publish/);
  assert.match(html, /Scale/);
  assert.match(html, /12 chương học theo kiểu làm tới đâu có sản phẩm tới đó/);
  assert.match(html, /2\.997\.000đ/);
  assert.doesNotMatch(html, /--orange:/);
});

test("AI Master X10 academy route is disabled from public access", () => {
  const nextConfig = read(path.resolve("next.config.ts"));
  const proxy = read(path.resolve("proxy.ts"));

  assert.doesNotMatch(nextConfig, /source:\s*"\/academy\/ai-master-x10-hieu-suat"/);
  assert.doesNotMatch(nextConfig, /destination:\s*"\/academy\/ai-master-x10-hieu-suat\.html"/);
  assert.match(proxy, /isDisabledAcademyRoute/);
  assert.match(proxy, /\/academy\/ai-master-x10-hieu-suat/);
  assert.match(proxy, /\/academy\/ai-master-x10-hieu-suat\.html/);
  assert.match(proxy, /status:\s*404/);
  assert.match(proxy, /noindex, nofollow/);
});
