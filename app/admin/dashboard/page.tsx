import { CommandCenterDashboard } from "@/components/admin/solo-command-center/command-center-dashboard";
import { AdminShell } from "@/components/app/admin-shell";
import { requireAdminAuth } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  getSoloCommandCenterModel,
  resolveCommandCenterRange,
} from "@/services/adminCommandCenterService";

type DashboardSearchParams = {
  from?: string | string[];
  to?: string | string[];
  task?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>;
}) {
  const auth = await requireAdminAuth("/admin/dashboard", ["owner"]);
  redirect("/admin/crm-v2");
  const query = (await searchParams) ?? {};
  const range = resolveCommandCenterRange({
    from: firstValue(query.from),
    to: firstValue(query.to),
  });
  const selectedTaskId = firstValue(query.task);
  const model = await getSoloCommandCenterModel(range);

  return (
    <AdminShell adminRole={auth?.adminRole ?? "owner"}>
      <CommandCenterDashboard model={model} selectedTaskId={selectedTaskId} />
    </AdminShell>
  );
}
