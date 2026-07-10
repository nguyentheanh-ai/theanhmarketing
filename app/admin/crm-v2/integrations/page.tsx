import { CrmDataTable, IconButton, InsightRow, IntegrationActionButtons, MetricGrid, PageHeader, Plug, RightInsightPanel, StatusBadge } from "@/components/crm-v2";
import { listCrmV2Integrations, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2IntegrationsPage({ searchParams }: PageProps) {
  const query = normalizeCrmListQuery(await searchParams);
  const integrations = await listCrmV2Integrations(query);

  const adminClient = createSupabaseAdminClient();
  const webhookCount = await (async () => {
    if (!adminClient) return 0;
    const { count, error } = await adminClient.schema("crm_v2").from("webhook_events").select("id", { count: "exact", head: true });
    if (error || !count) return 0;
    return count;
  })();

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Connections" title="Tích hợp" actions={<IconButton href="/api/admin/crm-v2/integrations" label="Kiểm tra webhook"><Plug className="h-4 w-4" /></IconButton>} />
      <IntegrationActionButtons provider="resend" />
      <MetricGrid
        metrics={[
          { label: "Integration accounts", value: `${integrations.total}`, tone: "blue", series: [1, 2, 3, 4] },
          { label: "Webhook events", value: `${webhookCount}`, tone: "slate", series: [0, 0, 0, webhookCount] },
          { label: "Mock destinations", value: `${integrations.rows.filter((row) => row.health === "mock").length}`, tone: "orange", series: [3, 3, 3] },
          { label: "Secrets in code", value: "0", tone: "green", series: [0, 0, 0] },
        ]}
      />
      <div className="grid min-w-0 gap-4 min-[1840px]:grid-cols-[minmax(0,1fr)_340px]">
        <CrmDataTable
          rows={integrations.rows}
          columns={[
            { key: "provider", label: "Provider" },
            { key: "type", label: "Loại" },
            { key: "status", label: "Trạng thái" },
            { key: "lastSync", label: "Sync/Webhook" },
            { key: "health", label: "Health" },
          ]}
        />
        <RightInsightPanel title="Adapter status">
          <InsightRow label="EmailProvider" value={hasSecret("RESEND_API_KEY") ? "Resend/Mock" : "Resend mock"} tone="green" />
          <InsightRow label="Meta CAPI" value="Hash PII first" tone="orange" />
          <InsightRow label="Google" value="Placeholder" tone="blue" />
          <InsightRow label="TikTok" value="Placeholder" tone="purple" />
          <StatusBadge tone={hasSecret("NEXT_PUBLIC_APP_ENV") ? "green" : "orange"}>{hasSecret("NEXT_PUBLIC_APP_ENV") ? "ENV loaded" : "Check env"}</StatusBadge>
        </RightInsightPanel>
      </div>
    </div>
  );
}

function hasSecret(name: string) {
  return Boolean(process.env[name]);
}
