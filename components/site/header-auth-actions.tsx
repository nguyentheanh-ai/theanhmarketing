"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthState = "guest" | "student";

function useHeaderAuthState() {
  const [state, setState] = useState<AuthState>("guest");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setState(data.session ? "student" : "guest");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? "student" : "guest");
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function HeaderAuthActions() {
  const state = useHeaderAuthState();
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

export function HeaderMobileActions() {
  const state = useHeaderAuthState();

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
