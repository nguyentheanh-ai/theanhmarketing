/** Parsing only. The returned bearer proof must be verified against authoritative
 * session state before creating native credentials. Never authorize from cookie
 * user metadata, email, JWT claims or a browser supplied user ID. No I/O/logging. */
export type UnverifiedSupabaseProof = { refreshToken: string };
const MAX_BYTES = 32768;
const utf8 = new TextEncoder();

export function readUnverifiedSupabaseStoredProof(value: string | null): UnverifiedSupabaseProof | null {
  if (!value || value.length > MAX_BYTES || utf8.encode(value).length > MAX_BYTES) return null;
  try {
    const session: unknown = JSON.parse(value);
    if (!session || typeof session !== "object" || Array.isArray(session)) return null;
    const token: unknown = (session as Record<string, unknown>).refresh_token;
    // Opaque proof: do not infer a deployed refresh algorithm from its shape.
    if (typeof token !== "string" || !token || token.length > 4096 || !/^[\x21-\x7e]+$/.test(token)) return null;
    return { refreshToken: token };
  } catch { return null; }
}

export function readUnverifiedSupabaseCookieProof(header: string | null, projectId: string): UnverifiedSupabaseProof | null {
  if (!/^[a-z]{20}$/.test(projectId) || !header || header.length > MAX_BYTES || utf8.encode(header).length > MAX_BYTES) return null;
  const key = `sb-${projectId}-auth-token`;
  const chunks = new Map<number, string>();
  let single: string | undefined;
  try {
    for (const item of header.split(";")) {
      const eq = item.indexOf("=");
      const name = (eq < 0 ? item : item.slice(0, eq)).trim();
      if (name !== key && !name.startsWith(key + ".")) continue;
      if (eq < 0) return null;
      const value = decodeURIComponent(item.slice(eq + 1).trim());
      if (!value) return null;
      if (name === key) {
        if (single !== undefined) return null;
        single = value;
      } else {
        const suffix = name.slice(key.length + 1);
        if (!/^(0|[1-9][0-9]*)$/.test(suffix)) return null;
        const index = Number(suffix);
        if (index >= 16 || chunks.has(index)) return null;
        chunks.set(index, value);
      }
    }
    if (single !== undefined && chunks.size) return null;
    let value = single;
    if (value === undefined) {
      if (!chunks.size) return null;
      value = "";
      for (let i = 0; i < chunks.size; i++) {
        const chunk = chunks.get(i);
        if (chunk === undefined) return null;
        value += chunk;
      }
    }
    if (value.startsWith("base64-")) {
      const encoded = value.slice(7);
      if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) return null;
      const bytes = Uint8Array.from(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
      // Reject noncanonical pad bits and invalid UTF8 instead of silently
      // accepting alternate encodings / replacement characters.
      const canonical = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      if (canonical !== encoded) return null;
      value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    return readUnverifiedSupabaseStoredProof(value);
  } catch { return null; }
}
