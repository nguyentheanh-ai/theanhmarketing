import {
  ChartCard,
  CrmDataTable,
  FilterBar,
  InsightRow,
  MetricGrid,
  PageHeader,
  RightInsightPanel,
  StatusBadge,
} from "@/components/crm-v2";
import { EmailActionButtons } from "@/components/crm-v2/email-action-buttons";
import {
  getCrmV2EmailCampaignKpis,
  getCrmV2LegacyEmailConfigSnapshot,
  listCrmV2EmailCampaigns,
  listCrmV2CourseOptions,
  listCrmV2SegmentsRows,
  normalizeCrmListQuery,
} from "@/lib/crm-v2/data";
import type { CrmEmailCampaignRow } from "@/lib/crm-v2/types";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2EmailPage({ searchParams }: PageProps) {
  const query = normalizeCrmListQuery(await searchParams);
  const [campaignsResult, kpis, segmentsResult, legacyEmailConfigs, courseOptions] = await Promise.all([
    listCrmV2EmailCampaigns(query),
    getCrmV2EmailCampaignKpis(),
    listCrmV2SegmentsRows(normalizeCrmListQuery({ page: "1", pageSize: "50" })),
    getCrmV2LegacyEmailConfigSnapshot(),
    listCrmV2CourseOptions(),
  ]);
  const campaigns: CrmEmailCampaignRow[] = campaignsResult.rows;
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  const statusOptions = Array.from(new Set(["draft", "scheduled", "sending", "sent", "failed", ...campaigns.map((row) => row.status).filter(Boolean)])).map((value) => ({
    label: value,
    value,
  }));
  const campaignTypeOptions = [
    { label: "Broadcast", value: "broadcast" },
    { label: "Drip", value: "drip" },
    { label: "A/B Test", value: "ab_test" },
  ];
  const segmentOptions = segmentsResult.rows.map((segment) => ({ label: segment.name, value: segment.id }));

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Remarketing" title="Remarketing Email" />
      <EmailActionButtons
        campaign={campaigns[0]}
        defaultName="CRM v2 remarketing draft"
        hasResend={hasResend}
        legacyEmailConfigs={legacyEmailConfigs}
        segmentOptions={segmentOptions}
        courseOptions={courseOptions}
      />
      <MetricGrid metrics={kpis} />
      <div className="grid min-w-0 gap-4 min-[1840px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <FilterBar
            items={[
              { label: "Chiến dịch", value: query.search ?? "Tất cả", param: "q" },
              { label: "Loại", value: query.filters?.source, param: "source", options: campaignTypeOptions },
              { label: "Drip" },
              { label: "Template" },
              { label: "A/B Test" },
              { label: "Lịch gửi", value: query.filters?.status, param: "status", options: statusOptions },
            ]}
          />
          <CrmDataTable
            rows={campaigns}
            columns={[
              { key: "name", label: "Tên" },
              { key: "subject", label: "Subject" },
              { key: "segment", label: "Phân khúc nhận" },
              { key: "type", label: "Loại" },
              { key: "status", label: "Trạng thái" },
              { key: "sendTime", label: "Thời gian gửi" },
              { key: "sendable", label: "Gửi được" },
              { key: "openRate", label: "Tỷ lệ mở" },
              { key: "clickRate", label: "Tỷ lệ click" },
              { key: "conversion", label: "Chuyển đổi" },
              { key: "revenue", label: "Doanh thu" },
              { key: "owner", label: "Owner" },
            ]}
          />
        </div>
        <RightInsightPanel title="Preview template">
          <ChartCard title="Mẫu subject">
            <p className="text-sm font-bold text-slate-900">{campaigns[0] ? campaigns[0].name : "Chưa có chiến dịch"}</p>
          </ChartCard>
          <InsightRow label="Suppression" value="Bật" tone="green" />
          <InsightRow label="Unsubscribed" value="Không gửi" tone="red" />
          <InsightRow label="Hard bounce" value="Không gửi" tone="red" />
          <InsightRow label="Complained" value="Không gửi" tone="red" />
          <StatusBadge tone={hasResend ? "green" : "orange"}>
            {hasResend ? "Resend adapter đang chạy" : "Mock adapter do thiếu RESEND_API_KEY"}
          </StatusBadge>
        </RightInsightPanel>
      </div>
      <LegacyEmailConfigPanel configs={legacyEmailConfigs} />
    </div>
  );
}

function LegacyEmailConfigPanel({
  configs,
}: {
  configs: Array<{
    key: string;
    name: string;
    trigger: string;
    subject: string;
    source: string;
    sentCount: number;
    lastSentAt: string;
  }>;
}) {
  return (
    <ChartCard title="Cấu hình email cũ đang dùng">
      <div className="grid gap-3 lg:grid-cols-3">
        {configs.map((config) => (
          <div key={config.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-black text-slate-900">{config.name}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">{config.trigger}</div>
            <div className="mt-3 text-sm font-semibold text-slate-700">{config.subject}</div>
            <div className="mt-3 text-xs font-bold text-slate-500">{config.source}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge tone="blue">{config.sentCount} emails</StatusBadge>
              <StatusBadge tone="slate">{config.lastSentAt || "chưa có log"}</StatusBadge>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
