// Edge cache for anonymous visits to public marketing pages (home, course
// catalogue/landings, academy landings). These pages render the same HTML for
// every guest and never read the query string or cookies on the server, so the
// key is the path alone (ad clicks with utm/fbclid share one entry). Signed-in
// visitors, RSC navigations and non-200/Set-Cookie responses always bypass.
// Entries are kept for a day and refreshed in the background after 60 s, so a
// guest never waits for server rendering once a location has a copy.
const PUBLIC = /^\/(?:|khoa-hoc|khoa-hoc\/[a-z0-9-]+|academy\/[a-z0-9-]+)$/;
const FRESH_MS = 60_000;
const STORED_AT = "x-tam-edge-stored-at";

type Cache = { match(key: Request): Promise<Response | undefined>; put(key: Request, value: Response): Promise<void> };
type WaitUntil = (task: Promise<unknown>) => void;

export function isCacheablePublicRequest(request: Request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.hostname !== "www.theanhmarketing.com" || !PUBLIC.test(url.pathname)) return false;
  if (url.searchParams.has("_rsc") || request.headers.has("rsc") || request.headers.has("next-router-state-tree")) return false;
  const cookie = request.headers.get("cookie") ?? "";
  if (/(?:^|;\s*)(?:__Host-tam-session|sb-[^=]*)=/.test(cookie)) return false;
  return (request.headers.get("accept") ?? "").includes("text/html");
}

async function store(cache: Cache, key: Request, response: Response) {
  if (response.status !== 200 || response.headers.has("set-cookie")) return;
  const copy = new Response(response.body, response);
  copy.headers.set("Cache-Control", "public, max-age=86400");
  copy.headers.set(STORED_AT, String(Date.now()));
  await cache.put(key, copy);
}

export async function servePublicPage(request: Request, render: (request: Request) => Promise<Response>, waitUntil?: WaitUntil, cache?: Cache): Promise<Response> {
  const edge = cache ?? (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  if (!edge || !isCacheablePublicRequest(request)) return render(request);
  const url = new URL(request.url);
  const key = new Request(`${url.origin}${url.pathname}`, { method: "GET" });
  const hit = await edge.match(key).catch(() => undefined);
  if (hit) {
    const age = Date.now() - Number(hit.headers.get(STORED_AT) ?? 0);
    if (age > FRESH_MS && waitUntil) waitUntil(render(new Request(key.url, { headers: { accept: "text/html" } })).then((fresh) => store(edge, key, fresh)).catch(() => undefined));
    const out = new Response(hit.body, hit);
    out.headers.delete(STORED_AT);
    out.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
    out.headers.set("X-Edge-Cache", age > FRESH_MS ? "STALE" : "HIT");
    return out;
  }
  const response = await render(request);
  if (response.status !== 200 || response.headers.has("set-cookie")) return response;
  const [forClient, forCache] = response.body ? response.body.tee() : [null, null];
  const stored = store(edge, key, new Response(forCache, response)).catch(() => undefined);
  if (waitUntil) waitUntil(stored); else await stored;
  const out = new Response(forClient, response);
  out.headers.set("X-Edge-Cache", "MISS");
  return out;
}
