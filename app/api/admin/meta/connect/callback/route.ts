import { NextResponse } from "next/server";
import { exchangeMetaAdsOAuthCode, metaAdsStateCookie, metaAdsTokenCookie } from "@/lib/meta/oauth";

function redirectToReport(request: Request, message?: string) {
  const url = new URL("/admin/facebook-ads", request.url);

  if (message) {
    url.searchParams.set("meta_error", message);
  } else {
    url.searchParams.set("connected", "facebook");
  }

  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorDescription = url.searchParams.get("error_description");
  const cookieHeader = request.headers.get("cookie") || "";
  const savedState = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${metaAdsStateCookie}=`))
    ?.split("=")[1];

  if (errorDescription) {
    return redirectToReport(request, errorDescription);
  }

  if (!code || !state || !savedState || state !== savedState) {
    return redirectToReport(request, "Phiên kết nối Facebook không hợp lệ. Vui lòng thử lại.");
  }

  try {
    const token = await exchangeMetaAdsOAuthCode(code);
    const maxAge = Math.max(60 * 30, Math.min(token.expiresIn, 60 * 60 * 24 * 60));
    const response = redirectToReport(request);

    response.cookies.delete(metaAdsStateCookie);
    response.cookies.set(metaAdsTokenCookie, token.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error) {
    return redirectToReport(request, error instanceof Error ? error.message : "Không thể kết nối Facebook Ads.");
  }
}
