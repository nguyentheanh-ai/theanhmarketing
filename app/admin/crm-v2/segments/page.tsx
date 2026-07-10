import {
  CrmDataTable,
  FilterBar,
  InsightRow,
  MetricGrid,
  PageHeader,
  RightInsightPanel,
  SegmentActionPanel,
  StatusBadge,
} from "@/components/crm-v2";
import { listCrmV2SegmentsRows, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import type { CrmSegmentRow } from "@/lib/crm-v2/types";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2SegmentsPage({ searchParams }: PageProps) {
  const query = normalizeCrmListQuery(await searchParams);
  const segmentsResult = await listCrmV2SegmentsRows(query);
  const segments: CrmSegmentRow[] = segmentsResult.rows;
  const segmentStatusOptions = [
    { label: "Active", value: "active" },
    { label: "Draft", value: "draft" },
    { label: "Paused", value: "paused" },
    { label: "Archived", value: "archived" },
  ];
  const channelOptions = Array.from(new Set(segments.map((row) => row.channel).filter(Boolean))).map((value) => ({
    label: value,
    value,
  }));

  const activeCount = segments.filter((row) => row.status === "active").length;
  const draftCount = segments.filter((row) => row.status === "draft").length;
  const targetAudienceCount = Math.max(0, segments.reduce((sum, row) => sum + row.size, 0));

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Audience" title="Phân khúc & Tag" />
      <SegmentActionPanel />
      <MetricGrid
        metrics={[
          { label: "Tổng số phân khúc", value: `${segmentsResult.total}`, tone: "blue", series: [4, 7, 8, 12, segmentsResult.total] },
          { label: "Smart list đang chạy", value: `${activeCount}`, tone: "green", series: [2, 4, 5, 7, activeCount] },
          { label: "Tag đang dùng", value: `${Math.max(draftCount + activeCount, 0)}`, tone: "purple", series: [18, 24, 31, 38, Math.max(draftCount + activeCount, 0)] },
          { label: "Audience đồng bộ email", value: `${targetAudienceCount}`, tone: "orange", series: [1200, 2400, 3900, 5100, targetAudienceCount] },
        ]}
      />
      <div className="grid min-w-0 gap-4 min-[1840px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <FilterBar
            items={[
              { label: "Mục tiêu", value: query.filters?.status, param: "status", options: segmentStatusOptions },
              { label: "Kênh dùng", value: query.filters?.source, param: "source", options: channelOptions },
              { label: "Trạng thái", value: query.search ?? "Tất cả", param: "q" },
              { label: "Cập nhật" },
            ]}
          />
          <CrmDataTable
            rows={segments}
            columns={[
              { key: "name", label: "Tên phân khúc" },
              { key: "condition", label: "Điều kiện chính" },
              { key: "size", label: "Quy mô" },
              { key: "goal", label: "Mục tiêu remarketing" },
              { key: "channel", label: "Kênh sử dụng" },
              { key: "updated", label: "Cập nhật" },
              { key: "status", label: "Trạng thái" },
            ]}
          />
        </div>
        <RightInsightPanel title="Rule builder AND/OR">
          <InsightRow label="Combinator" value="AND" tone="blue" />
          {segments[0] ? <InsightRow label="Rule mẫu" value={segments[0].condition.slice(0, 40)} tone="purple" /> : <InsightRow label="Rule mẫu" value="Chưa có rule" tone="slate" />}
          <InsightRow label="Preview" value={`${targetAudienceCount} contacts`} tone="green" />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            Segment rules lưu JSON có version trong `crm_v2.segment_rules`.
          </div>
          <StatusBadge tone="green">Versioned JSON</StatusBadge>
        </RightInsightPanel>
      </div>
    </div>
  );
}
