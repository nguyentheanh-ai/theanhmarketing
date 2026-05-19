"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ButtonLink } from "@/components/ui/button-link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthState = "guest" | "student";

export function HeaderAuthActions() {
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

  const isStudent = state === "student";

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <ButtonLink href={isStudent ? "/dashboard" : "/dang-ky"} className="!hidden sm:!inline-flex">
        {isStudent ? "Growth Hub của tôi" : "Khám phá Growth System"}
        <span aria-hidden="true">-&gt;</span>
      </ButtonLink>
      {isStudent ? (
        <SignOutButton className="hidden min-h-10 rounded-xl px-4 text-sm font-bold text-white/62 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50 md:inline-flex md:items-center" />
      ) : (
        <ButtonLink href="/dang-nhap" variant="ghost" className="!hidden px-0 md:!inline-flex">
          Đăng nhập
        </ButtonLink>
      )}
    </div>
  );
}

export function HeaderMobileActions() {
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

  if (state === "student") {
    return (
      <>
        <Link href="/dashboard">Học tiếp</Link>
        <Link href="/khoa-hoc">Khóa học</Link>
      </>
    );
  }

  return (
    <>
      <Link href="/dang-ky">Đăng ký học</Link>
      <Link href="/khoa-hoc">Xem khóa học</Link>
    </>
  );
}
