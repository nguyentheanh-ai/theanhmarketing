import type { SoloCommandCenterModel } from "@/lib/admin/solo-command-center";
import { safeCourseDisplayTitle } from "@/lib/admin/course-display";

type AggregateReportModel = Pick<SoloCommandCenterModel, "range" | "kpis" | "topCourses">;
type AggregateDataStatus = SoloCommandCenterModel["dataStatus"];

const aggregateSourceLabels: Array<[keyof AggregateDataStatus, string]> = [
  ["orders", "Đơn hàng"],
  ["leads", "Leads"],
  ["courses", "Khóa học"],
  ["students", "Học viên"],
];

export function getUnavailableAggregateSources(status: AggregateDataStatus) {
  return aggregateSourceLabels
    .filter(([source]) => status[source] === "error")
    .map(([, label]) => label);
}

export function escapeAggregateCsvCell(value: string | number) {
  let cell = String(value);
  if (/^[=+\-@\t\r\n]/.test(cell)) cell = `'${cell}`;
  if (/[",\r\n]/.test(cell)) return `"${cell.replaceAll('"', '""')}"`;
  return cell;
}

export function createAggregateReportCsv(model: AggregateReportModel) {
  const { from, to } = model.range;
  const rows: Array<Array<string | number>> = [
    ["Loại", "Nhãn", "Giá trị", "Từ ngày", "Đến ngày"],
    ["KPI", "Doanh thu đã thanh toán", model.kpis.revenue.value, from, to],
    ["KPI", "Đơn đã thanh toán", model.kpis.paidOrders.value, from, to],
    ["KPI", "Học viên mới", model.kpis.newStudents.value, from, to],
    ["KPI", "Lead mới", model.kpis.newLeads.value, from, to],
    ...model.topCourses.flatMap((course) => {
      const title = safeCourseDisplayTitle(course);
      return [
        ["Khóa học", `${title} - Doanh thu`, course.revenue, from, to],
        ["Khóa học", `${title} - Đơn đã thanh toán`, course.paidOrders, from, to],
      ];
    }),
  ];

  return `\uFEFF${rows.map((row) => row.map(escapeAggregateCsvCell).join(",")).join("\r\n")}`;
}
