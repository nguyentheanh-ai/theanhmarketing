import {getNativeRequestContext} from '@/lib/cloudflare/native-request-context';

type Fetcher = {fetch: (input: Request) => Promise<Response>};

// Server-to-server calls to the student app (App B): provisioning and website
// login. On the Cloudflare production Worker, A reaches B through the
// STUDENT_APP service binding, because Cloudflare refuses Worker-to-Worker
// fetches on *.workers.dev (error 1042). Only URLs on the configured app origin
// use the binding; everything else, and every non-Worker runtime (Vercel),
// keeps the normal global fetch.
export function fetchStudentApp(url: string, init: RequestInit, appUrl = process.env.NEXT_PUBLIC_APP_URL) {
  const binding = (getNativeRequestContext()?.env as {STUDENT_APP?: Fetcher} | undefined)?.STUDENT_APP;
  let sameApp = false;
  try { sameApp = Boolean(appUrl) && new URL(url).origin === new URL(appUrl!).origin; } catch { sameApp = false; }
  if (!binding || typeof binding.fetch !== 'function' || !sameApp) return fetch(url, init);
  // Service binding requests are never cached; drop the RequestInit cache hint.
  const {cache: _cache, ...rest} = init;
  void _cache;
  return binding.fetch(new Request(url, rest));
}
