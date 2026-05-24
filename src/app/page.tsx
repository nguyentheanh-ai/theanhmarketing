import { AdminShell } from "@/components/admin-shell";
import { loadAdminDataset } from "@/lib/legacy-supabase-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dataset = await loadAdminDataset();
  const datasetKey = [
    dataset.leads[0]?.id ?? "no-leads",
    dataset.orders[0]?.id ?? "no-orders",
    dataset.leads.length,
    dataset.orders.length,
    dataset.activityLogs?.length ?? 0,
  ].join(":");

  return <AdminShell dataset={dataset} key={datasetKey} />;
}
