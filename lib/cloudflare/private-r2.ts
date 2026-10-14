/** Private R2 delivery primitive. The caller must authorize the student before signing. */
const MAX_TTL_SECONDS = 15 * 60;
const encoder = new TextEncoder();

export type PrivateR2Object = {
  size: number;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
};

export type PrivateR2Body = PrivateR2Object & { body: ReadableStream };

export type PrivateR2Bucket = {
  head(key: string): Promise<PrivateR2Object | null>;
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<PrivateR2Body | null>;
};

function validKey(key: string) {
  return key.length > 0 && key.length <= 1024 && !key.startsWith("/") &&
    !key.split("/").some((part) => part === "" || part === "." || part === "..") &&
    !/[\\\u0000-\u001f\u007f]/.test(key);
}

async function hmac(key: string, message: string): Promise<Uint8Array> {
  const imported = await crypto.subtle.importKey("raw", encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", imported, encoder.encode(message)));
}

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function equalSignature(actual: string, expected: Uint8Array) {
  const expectedText = base64url(expected);
  if (actual.length !== expectedText.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) {
    difference |= actual.charCodeAt(index) ^ expectedText.charCodeAt(index);
  }
  return difference === 0;
}

function validDownloadName(name: string) {
  return name.length > 0 && name.length <= 200 && !/[\\/\u0000-\u001f\u007f]/.test(name);
}

function canonical(key: string, expires: number, download?: string) {
  return `GET\n${key}\n${expires}${download === undefined ? "" : `\n${download}`}`;
}

export async function signPrivateR2Url(
  endpoint: string,
  key: string,
  secret: string,
  ttlSeconds = 300,
  nowMs = Date.now(),
  download?: string,
) {
  if (!validKey(key) || !secret || !Number.isInteger(ttlSeconds) ||
      ttlSeconds < 1 || ttlSeconds > MAX_TTL_SECONDS ||
      (download !== undefined && !validDownloadName(download))) {
    throw new Error("Invalid private R2 signing input");
  }
  const url = new URL(endpoint);
  if (url.protocol !== "https:") throw new Error("Private R2 URL requires HTTPS");
  const expires = Math.floor(nowMs / 1000) + ttlSeconds;
  url.search = "";
  url.searchParams.set("key", key);
  url.searchParams.set("expires", String(expires));
  if (download !== undefined) url.searchParams.set("download", download);
  url.searchParams.set("sig", base64url(await hmac(secret, canonical(key, expires, download))));
  return url.toString();
}

function rangeForHeader(header: string | null, size: number) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return false;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix < 1) return false;
    const length = Math.min(suffix, size);
    return { offset: size - length, length };
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return false;
  return { offset: start, length: Math.min(end, size - 1) - start + 1 };
}

function objectHeaders(meta?: PrivateR2Object, cacheControl = "private, no-store") {
  const headers = new Headers();
  meta?.writeHttpMetadata(headers);
  headers.set("Cache-Control", cacheControl);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Accept-Ranges", "bytes");
  if (meta) headers.set("ETag", meta.httpEtag);
  return headers;
}

/** Only call for a fixed, allowlisted public key or after caller authorization. */
export async function serveR2Object(
  request: Request,
  bucket: PrivateR2Bucket,
  key: string,
  cacheControl = "private, no-store",
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  if (!validKey(key)) return new Response(null, { status: 404, headers: objectHeaders(undefined, cacheControl) });
  const meta = await bucket.head(key);
  if (!meta) return new Response(null, { status: 404, headers: objectHeaders(undefined, cacheControl) });
  const headers = objectHeaders(meta, cacheControl);
  if (request.method === "HEAD") {
    headers.set("Content-Length", String(meta.size));
    return new Response(null, { status: 200, headers });
  }
  const ifRange = request.headers.get("If-Range");
  const rangeHeader = ifRange && ifRange !== meta.httpEtag ? null : request.headers.get("Range");
  const range = rangeForHeader(rangeHeader, meta.size);
  if (range === false) {
    headers.set("Content-Range", `bytes */${meta.size}`);
    return new Response(null, { status: 416, headers });
  }
  const object = await bucket.get(key, range ? { range } : undefined);
  if (!object) return new Response(null, { status: 404, headers: objectHeaders(undefined, cacheControl) });
  if (range) {
    headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${meta.size}`);
    headers.set("Content-Length", String(range.length));
  } else {
    headers.set("Content-Length", String(meta.size));
  }
  return new Response(object.body, { status: range ? 206 : 200, headers });
}

export async function servePrivateR2(
  request: Request,
  bucket: PrivateR2Bucket,
  secret: string,
  nowMs = Date.now(),
  isCurrentKey?: (key: string) => Promise<boolean>,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const url = new URL(request.url);
  const keys = url.searchParams.getAll("key");
  const expiries = url.searchParams.getAll("expires");
  const signatures = url.searchParams.getAll("sig");
  const downloads = url.searchParams.getAll("download");
  const download = downloads[0];
  const key = keys[0] ?? "";
  const expiresText = expiries[0] ?? "";
  const now = Math.floor(nowMs / 1000);
  const expires = Number(expiresText);
  if (keys.length !== 1 || expiries.length !== 1 || signatures.length !== 1 || downloads.length > 1 ||
      !validKey(key) || !secret || !/^\d+$/.test(expiresText) ||
      !Number.isSafeInteger(expires) || expires <= now || expires > now + MAX_TTL_SECONDS ||
      (download !== undefined && !validDownloadName(download)) ||
      !equalSignature(signatures[0], await hmac(secret, canonical(key, expires, download)))) {
    return new Response(null, { status: 403, headers: objectHeaders() });
  }
  // The archive retains old bytes for rollback; a valid old link cannot serve a removed object.
  if (isCurrentKey && !(await isCurrentKey(key))) {
    return new Response(null, { status: 403, headers: objectHeaders() });
  }
  const response = await serveR2Object(request, bucket, key);
  if (download !== undefined && response.ok) {
    response.headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(download)}`);
  }
  return response;
}
