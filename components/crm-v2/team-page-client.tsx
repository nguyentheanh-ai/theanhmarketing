"use client";

import { useState } from "react";

import {
  CrmDataTable,
  CrmPaginationBar,
  FilterBar,
  InsightRow,
  MetricGrid,
  PageHeader,
  RightInsightPanel,
  TeamActionButtons,
  StatusBadge,
} from "@/components/crm-v2";
import type { CrmListQuery, CrmListResult, CrmTeamMember } from "@/lib/crm-v2/types";

type TeamPageClientProps = {
  query: CrmListQuery;
  membersResult: CrmListResult<CrmTeamMember>;
};

export default function TeamPageClient({ query, membersResult }: TeamPageClientProps) {
  const rows = membersResult.rows;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedMember = rows.find((row) => row.id === selectedIds[0]) ?? rows[0];

  const roleOptions = Array.from(new Set(rows.map((row) => row.role).filter(Boolean))).map((value) => ({ label: value, value }));
  const statusOptions = Array.from(new Set(rows.map((row) => row.status).filter(Boolean))).map((value) => ({ label: value, value }));

  const ownerCount = rows.filter((row) => row.role === "owner").length;
  const salesCount = rows.filter((row) => row.role !== "owner").length;
  const activeCount = rows.filter((row) => row.status === "active").length;
  const tasksCount = rows.reduce((sum, row) => sum + Number(String(row.tasks ?? 0).replace(/[^\d-]/g, "")), 0);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Access" title="Team & Phân quyền" />
      <TeamActionButtons member={selectedMember} />
      <MetricGrid
        metrics={[
          { label: "Thành viên", value: `${membersResult.total}`, tone: "blue", series: [1, 2, 3, 4, membersResult.total] },
          { label: "Owner", value: `${ownerCount}`, tone: "green", series: [1, 1, 1, 1, ownerCount] },
          { label: "Sales/CSKH", value: `${salesCount}`, tone: "purple", series: [6, 10, 14, 20, salesCount] },
          { label: "Task mở", value: `${tasksCount}`, tone: "orange", series: [4, 8, 12, 16, tasksCount] },
          { label: "Audit log hôm nay", value: `${activeCount}`, tone: "blue", series: [2, 4, 6, 9, activeCount] },
        ]}
      />
      <CrmPaginationBar
        basePath="/admin/crm-v2/team"
        query={query}
        page={membersResult.page}
        pageSize={membersResult.pageSize}
        pageCount={membersResult.pageCount}
        total={membersResult.total}
      />

      <div className="grid min-w-0 gap-4 min-[1840px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <FilterBar
            items={[
              { label: "Vai trò", value: query.filters?.role, param: "role", options: roleOptions },
              { label: "Trạng thái", value: query.filters?.status, param: "status", options: statusOptions },
              { label: "Nội bộ / pipeline", value: undefined },
              { label: "Task", value: undefined },
            ]}
          />
          <CrmDataTable<CrmTeamMember>
            rows={rows}
            rowIdKey="id"
            selectable
            selectedIds={selectedIds}
            onSelectedRowsChange={(ids) => setSelectedIds(ids)}
            columns={[
              { key: "member", label: "Thành viên" },
              { key: "role", label: "Vai trò" },
              { key: "pipeline", label: "Phụ trách" },
              { key: "tasks", label: "Task" },
              { key: "sla", label: "SLA" },
              { key: "status", label: "Trạng thái" },
            ]}
          />
        </div>
        <RightInsightPanel title="Phân quyền">
          <InsightRow label="Role matrix" value="owner / sales / support" tone="blue" />
          <InsightRow label="Lead CRM" value="owner" tone="green" />
          <InsightRow label="Student ops" value="owner / sales" tone="purple" />
          <InsightRow label="Audit log" value={`${activeCount} records`} tone="orange" />
          <StatusBadge tone="green">{selectedMember ? `Đang thao tác: ${selectedMember.member}` : "Chưa chọn thành viên"}</StatusBadge>
        </RightInsightPanel>
      </div>
    </div>
  );
}
