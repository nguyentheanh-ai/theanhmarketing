"use client";

import { CrmDataTable, FilterBar, InsightRow, MetricGrid, PageHeader, RightInsightPanel, WorkflowBuilder } from "@/components/crm-v2";
import type { CrmAutomationWorkflowRow, CrmListQuery, CrmListResult } from "@/lib/crm-v2/types";
import { useState } from "react";

type AutomationPageClientProps = {
  query: CrmListQuery;
  workflowsResult: CrmListResult<CrmAutomationWorkflowRow>;
};

export default function AutomationPageClient({ query, workflowsResult }: AutomationPageClientProps) {
  const workflows = workflowsResult.rows;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedIds[0]);
  const activeCount = workflows.filter((workflow) => workflow.status === "active").length;
  const draftCount = workflows.filter((workflow) => workflow.status === "draft").length;
  const totalRuns = workflows.reduce((sum, workflow) => sum + (Number.isFinite(workflow.runsNumeric) ? workflow.runsNumeric : 0), 0);
  const waiting = workflows.filter((workflow) => workflow.status === "paused" || workflow.status === "pending" || workflow.status === "draft").length;

  const statusOptions = [
    { label: "active", value: "active" },
    { label: "draft", value: "draft" },
    { label: "paused", value: "paused" },
    { label: "archived", value: "archived" },
    { label: "success", value: "success" },
    { label: "error", value: "error" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Workflow" title="Automation Workflow" />
      <MetricGrid
        metrics={[
          { label: "Workflow đang bật", value: `${activeCount}`, tone: "purple", series: [2, 3, 4, 5, activeCount] },
          { label: "Runs hôm nay", value: `${totalRuns}`, tone: "blue", series: [12, 25, 40, 66, totalRuns] },
          { label: "Draft", value: `${draftCount}`, tone: "orange", series: [1, 2, 3, 4, draftCount] },
          { label: "Step waiting", value: `${waiting}`, tone: "green", series: [4, 8, 12, 18, waiting] },
          { label: "Goal paid", value: `${workflows.length}`, tone: "slate", series: [4, 7, 9, 12, workflows.length] },
        ]}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <WorkflowBuilder
          key={selectedWorkflow?.id ?? "new"}
          workflowId={selectedWorkflow?.id}
          workflowName={selectedWorkflow?.name || "CRM v2 workflow draft"}
        />
      </div>

      <div className="grid min-w-0 gap-4 min-[1840px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <FilterBar
            items={[
              { label: "Trạng thái", value: query.filters?.status, param: "status", options: statusOptions },
              { label: "Template", value: query.search ?? "Tất cả", param: "q" },
              { label: "Phiên bản", value: undefined },
              { label: "Cập nhật", value: undefined },
            ]}
          />

          <CrmDataTable
            rows={workflows}
            rowIdKey="id"
            selectable
            selectedIds={selectedIds}
            onSelectedRowsChange={(ids) => setSelectedIds(ids)}
            columns={[
              { key: "name", label: "Tên workflow" },
              { key: "status", label: "Trạng thái" },
              { key: "runs", label: "Số lần chạy" },
              { key: "updated", label: "Cập nhật" },
            ]}
          />
        </div>
        <RightInsightPanel title="Version & execution">
          <InsightRow label="Draft" value={`${workflows.filter((row) => row.status === "draft").length}`} tone="blue" />
          <InsightRow label="Published" value={`${workflows.filter((row) => row.status === "active").length}`} tone="green" />
          <InsightRow label="Step status" value="pending/running/waiting/success/failed/skipped" tone="purple" />
          <InsightRow label="Idempotency" value="Bắt buộc" tone="orange" />
          <InsightRow
            label="Workflow chọn"
            value={selectedWorkflow ? `${selectedWorkflow.name} (${selectedWorkflow.status})` : "Chưa chọn workflow"}
            tone="blue"
          />
        </RightInsightPanel>
      </div>
    </div>
  );
}
