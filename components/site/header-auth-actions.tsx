"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/button-link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { observeHeaderAuth, type HeaderAuthProvider, type HeaderAuthState } from "@/lib/auth/header-auth-state";

function useHeaderAuthState(provider: HeaderAuthProvider) {
  const pathname = usePathname();
  const [state, setState] = useState<HeaderAuthState>("guest");

  useEffect(() => {
    const observer = observeHeaderAuth(provider, {
      createSourceClient: createSupabaseBrowserClient,
      fetchSession: fetch,
      onState: setState,
    });
    const onVisible = () => { if (document.visibilityState === "visible") observer.refresh(); };
    window.addEventListener("focus", observer.refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      observer.close();
      window.removeEventListener("focus", observer.refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [provider, pathname]);

  return state;
}

export function HeaderAuthActions({ provider = "supabase" }: { provider?: HeaderAuthProvider }) {
  const state = useHeaderAuthState(provider);
  const isStudent = state === "student";

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <ButtonLink href={isStudent ? "/dashboard" : "/dang-ky"} className="!hidden sm:!inline-flex">
        {isStudent ? "Khóa học của tôi" : "Đăng ký"}
        <span aria-hidden="true">-&gt;</span>
      </ButtonLink>
      {isStudent ? (
        <ButtonLink href="/tai-khoan" variant="ghost" className="!hidden px-0 md:!inline-flex">Tài khoản</ButtonLink>
      ) : (
        <ButtonLink href="/dang-nhap" variant="ghost" className="!hidden px-0 md:!inline-flex">
          Đăng nhập
        </ButtonLink>
      )}
    </div>
  );
}

export function HeaderMobileActions({ provider = "supabase" }: { provider?: HeaderAuthProvider }) {
  const state = useHeaderAuthState(provider);

  if (state === "student") {
    return (
      <>
        <Link href="/dashboard">Khóa học của tôi</Link>
        <Link href="/tai-khoan">Tài khoản</Link>
      </>
    );
  }

  return (
    <>
      <Link href="/dang-ky">Đăng ký</Link>
      <Link href="/dang-nhap">Đăng nhập</Link>
    </>
  );
}
