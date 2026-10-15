"use client";

import {withNativeAuthMutation,NativeAuthCoordinationError} from "@/lib/cloudflare/native-auth-mutation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({
  className = "",
  mode = "student",
  authProvider = "supabase",authContext,
}: {
  className?: string;
  mode?: "student" | "admin";
  authProvider?: "supabase" | "native-d1";authContext?:string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignOut() {
    setIsSubmitting(true);
    setMessage("");
    if (authProvider === "native-d1") {
      try {
        await withNativeAuthMutation(async()=>{
          const response = await fetch("/api/cloudflare-auth/logout", { method: "POST", signal: AbortSignal.timeout(15000), headers: { "Content-Type": "application/json",...(authContext?{"X-TAM-Auth-Context":authContext}:{}) }, body: "{}" });
          const result = await response.json().catch(() => null);
          if (!response.ok || result?.ok !== true) { setMessage(response.status===409?"Tài khoản đã thay đổi ở phiên khác. Vui lòng tải lại trang trước khi đăng xuất.":"Chưa đăng xuất được. Vui lòng thử lại."); setIsSubmitting(false); return; }
          router.push("/"); router.refresh();
        });
      } catch (error) { setMessage(error instanceof NativeAuthCoordinationError?error.message:"Chưa đăng xuất được. Vui lòng thử lại."); setIsSubmitting(false); }
      return;
    }
    const supabase = createSupabaseBrowserClient();

    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push(mode === "admin" ? "/admin/login" : "/");
    router.refresh();
  }

  return (
    <>
    <button
      className={className}
      disabled={isSubmitting}
      onClick={handleSignOut}
      type="button"
    >
      {isSubmitting ? "Đang thoát..." : "Đăng xuất"}
    </button>
    {message ? <span role="alert">{message}</span> : null}
    </>
  );
}
