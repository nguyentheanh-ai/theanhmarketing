"use client";

export default function LessonError({ reset }: { reset: () => void }) {
  return <main className="min-h-screen bg-slate-950 px-5 py-20 text-white">
    <h1 className="text-2xl font-bold">Chưa tải được bài học</h1>
    <p className="mt-3 text-slate-300">Anh/chị kiểm tra kết nối mạng rồi thử lại nhé.</p>
    <button onClick={reset} className="mt-6 rounded-xl bg-sky-500 px-6 py-3 font-semibold">Tải lại bài học</button>
  </main>;
}
