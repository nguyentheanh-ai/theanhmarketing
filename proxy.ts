import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const supabaseHost = "vsxxgdzwtscuxcmjfckt.supabase.co";

function isLocalHost(host: string) {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]")
  );
}

function buildContentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = [`'self'`, `'nonce-${nonce}'`];

  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com https://qr.sepay.vn https://img.vietqr.io https://${supabaseHost}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://${supabaseHost} https://*.supabase.co https://api.resend.com`,
    `media-src 'self' https://${supabaseHost}`,
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto:",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
    "report-uri /api/security/csp-report",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttpRequest =
    forwardedProto === "http" || request.nextUrl.protocol === "http:";

  if (!isLocalHost(host) && isHttpRequest) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = host;

    return NextResponse.redirect(url, 308);
  }

  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-csp-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
