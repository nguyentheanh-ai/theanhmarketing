import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentStorageKey } from "../lib/cloudflare/current-storage-index";
import type { PrivateR2Bucket } from "../lib/cloudflare/private-r2";

const current = `supabase-a/${"a".repeat(64)}`;
const removed = `supabase-a/${"b".repeat(64)}`;

function bucket(payload: unknown): PrivateR2Bucket {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return {
    async head() { return null; },
    async get(key) {
      if (key !== "supabase-a/current-index.json") return null;
      return { size: bytes.length, httpEtag: '"fixture"',
        writeHttpMetadata() {},
        body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) };
    },
  };
}

test("only keys in the current published index can pass", async () => {
  const storage = bucket({ version: 1, keys: [current] });
  assert.equal(await isCurrentStorageKey(storage, current), true);
  assert.equal(await isCurrentStorageKey(storage, removed), false);
  assert.equal(await isCurrentStorageKey(storage, "../private"), false);
});

test("missing or malformed indexes deny access", async () => {
  assert.equal(await isCurrentStorageKey(bucket({ version: 2, keys: [current] }), current), false);
  assert.equal(await isCurrentStorageKey(bucket({ version: 1, keys: "invalid" }), current), false);
  assert.equal(await isCurrentStorageKey({ head: async () => null, get: async () => null }, current), false);
});
