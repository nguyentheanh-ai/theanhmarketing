import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { buildMetaAdsOAuthUrl, metaAdsStateCookie } from "@/lib/meta/oauth";

export async function GET() {
  if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
    const { adminRole } = await getCurrentAuth();

    if (!canAccessAdminRole(adminRole, ["owner"])) {
      return NextResponse.json({ ok: false, message: "Bạn cần quyền owner để kết nối Facebook Ads." }, { status: 403 });
    }
  }

  const state = crypto.randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(buildMetaAdsOAuthUrl(state));

  response.cookies.set(metaAdsStateCookie, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}
