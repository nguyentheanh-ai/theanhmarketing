import type { ReactNode } from "react";
import { AdminShell } from "@/components/app/admin-shell";
import { requireAdminAuth, type AdminRole } from "@/lib/auth/session";

export async function ProtectedAdminShell({
  children,
  nextPath = "/admin",
  allowedRoles = ["owner"],
}: {
  children: ReactNode;
  nextPath?: string;
  allowedRoles?: AdminRole[];
}) {
  const auth = await requireAdminAuth(nextPath, allowedRoles);

  return <AdminShell adminRole={auth?.adminRole ?? "owner"}>{children}</AdminShell>;
}
