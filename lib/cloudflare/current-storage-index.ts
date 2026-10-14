import type { PrivateR2Bucket } from "./private-r2";

/** Fail closed when the encrypted backup's current-object snapshot has not been published. */
export async function isCurrentStorageKey(bucket: PrivateR2Bucket, key: string): Promise<boolean> {
  if (!/^supabase-a\/[a-f0-9]{64}$/.test(key)) return false;
  const index = await bucket.get("supabase-a/current-index.json");
  if (!index || index.size > 1024 * 1024) return false;
  try {
    const manifest = await new Response(index.body).json() as { version?: number; keys?: unknown };
    return manifest.version === 1 && Array.isArray(manifest.keys) &&
      manifest.keys.length <= 10000 && manifest.keys.includes(key);
  } catch {
    return false;
  }
}
