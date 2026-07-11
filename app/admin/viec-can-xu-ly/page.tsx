import Link from "next/link";
import { PriorityQueue } from "@/components/admin/solo-command-center/priority-queue";
import { AdminShell } from "@/components/app/admin-shell";
import { filterPriorityQueue, type PrioritySeverityFilter } from "@/lib/admin/priority-queue-view";
import { requireAdminAuth } from "@/lib/auth/session";
import {
  getSoloCommandCenterModel,
  resolveCommandCenterRange,
} from "@/services/adminCommandCenterService";

type QueueSearchParams = {
  from?: string | string[];
  to?: string | string[];
  task?: string | string[];
  severity?: string | string[];
};

const filters: Array<{ value: PrioritySeverityFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "critical", label: "Khẩn cấp" },
  { value: "warning", label: "Cần theo dõi" },
  { value: "info", label: "Thông tin" },
];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPriorityQueuePage({
  searchParams,
}: {
  searchParams?: Promise<QueueSearchParams>;
}) {
  const auth = await requireAdminAuth("/admin/viec-can-xu-ly", ["owner"]);
  const query = (await searchParams) ?? {};
  const range = resolveCommandCenterRange({
    from: firstValue(query.from),
    to: firstValue(query.to),
  });
  const model = await getSoloCommandCenterModel(range);
  const queue = filterPriorityQueue(
    model.priorityTasks,
    firstValue(query.severity),
    firstValue(query.task),
  );
  const filteredModel = { ...model, priorityTasks: queue.tasks };
  const queueExtraQuery: Record<string, string> = queue.severity === "all"
    ? {}
    : { severity: queue.severity };

  return (
    <AdminShell adminRole={auth?.adminRole ?? "owner"}>
      <main className="mx-auto max-w-[1480px] text-slate-950">
        <header className="rounded-3xl bg-[#f2eadf] p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a5a12]">Ưu tiên vận hành</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Toàn bộ việc cần xử lý</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Hàng đợi chỉ tổng hợp tín hiệu vận hành an toàn. Mở từng việc để xem hướng xử lý trong các màn hình hỗ trợ sẵn có.
          </p>

          <form action="/admin/viec-can-xu-ly" className="mt-5 flex flex-wrap items-end gap-2" method="get">
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
              Từ ngày
              <input className="min-h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold" defaultValue={range.from} name="from" required type="date" />
            </label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
              Đến ngày
              <input className="min-h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold" defaultValue={range.to} name="to" required type="date" />
            </label>
            {queue.severity !== "all" ? <input name="severity" type="hidden" value={queue.severity} /> : null}
            {queue.selectedTaskId ? <input name="task" type="hidden" value={queue.selectedTaskId} /> : null}
            <button className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-black text-white" type="submit">Áp dụng</button>
          </form>
        </header>

        <nav aria-label="Lọc mức độ ưu tiên" className="mt-5 flex flex-wrap gap-2">
          {filters.map((filter) => {
            const target = filterPriorityQueue(model.priorityTasks, filter.value, queue.selectedTaskId);
            const params = new URLSearchParams(range);
            if (filter.value !== "all") params.set("severity", filter.value);
            if (target.selectedTaskId) params.set("task", target.selectedTaskId);
            const active = filter.value === queue.severity;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-black ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}
                href={`/admin/viec-can-xu-ly?${params.toString()}`}
                key={filter.value}
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4">
          <PriorityQueue
            basePath="/admin/viec-can-xu-ly"
            emptyLabel="Không có việc phù hợp bộ lọc"
            extraQuery={queueExtraQuery}
            model={filteredModel}
            selectedTaskId={queue.selectedTaskId}
          />
        </div>
      </main>
    </AdminShell>
  );
}
