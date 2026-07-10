import { ChartCard, EmptyState, PageHeader, Timeline } from "@/components/crm-v2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCrmDateRange, listCrmV2ActivityHistory, normalizeCrmListQuery } from "@/lib/crm-v2/data";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2ActivityPage({ searchParams }: PageProps) {
  const query = normalizeCrmListQuery(await searchParams);
  const range = getCrmDateRange(query);
  const client = createSupabaseAdminClient();
  const events = client ? await listCrmV2ActivityHistory(client, range, { limit: 100 }) : [];

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="CRM v2" title="Hoạt động CRM" />
      <ChartCard title="Lịch sử hoạt động">
        {events.length ? (
          <Timeline events={events} />
        ) : (
          <EmptyState
            title="Chưa có hoạt động trong khoảng thời gian này"
            description="Feed này lấy từ Resend/email log, order, lead và khu vực học khi các flow thật ghi nhận hoạt động."
          />
        )}
      </ChartCard>
      <p className="text-xs font-semibold text-slate-500">
        Đang hiển thị tối đa 100 hoạt động mới nhất theo khoảng ngày CRM đã chọn.
      </p>
    </div>
  );
}
