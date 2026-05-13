import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isLocalHost(host: string) {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]")
  );
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
