import type { Metadata } from "next";
import Link from "next/link";
import { EmailOpenClient } from "@/components/site/email-open-client";
import { getAllowedEmailLinkTarget } from "@/lib/notifications/email-link-bridge";

export const metadata: Metadata = {
  title: "Mở liên kết",
  robots: {
    index: false,
    follow: false,
  },
};

type EmailOpenPageProps = {
  searchParams?: Promise<{ to?: string }> | { to?: string };
};

export default async function EmailOpenPage({ searchParams }: EmailOpenPageProps) {
  const params = await searchParams;
  const targetUrl = getAllowedEmailLinkTarget(params?.to ?? "");

  if (!targetUrl) {
    return (
      <main className="min-h-screen bg-[#080808] px-5 py-16 text-white">
        <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.06] p-7">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-200">The Anh Marketing</p>
          <h1 className="mt-4 text-3xl font-black">Liên kết không hợp lệ</h1>
          <p className="mt-4 text-sm leading-7 text-white/70">
            Link trong email không nằm trong danh sách được phép mở. Anh/chị vui lòng quay lại email hoặc liên hệ
            The Anh Marketing để được hỗ trợ.
          </p>
          <Link className="mt-6 inline-flex rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-slate-950" href="/">
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-16 text-white">
      <EmailOpenClient targetUrl={targetUrl} />
      <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.06] p-7">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-200">The Anh Marketing</p>
        <h1 className="mt-4 text-3xl font-black">Đang mở liên kết</h1>
        <p className="mt-4 text-sm leading-7 text-white/70">
          Hệ thống đang mở liên kết an toàn từ email. Nếu trình duyệt không tự chuyển, anh/chị bấm nút bên dưới.
        </p>
        <a
          className="mt-6 inline-flex rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-slate-950"
          href={targetUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Mở liên kết
        </a>
        <p className="mt-5 break-all rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/65">
          {targetUrl}
        </p>
      </section>
    </main>
  );
}
