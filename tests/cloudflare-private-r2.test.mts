import assert from "node:assert/strict";
import test from "node:test";
import { signPrivateR2Url, servePrivateR2, serveR2Object, type PrivateR2Bucket } from "../lib/cloudflare/private-r2";

const secret = "synthetic-test-signing-secret";
const now = Date.parse("2026-10-13T13:00:00Z");
const payload = new TextEncoder().encode("0123456789abcdef");
const key = "course/fixture.bin";

const bucket: PrivateR2Bucket = {
  async head(requested) {
    if (requested !== key) return null;
    return { size: payload.length, httpEtag: '"qa-etag"',
      writeHttpMetadata(headers) { headers.set("Content-Type", "application/octet-stream"); } };
  },
  async get(requested, options) {
    if (requested !== key) return null;
    const offset = options?.range?.offset ?? 0;
    const length = options?.range?.length ?? payload.length;
    const bytes = payload.slice(offset, offset + length);
    return { size: payload.length, httpEtag: '"qa-etag"',
      writeHttpMetadata(headers) { headers.set("Content-Type", "application/octet-stream"); },
      body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) };
  },
};

test("signed private URL serves full, HEAD and byte ranges", async () => {
  const url = await signPrivateR2Url("https://staging.example.invalid/private", key, secret, 300, now);
  const full = await servePrivateR2(new Request(url), bucket, secret, now);
  assert.equal(full.status, 200);
  assert.equal(await full.text(), "0123456789abcdef");
  assert.equal(full.headers.get("Cache-Control"), "private, no-store");
  const head = await servePrivateR2(new Request(url, { method: "HEAD" }), bucket, secret, now);
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("Content-Length"), "16");
  const partial = await servePrivateR2(new Request(url, { headers: { Range: "bytes=4-7" } }), bucket, secret, now);
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get("Content-Range"), "bytes 4-7/16");
  assert.equal(await partial.text(), "4567");
  const suffix = await servePrivateR2(new Request(url, { headers: { Range: "bytes=-3" } }), bucket, secret, now);
  assert.equal(await suffix.text(), "def");
  const invalidRange = await servePrivateR2(new Request(url, { headers: { Range: "bytes=20-30" } }), bucket, secret, now);
  assert.equal(invalidRange.status, 416);
});

test("rejects expired, changed, duplicate and unsafe signatures before R2 access", async () => {
  const url = await signPrivateR2Url("https://staging.example.invalid/private", key, secret, 30, now);
  assert.equal((await servePrivateR2(new Request(url), bucket, secret, now + 31_000)).status, 403);
  const tampered = new URL(url);
  tampered.searchParams.set("key", "course/other.bin");
  assert.equal((await servePrivateR2(new Request(tampered), bucket, secret, now)).status, 403);
  const duplicated = new URL(url);
  duplicated.searchParams.append("key", key);
  assert.equal((await servePrivateR2(new Request(duplicated), bucket, secret, now)).status, 403);
  await assert.rejects(signPrivateR2Url("https://staging.example.invalid/private", "../secret", secret, 30, now));
});

test("a signed URL cannot serve an object removed from the current index", async () => {
  const url = await signPrivateR2Url("https://staging.example.invalid/private", key, secret, 30, now);
  let checked = false;
  const denied = await servePrivateR2(new Request(url), bucket, secret, now, async () => {
    checked = true;
    return false;
  });
  assert.equal(checked, true);
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("Cache-Control"), "private, no-store");
  checked = false;
  const invalid = new URL(url);
  invalid.searchParams.set("sig", "invalid");
  assert.equal((await servePrivateR2(new Request(invalid), bucket, secret, now, async () => {
    checked = true;
    return true;
  })).status, 403);
  assert.equal(checked, false);
});

test("download filename is signed and preserved for the PDF response", async () => {
  const url = await signPrivateR2Url("https://staging.example.invalid/private", key, secret,
    120, now, "Facebook Ads 2026 - Full Ebook.pdf");
  const response = await servePrivateR2(new Request(url), bucket, secret, now);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Disposition"),
    "attachment; filename*=UTF-8''Facebook%20Ads%202026%20-%20Full%20Ebook.pdf");
  const tampered = new URL(url);
  tampered.searchParams.set("download", "other.pdf");
  assert.equal((await servePrivateR2(new Request(tampered), bucket, secret, now)).status, 403);
  await assert.rejects(signPrivateR2Url("https://staging.example.invalid/private", key, secret,
    120, now, "../private.pdf"));
});

test("fixed public R2 object supports streaming ranges without exposing other keys", async () => {
  const request = new Request("https://staging.example.invalid/public.mp4", { headers: { Range: "bytes=5-9" } });
  const response = await serveR2Object(request, bucket, key, "public, max-age=3600");
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Content-Range"), "bytes 5-9/16");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=3600");
  assert.equal(await response.text(), "56789");
  assert.equal((await serveR2Object(request, bucket, "../private", "public, max-age=3600")).status, 404);
});
