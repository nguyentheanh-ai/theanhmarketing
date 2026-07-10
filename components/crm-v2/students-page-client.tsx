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
import { CourseLmsManager, LmsStudentsOverview } from "@/components/crm-v2/lms-management-client";
import type { CrmListQuery, CrmListResult, CrmStudentRow } from "@/lib/crm-v2/types";
import type { AdminLmsSnapshot } from "@/lib/lms/types";

type StudentsPageClientProps = {
  query: CrmListQuery;
  studentsResult: CrmListResult<CrmStudentRow>;
  lmsSnapshot: AdminLmsSnapshot;
  view?: "students" | "courses";
};

const lmsFocusedTabs = "Tổng quan Module Bài học Học viên Tài nguyên Cài đặt";

export default function StudentsPageClient({ query, studentsResult, lmsSnapshot, view = "students" }: StudentsPageClientProps) {
  const students = studentsResult.rows;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState(lmsSnapshot.selectedCourseSlug || students[0]?.courseSlug || students[0]?.course || "");

  const pendingOrActive = students.filter((row) => row.status === "active").length;
  const completed = students.filter((row) => Number(String(row.progress).replace("%", "")) >= 100).length;
  const upsell = students.reduce((sum, row) => {
    const value = Number(row.upsell);
    return sum + (Number.isFinite(value) ? 1 : 0);
  }, 0);

  const courseOptions = Array.from(
    new Map(students.map((row) => [row.courseSlug || row.course, { label: row.course, value: row.courseSlug || row.course }])).values(),
  ).filter((option) => Boolean(option.value));
  const statusOptions = Array.from(new Set(students.map((row) => row.status).filter(Boolean))).map((value) => ({ label: value, value }));
  const ownerOptions = Array.from(
    new Map(students.filter((row) => row.ownerId).map((row) => [row.ownerId || row.owner, { label: row.owner, value: row.ownerId || row.owner }])).values(),
  );
  const selectedStudent = students.find((row) => row.id === selectedIds[0]) ?? students[0];

  if (view === "courses") {
    return (
      <div data-lms-tabs={lmsFocusedTabs}>
        <CourseLmsManager lmsSnapshot={lmsSnapshot} selectedCourseSlug={selectedCourseSlug} setSelectedCourseSlug={setSelectedCourseSlug} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Student success" title="Học viên & Khóa học" />
      <StudentActionButtons contactId={selectedStudent?.contactId} />
      <LmsStudentsOverview lmsSnapshot={lmsSnapshot} />
      <MetricGrid
        metrics={[
          { label: "Học viên đang học", value: `${studentsResult.total}`, tone: "blue", series: [220, 310, 390, 430, studentsResult.total] },
          { label: "Học viên mới kích hoạt", value: `${students.length}`, tone: "green", series: [8, 12, 18, 24, students.length] },
          { label: "Học viên không hoạt động", value: `${students.length - pendingOrActive}`, tone: "orange", series: [80, 76, 70, 68, students.length - pendingOrActive] },
          {
            label: "Tỷ lệ hoàn thành khóa",
            value: `${students.length > 0 ? Math.round((completed / Math.max(students.length, 1)) * 100) : 0}%`,
            tone: "purple",
            series: [22, 28, 35, 39, students.length > 0 ? Math.round((completed / students.length) * 100) : 0],
          },
          { label: "Upsell opportunity", value: `${upsell}`, tone: "green", series: [30, 48, 62, 80, upsell] },
          { label: "NPS/đánh giá", value: "8.7", tone: "blue", series: [7, 7.4, 8.1, 8.4, 8.7] },
        ]}
      />
      <CrmPaginationBar
        basePath="/admin/crm-v2/students"
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
              { label: "Tiến độ", value: undefined, param: "progress" },
              { label: "Owner CSKH", value: query.filters?.owner, param: "owner", options: ownerOptions },
              { label: "Nguy cơ rời bỏ" },
              { label: "Gói sản phẩm" },
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
          <InsightRow label="Module hoàn thành" value={`${completed}/${students.length}`} tone="green" />
          <InsightRow label="Chứng chỉ" value="Chưa có" tone="orange" />
          <InsightRow label="Ticket hỗ trợ" value="2 mở" tone="blue" />
          <InsightRow label="Đề xuất chăm sóc" value="Gợi ý check-in" tone="purple" />
        </RightInsightPanel>
      </div>
    </div>
  );
}
