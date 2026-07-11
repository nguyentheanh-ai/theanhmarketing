import Link from "next/link";
import type { SoloCommandCenterModel } from "@/lib/admin/solo-command-center";
import { buildPriorityTaskHref, getSelectedPriorityTaskDetail } from "@/lib/admin/priority-task-detail";
import { getPriorityQueueAvailability } from "@/lib/admin/priority-queue-view";

const severityStyles = {
  critical: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
} as const;

const severityLabels = {
  critical: "Khẩn cấp",
  warning: "Cần theo dõi",
  info: "Thông tin",
} as const;

function formatTaskTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTaskAge(createdAt: string, generatedAt: string) {
  const ageMs = Math.max(0, new Date(generatedAt).getTime() - new Date(createdAt).getTime());
  const hours = Math.floor(ageMs / 3_600_000);
  if (hours < 1) return "Mới phát sinh";
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function safeTaskDomId(taskId: string) {
  return taskId.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function PriorityQueue({
  model,
  selectedTaskId,
  basePath = "/admin/dashboard",
  emptyLabel = "Không có việc khẩn cấp",
  extraQuery = {},
}: {
  model: SoloCommandCenterModel;
  selectedTaskId?: string;
  basePath?: string;
  emptyLabel?: string;
  extraQuery?: Record<string, string>;
}) {
  const availability = getPriorityQueueAvailability(model.dataStatus, model.priorityTasks.length);
  const selectedDetail = getSelectedPriorityTaskDetail(
    model.priorityTasks,
    selectedTaskId,
    model.range,
    basePath,
    extraQuery,
  );

  return (
    <section
      aria-labelledby="priority-queue-title"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6"
      id="viec-can-xu-ly"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Ưu tiên vận hành</p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950" id="priority-queue-title">
            Việc cần xử lý
          </h2>
        </div>
        <span className="text-sm font-bold text-slate-500">{model.priorityTasks.length} việc</span>
      </div>

      {selectedDetail ? (
        <aside className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5" aria-labelledby="selected-task-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${severityStyles[selectedDetail.task.severity]}`}>
                Trạng thái: {severityLabels[selectedDetail.task.severity]}
              </span>
              <h3 className="mt-3 text-lg font-black text-slate-950" id="selected-task-title">{selectedDetail.task.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{selectedDetail.task.detail}</p>
            </div>
            <Link className="text-sm font-black text-blue-800 underline" href={selectedDetail.closeHref}>Đóng chi tiết</Link>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="font-black text-slate-500">Mã việc</dt><dd className="mt-1 break-all font-mono text-xs text-slate-800">{selectedDetail.task.id}</dd></div>
            <div><dt className="font-black text-slate-500">Thời điểm</dt><dd className="mt-1 font-bold text-slate-800">{formatTaskTime(selectedDetail.task.createdAt)}</dd></div>
          </dl>
          <div className="mt-4 rounded-xl bg-white p-4">
            <p className="text-sm font-black text-slate-950">Hướng xử lý</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{selectedDetail.guidance}</p>
          </div>
        </aside>
      ) : null}

      {availability === "error" ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800" role="status">
          Không tải đủ dữ liệu đơn hàng, học viên hoặc hoạt động để xác định hàng đợi.
        </div>
      ) : null}

      {availability === "empty" ? (
        <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
          {emptyLabel}
        </div>
      ) : null}

      {model.priorityTasks.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {model.priorityTasks.map((task) => {
            const href = buildPriorityTaskHref(task.id, model.range, basePath, extraQuery);
            const selected = task.id === selectedTaskId;
            return (
              <article
                aria-current={selected ? "true" : undefined}
                className={`rounded-2xl border p-4 ${selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200"}`}
                data-selected={selected ? "true" : "false"}
                id={`task-${safeTaskDomId(task.id)}`}
                key={task.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${severityStyles[task.severity]}`}>
                      {severityLabels[task.severity]}
                    </span>
                    <h3 className="mt-3 font-black text-slate-950">{task.title}</h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{task.detail}</p>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      {formatTaskAge(task.createdAt, model.generatedAt)} · {formatTaskTime(task.createdAt)}
                    </p>
                  </div>
                  <Link
                    className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                    href={href}
                  >
                    Xem hướng xử lý
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
