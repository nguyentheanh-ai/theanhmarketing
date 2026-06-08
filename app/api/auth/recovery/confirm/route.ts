import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/auth/session";
import { passwordResetRedirectPath } from "@/lib/auth/password-reset-url";
import { getSafeNextPath } from "@/lib/navigation";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"), "/dashboard");
  const redirectPath = `/doi-mat-khau?next=${encodeURIComponent(nextPath)}&mode=reset`;

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(new URL(`${passwordResetRedirectPath}&error=invalid`, requestUrl.origin));
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL(`${passwordResetRedirectPath}&error=config`, requestUrl.origin));
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(new URL(`${passwordResetRedirectPath}&error=expired`, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
