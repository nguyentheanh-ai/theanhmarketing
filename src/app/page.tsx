import { AdminShell } from "@/components/admin-shell";
import { loadAdminDataset } from "@/lib/legacy-supabase-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dataset = await loadAdminDataset();

  return <AdminShell dataset={dataset} />;
}
