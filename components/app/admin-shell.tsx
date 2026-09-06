"use client";
import type { ReactNode } from "react";
import type { AdminRole } from "@/lib/auth/session";
import { CrmShell } from "@/components/crm-v2";
export function AdminShell({ children, adminRole = "owner" }: { children: ReactNode; adminRole?: AdminRole }) {
  return <CrmShell adminRole={adminRole}>{children}</CrmShell>;
}
