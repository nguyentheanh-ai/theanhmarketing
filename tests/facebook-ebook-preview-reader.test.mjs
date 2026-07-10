import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.resolve(relativePath));
}

test("Facebook ebook trial route is public and separate from the paid protected reader", () => {
  assert.ok(exists("app/doc-thu/ebook-facebook-ads-2026/page.tsx"));
  assert.ok(exists("components/ebook/facebook-ebook-preview-reader.tsx"));

  const page = read("app/doc-thu/ebook-facebook-ads-2026/page.tsx");
  const previewReader = read("components/ebook/facebook-ebook-preview-reader.tsx");
  const paidReaderPage = read("app/thu-vien/facebook-ads/page.tsx");

  assert.match(page, /FacebookEbookPreviewReader/);
  assert.doesNotMatch(page, /requireFacebookEbookAccess/);
  assert.match(paidReaderPage, /requireFacebookEbookAccess/);
  assert.match(previewReader, /BUY_EBOOK_HREF = "\/academy\/ebook-facebook-ads-2026-premium#price"/);
  assert.match(previewReader, /href=\{BUY_EBOOK_HREF\}[\s\S]*Mua Ebook/);
});

test("Facebook ebook trial only unlocks parts 1 and 5 with public preview images", () => {
  const previewReader = read("components/ebook/facebook-ebook-preview-reader.tsx");

  assert.match(previewReader, /part: 1,[\s\S]*unlocked: true/);
  assert.match(previewReader, /part: 5,[\s\S]*unlocked: true/);
  assert.match(previewReader, /part: 2,[\s\S]*unlocked: false/);
  assert.match(previewReader, /part: 10,[\s\S]*unlocked: false/);
  assert.match(previewReader, /\/ebook-facebook-ads-2026\/phan-\$\{part\}\/\$\{page\}\.png/);
  assert.match(previewReader, /key=\{imageSrc\}/);
  assert.doesNotMatch(previewReader, /\/api\/ebook\/facebook-ads\/page/);
  assert.match(previewReader, /Bản đọc thử đang mở chương 1 và chương 5/);
});

test("Facebook ebook trial public assets include all pages for parts 1 and 5 only", () => {
  assert.ok(exists("public/ebook-facebook-ads-2026/phan-1/1.png"));
  assert.ok(exists("public/ebook-facebook-ads-2026/phan-1/37.png"));
  assert.ok(exists("public/ebook-facebook-ads-2026/phan-5/1.png"));
  assert.ok(exists("public/ebook-facebook-ads-2026/phan-5/53.png"));
  assert.equal(exists("public/ebook-facebook-ads-2026/phan-2/1.png"), false);
});
