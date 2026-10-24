import { requireAdminAuth } from "@/lib/auth/session";
import { PageHeader } from "@/components/crm-v2";
import { Bot247LicensesClient } from "@/components/crm-v2/bot247-licenses-client";
import { getBot247AdminSnapshot } from "@/lib/bot247/license-admin";

export default async function Bot247LicensesAdminPage() {
  await requireAdminAuth("/admin/crm-v2/bot247", ["owner"]);
  const snapshot = await getBot247AdminSnapshot();
  return <div className="space-y-4"><PageHeader eyebrow="Phần mềm" title="Bot 24/7 · Mã kích hoạt" /><Bot247LicensesClient initialSnapshot={snapshot} /></div>;
}
