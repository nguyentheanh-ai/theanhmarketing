export default function CrmV2Loading() {
  return (
    <div className="space-y-4" data-crm-route-loading>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-7 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-8 w-full animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr] gap-3 rounded-md border border-slate-100 p-3">
                <div className="h-4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm 2xl:block">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-5 space-y-3">
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        Đang tải dữ liệu CRM v2
      </span>
    </div>
  );
}
