import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.redirect("https://www.theanhmarketing.com/academy/ebook-facebook-ads-2026.html", 308);
}
