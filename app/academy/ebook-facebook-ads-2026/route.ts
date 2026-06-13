import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/academy/ebook-facebook-ads-2026.html", request.url), 308);
}
