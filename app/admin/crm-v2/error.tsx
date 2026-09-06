"use client";
export default function AdminDataError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="mx-auto my-12 max-w-xl rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
    <h1 className="text-xl font-bold text-slate-950">Chưa tải đủ dữ liệu</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">Kết nối dữ liệu chưa hoàn tất. Thử tải lại trước khi tiếp tục thao tác hoặc đối soát báo cáo.</p>
    <button onClick={reset} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Thử lại</button>
  </section>;
}
