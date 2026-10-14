import { signPrivateR2Url } from "./private-r2";

/** Match the opaque keys written by scripts/backup-storage.py and mirror-storage-a-to-r2.py. */
export async function opaqueStorageKey(bucket: string, name: string): Promise<string> {
  if (!bucket || !name || name.startsWith("/") || name.split("/").some((part) => part === "..")) {
    throw new Error("Invalid storage object identity");
  }
  const bytes = new TextEncoder().encode(`${bucket}\0${name}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `supabase-a/${hex}`;
}

/** Call only after the route has checked the current user's entitlement. */
export async function signedStagingStorageUrl(origin: string, bucket: string, name: string, secret: string, download?: string): Promise<string> {
  if (!secret) throw new Error("Missing private R2 signing secret");
  const endpoint = new URL("/__cf/private-r2", origin);
  return signPrivateR2Url(endpoint.toString(), await opaqueStorageKey(bucket, name), secret, 120, Date.now(), download);
}
