import { CommandCenterReport } from "@/components/admin/solo-command-center/command-center-report";
import { AdminShell } from "@/components/app/admin-shell";
import { requireAdminAuth } from "@/lib/auth/session";
import {
  getSoloCommandCenterModel,
  resolveCommandCenterRange,
} from "@/services/adminCommandCenterService";
import { redirect } from "next/navigation";

type ReportSearchParams = {
  from?: string | string[];
  to?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminReportPage({
  searchParams,
}: {
  searchParams?: Promise<ReportSearchParams>;
}) {
  const auth = await requireAdminAuth("/admin/bao-cao", ["owner"]);
  redirect("/admin/crm-v2/reports");
  const query = (await searchParams) ?? {};
  const range = resolveCommandCenterRange({
    from: firstValue(query.from),
    to: firstValue(query.to),
  });
  const model = await getSoloCommandCenterModel(range);

  return (
    <AdminShell adminRole={auth?.adminRole ?? "owner"}>
      <CommandCenterReport model={model} />
    </AdminShell>
  );
}
