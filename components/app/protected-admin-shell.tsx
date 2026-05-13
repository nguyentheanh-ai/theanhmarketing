import type { ReactNode } from "react";
import { AdminShell } from "@/components/app/admin-shell";
import { requireAdminAuth } from "@/lib/auth/session";

export async function ProtectedAdminShell({
  children,
  nextPath = "/admin",
}: {
  children: ReactNode;
  nextPath?: string;
}) {
  await requireAdminAuth(nextPath);

  return <AdminShell>{children}</AdminShell>;
}
