import {
  Activity,
  BarChart3,
  BookOpen,
  ChartCard,
  IconButton,
  InsightRow,
  MetricGrid,
  PageHeader,
  RightInsightPanel,
  SimpleBars,
  Timeline,
} from "@/components/crm-v2";
import { getCrmV2Dashboard, normalizeCrmListQuery } from "@/lib/crm-v2/data";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type InsightTone = "blue" | "green" | "orange" | "purple" | "red" | "slate";

function toInsightTone(value?: string): InsightTone {
  if (value === "blue" || value === "green" || value === "orange" || value === "purple" || value === "red") return value;
  return "slate";
}

export default async function CrmV2DashboardPage({ searchParams }: PageProps) {
  const query = normalizeCrmListQuery(await searchParams);
  const data = await getCrmV2Dashboard(query);
  const emailRows = data.emailPerformance.flatMap((row) => [
    { label: `${row.label} mở`, value: row.open, tone: "blue" },
    { label: `${row.label} click`, value: row.click, tone: "green" },
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Tổng quan CRM · Executive overview"
        title="Trung tâm điều hành"
        actions={
          <>
            <IconButton href="/admin/crm-v2/reports" label="Mở báo cáo">
              <BarChart3 className="h-4 w-4" />
            </IconButton>
            <IconButton href="/admin/crm-v2/activity" label="Hoạt động mới">
              <Activity className="h-4 w-4" />
            </IconButton>
          </>
        }
      />
      <MetricGrid metrics={data.kpis} />
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Phễu chuyển đổi">
          <SimpleBars rows={data.funnel} />
        </ChartCard>
        <ChartCard title="Doanh thu theo ngày">
          <SimpleBars rows={data.revenue.map((row) => ({ label: row.label, value: row.value, displayValue: row.displayValue, tone: "green" }))} />
        </ChartCard>
        <ChartCard title="Nguồn lead">
          <SimpleBars rows={data.sources} />
        </ChartCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Hiệu quả Remarketing Email">
            {emailRows.length ? <SimpleBars rows={emailRows} /> : <p className="text-sm font-semibold text-slate-500">Chưa có dữ liệu email trong khoảng thời gian này.</p>}
          </ChartCard>
          <ChartCard title="Hiệu quả khóa học">
            {data.courses.length ? (
              <SimpleBars rows={data.courses.map((course) => ({ label: course.name, value: course.paid, displayValue: course.revenue, tone: "blue" }))} />
            ) : (
              <p className="text-sm font-semibold text-slate-600">Chưa có đơn hàng khóa học đã thanh toán trong giai đoạn này.</p>
            )}
            <div className="mt-4">
              <IconButton href="/admin/crm-v2/students?view=courses" label="Quản lý khóa học">
                <BookOpen className="h-4 w-4" />
              </IconButton>
            </div>
          </ChartCard>
          <ChartCard title="Hoạt động gần đây">
            {data.activity.length ? <Timeline events={data.activity} /> : <p className="text-sm font-semibold text-slate-500">Chưa có hoạt động mới.</p>}
            <div className="mt-4">
              <IconButton href="/admin/crm-v2/activity" label="Xem toàn bộ lịch sử hoạt động">
                <Activity className="h-4 w-4" />
              </IconButton>
            </div>
          </ChartCard>
        </div>
        <RightInsightPanel title="Việc cần xử lý">
          {data.tasks.length ? (
            data.tasks.map((task) => (
              <InsightRow key={`${task.title}:${task.owner}`} label={`${task.title} - ${task.owner}`} value={task.due} tone={toInsightTone(task.tone)} />
            ))
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-900">
              Không có công việc CRM tồn đọng trong giai đoạn đang xem.
            </div>
          )}
          <div className="pt-2">
            <IconButton href="/admin/viec-can-xu-ly" label="Mở danh sách việc cần xử lý">
              <Activity className="h-4 w-4" />
            </IconButton>
          </div>
        </RightInsightPanel>
      </div>
    </div>
  );
}
