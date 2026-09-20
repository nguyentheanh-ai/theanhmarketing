export default function DashboardLoading() {
  return <main className="min-h-screen bg-[#f5f7fb] px-5 py-16 text-[#17243a]" aria-busy="true" aria-label="Đang tải khu vực học viên"><div className="mx-auto max-w-5xl"><p role="status" className="text-sm font-medium">Đang mở khóa học của anh/chị…</p><div className="mt-8 h-24 rounded-2xl bg-[#eaf0fd]" /><div className="mt-8 grid gap-5 md:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-72 rounded-2xl border border-[#e3e8ef] bg-white" />)}</div></div></main>;
}
