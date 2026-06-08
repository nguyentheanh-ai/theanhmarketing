import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Truy cập khu vực học viên",
  description: "Cổng truy cập chính thức dành cho học viên của Thế Anh Marketing.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudentAccessPage() {
  return (
    <main className="ai-os-bg ai-grid min-h-screen text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-16 sm:px-8">
        <div className="rounded-2xl border border-white/12 bg-[#151515] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.38)] sm:p-9">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#d8b653]">
            Thế Anh Marketing
          </p>
          <h1 className="mt-5 text-3xl font-black leading-tight text-white sm:text-5xl">
            Truy cập khu vực học viên
          </h1>
          <p className="mt-5 text-base leading-8 text-white/72 sm:text-lg">
            Đây là cổng truy cập chính thức dành cho học viên của Thế Anh Marketing.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              className="tap-motion inline-flex min-h-12 max-w-full shrink-0 items-center justify-center rounded-xl border border-[#77d7ff]/35 bg-[#159cfb] px-6 text-center text-sm font-bold leading-tight text-white shadow-[0_0_28px_rgba(56,189,248,0.34)] hover:bg-[#37b6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8]"
              href="/dang-nhap?next=%2Fdashboard"
            >
              Tiếp tục đăng nhập
            </a>
          </div>

          <div className="mt-8 grid gap-3 border-t border-white/10 pt-6 text-sm leading-7 text-white/62">
            <p>
              Domain chính thức:{" "}
              <span className="font-bold text-white">theanhmarketing.com</span>
            </p>
            <p>
              Nếu anh/chị gặp lỗi khi truy cập, vui lòng liên hệ đội ngũ hỗ trợ.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
