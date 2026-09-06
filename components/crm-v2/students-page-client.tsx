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
  StudentActionButtons,
} from "@/components/crm-v2";
import type { Course } from "@/data/courses";
import type { CrmListQuery, CrmListResult, CrmStudentRow } from "@/lib/crm-v2/types";

type StudentsPageClientProps = {
  query: CrmListQuery;
  studentsResult: CrmListResult<CrmStudentRow>;
  courses: Course[];
  canCreateTicket?: boolean;
};

export default function StudentsPageClient({ courses, query, studentsResult, canCreateTicket = false }: StudentsPageClientProps) {
  const students = studentsResult.rows;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const pendingOrActive = students.filter((row) => row.status === "active").length;
  const completed = students.filter((row) => Number(String(row.progress).replace("%", "")) >= 100).length;
  const upsell = students.reduce((sum, row) => {
    const value = Number(row.upsell);
    return sum + (Number.isFinite(value) && value > 0 ? 1 : 0);
  }, 0);

  const courseOptions = courses.map((course) => ({ label: course.title, value: course.slug }));
  const statusOptions = ["active", "paused", "completed", "revoked"].map((value) => ({ label: value, value }));
  const selectedStudent = selectedIds.length === 1 ? students.find((row) => row.id === selectedIds[0]) : undefined;

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Student success" title="Học viên" />
      {canCreateTicket ? <StudentActionButtons contactId={selectedStudent?.contactId} /> : null}
      <MetricGrid
        metrics={[
          { label: "Lượt ghi danh đã lọc", value: `${studentsResult.total}`, tone: "blue", series: [studentsResult.total] },
          { label: "Đang học trên trang", value: `${pendingOrActive}`, tone: "green", series: [pendingOrActive] },
          { label: "Không hoạt động trên trang", value: `${students.length - pendingOrActive}`, tone: "orange", series: [students.length - pendingOrActive] },
          {
            label: "Hoàn thành trên trang",
            value: `${students.length > 0 ? Math.round((completed / Math.max(students.length, 1)) * 100) : 0}%`,
            tone: "purple",
            series: [students.length > 0 ? Math.round((completed / students.length) * 100) : 0],
          },
          { label: "Có dữ liệu upsell trên trang", value: `${upsell}`, tone: "green", series: [upsell] },
        ]}
      />
      <CrmPaginationBar
        basePath="/admin/crm-v2/students?view=progress"
        query={query}
        page={studentsResult.page}
        pageSize={studentsResult.pageSize}
        pageCount={studentsResult.pageCount}
        total={studentsResult.total}
      />
      <div className="grid min-w-0 gap-4 min-[1840px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <FilterBar
            items={[
              { label: "Khóa học", value: query.filters?.course, param: "course", options: courseOptions },
              { label: "Trạng thái học", value: query.filters?.status, param: "status", options: statusOptions },
            ]}
          />
          <CrmDataTable<CrmStudentRow>
            rows={students}
            selectable
            rowIdKey="id"
            selectedIds={selectedIds}
            onSelectedRowsChange={(ids) => setSelectedIds(ids)}
            columns={[
              { key: "student", label: "Học viên" },
              { key: "course", label: "Khóa học" },
              { key: "status", label: "Trạng thái học" },
              { key: "progress", label: "Tiến độ" },
              { key: "lastLearned", label: "Lần học gần nhất" },
              { key: "engagement", label: "Điểm tương tác" },
              { key: "upsell", label: "Cơ hội upsell" },
              { key: "owner", label: "Owner" },
              { key: "emailCare", label: "Email chăm sóc" },
            ]}
          />
        </div>
        <RightInsightPanel title="Tiến độ & gợi ý">
          <InsightRow label="Dòng/trang" value={`${studentsResult.pageSize}`} tone="blue" />
          <InsightRow label="Tổng học viên lọc" value={`${studentsResult.total}`} tone="green" />
          <InsightRow label="Hoàn thành trên trang" value={`${completed}/${students.length}`} tone="green" />
          <InsightRow label="Đang học trên trang" value={`${pendingOrActive}`} tone="blue" />
          <InsightRow label="Không hoạt động trên trang" value={`${students.length - pendingOrActive}`} tone="orange" />
        </RightInsightPanel>
      </div>
    </div>
  );
}
