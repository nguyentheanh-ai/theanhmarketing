"use client";

import Link from "next/link";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-5 text-[#17243a]"><section className="w-full max-w-lg rounded-2xl border border-[#e3e8ef] bg-white p-8"><h1 className="text-2xl font-bold">Chưa tải được khóa học</h1><p className="mt-4 text-sm leading-7 text-[#657187]">Kết nối đang gián đoạn. Anh/chị có thể thử lại; thông tin quyền học vẫn được giữ trong tài khoản.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={reset} className="min-h-12 rounded-xl bg-[#2558da] px-5 text-sm font-semibold text-white">Thử lại</button><Link href="/" className="inline-flex min-h-12 items-center rounded-xl border border-[#d9e1ee] px-5 text-sm font-semibold">Về trang chủ</Link></div></section></main>;
}
