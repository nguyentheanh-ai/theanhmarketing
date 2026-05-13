"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({
  className = "",
  mode = "student",
}: {
  className?: string;
  mode?: "student" | "admin";
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignOut() {
    setIsSubmitting(true);
    if (mode === "admin") {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push("/");
    router.refresh();
  }

  return (
    <button
      className={className}
      disabled={isSubmitting}
      onClick={handleSignOut}
      type="button"
    >
      {isSubmitting ? "Đang thoát..." : "Đăng xuất"}
    </button>
  );
}
