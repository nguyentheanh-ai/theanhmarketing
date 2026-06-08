import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const supabaseHost = "vsxxgdzwtscuxcmjfckt.supabase.co";
const canonicalHost = "theanhmarketing.com";
const legacyHost = "www.theanhmarketing.com";
const enableLegacyHostRedirect = process.env.ENABLE_WWW_TO_APEX_REDIRECT === "true";

function isLocalHost(host: string) {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]")
  );
}

function isLadiPageRoute(pathname: string) {
  return (
    pathname.startsWith("/ladipage/") ||
    pathname === "/academy/facebook-ads-master-2026" ||
    pathname === "/academy/facebook-ads-master-2026.html"
  );
}

function isDisabledAcademyRoute(pathname: string) {
  return (
    pathname === "/academy/ai-master-x10-hieu-suat" ||
    pathname === "/academy/ai-master-x10-hieu-suat.html"
  );
}

function isStudentAccessBridgeRoute(pathname: string) {
  return pathname === "/vao-khoa-hoc" || pathname === "/go";
}

function stripFrameAncestors(policy: string) {
  return policy
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith("frame-ancestors"))
    .join("; ");
}

function buildContentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    "https://connect.facebook.net",
    "https://www.googletagmanager.com",
  ];

  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com https://qr.sepay.vn https://img.vietqr.io https://thanhtoanai.topexpert.vn https://www.facebook.com https://www.google-analytics.com https://www.googletagmanager.com https://${supabaseHost}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://${supabaseHost} https://*.supabase.co https://api.resend.com https://www.facebook.com https://connect.facebook.net https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net`,
    `media-src 'self' https://${supabaseHost}`,
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.googletagmanager.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto:",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
    "report-uri /api/security/csp-report",
  ].join("; ");
}

function buildLadiPageContentSecurityPolicy() {
  return [
    "default-src 'self' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://w.ladicdn.com https://s.ladicdn.com https://a.ladipage.com https://*.ladipage.com https://connect.facebook.net https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://w.ladicdn.com https://s.ladicdn.com",
    "img-src 'self' data: blob: https: https://w.ladicdn.com https://s.ladicdn.com https://www.facebook.com",
    "font-src 'self' data: https://fonts.gstatic.com https://w.ladicdn.com https://s.ladicdn.com",
    "connect-src 'self' https: https://api1.ldpform.com https://api.sales.ldpform.net https://a.ladipage.com https://*.ladipage.com https://w.ladicdn.com https://s.ladicdn.com https://connect.facebook.net https://www.facebook.com",
    "media-src 'self' https: blob:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.facebook.com https://www.googletagmanager.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://api1.ldpform.com https://api.sales.ldpform.net",
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
  const isProductionDomain = host === canonicalHost || host === legacyHost;

  if (!isLocalHost(host) && isProductionDomain && (isHttpRequest || (enableLegacyHostRedirect && host === legacyHost))) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = canonicalHost;
    url.port = "";

    return NextResponse.redirect(url, 301);
  }

  if (isDisabledAcademyRoute(request.nextUrl.pathname)) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
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

  const contentSecurityPolicy = isLadiPageRoute(request.nextUrl.pathname)
    ? buildLadiPageContentSecurityPolicy()
    : buildContentSecurityPolicy(nonce);

  response.headers.set(
    "Content-Security-Policy",
    isStudentAccessBridgeRoute(request.nextUrl.pathname)
      ? stripFrameAncestors(contentSecurityPolicy)
      : contentSecurityPolicy,
  );

  if (!isStudentAccessBridgeRoute(request.nextUrl.pathname)) {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
