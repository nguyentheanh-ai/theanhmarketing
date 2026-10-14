import assert from "node:assert/strict";
import test from "node:test";
import { opaqueStorageKey, signedStagingStorageUrl } from "../lib/cloudflare/storage-r2-url";

test("Storage identity uses the same opaque key as the encrypted backup tool", async () => {
  assert.equal(await opaqueStorageKey("test-bucket", "path/to/file.pdf"),
    "supabase-a/e5f67f2028f51fb912bd4036c372514301f8b2193c33b81a94d080c807247a55");
  await assert.rejects(opaqueStorageKey("test-bucket", "../private.pdf"));
});

test("staging URL exposes only an opaque key and expires shortly", async () => {
  const url = new URL(await signedStagingStorageUrl(
    "https://staging.example.invalid", "test-bucket", "path/to/file.pdf", "fixture-secret"));
  assert.equal(url.pathname, "/__cf/private-r2");
  assert.equal(url.searchParams.get("key"),
    "supabase-a/e5f67f2028f51fb912bd4036c372514301f8b2193c33b81a94d080c807247a55");
  assert.equal(url.href.includes("path/to/file.pdf"), false);
  const ttl = Number(url.searchParams.get("expires")) - Math.floor(Date.now() / 1000);
  assert.ok(ttl >= 118 && ttl <= 120);
  await assert.rejects(signedStagingStorageUrl("https://staging.example.invalid", "a", "b", ""));
  const download = new URL(await signedStagingStorageUrl("https://staging.example.invalid",
    "a", "b", "fixture-secret", "Book.pdf"));
  assert.equal(download.searchParams.get("download"), "Book.pdf");
});
