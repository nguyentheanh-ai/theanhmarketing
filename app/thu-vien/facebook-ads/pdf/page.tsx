import { redirect } from "next/navigation";
import { FacebookEbookPdfDownload } from "@/components/ebook/facebook-ebook-pdf-download";
import { FACEBOOK_EBOOK_PDF_HREF } from "@/lib/ebook/facebook-ebook";
import { requireFacebookEbookAccess } from "@/lib/ebook/facebook-ebook-access";
import { facebookEbookPolicy } from "@/lib/ebook/facebook-ebook-policy";

export const dynamic = "force-dynamic";

export default async function FacebookAdsEbookPdfPage() {
  const access = await requireFacebookEbookAccess(FACEBOOK_EBOOK_PDF_HREF);

  if (!access.ok) {
    redirect(access.redirectTo);
  }

  return (
    <main className="min-h-screen bg-[#eef4ff] px-4 py-8 text-[#10213d]">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[24px] bg-white shadow-[0_24px_80px_rgba(28,72,155,0.14)] ring-1 ring-[#d7e3ff]">
        <div className="border-b border-[#d7e3ff] bg-[#f8fbff] px-6 py-6 sm:px-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#1f63ff]">
            Tải file PDF
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Xác nhận điều khoản trước khi tải Ebook Facebook Ads 2026
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[#53647f]">
            File PDF chỉ dành cho tài khoản đã mua quyền truy cập. Anh/chị vui lòng đọc phần miễn trừ trách nhiệm, quyền sở hữu nội dung và bảo mật trước khi tải về máy.
          </p>
        </div>

        <div className="grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="max-h-[62vh] overflow-y-auto rounded-2xl border border-[#d7e3ff] bg-white p-5">
            <h2 className="text-xl font-black">{facebookEbookPolicy.title}</h2>
            <p className="mt-1 text-sm font-bold text-[#60718d]">{facebookEbookPolicy.updatedAt}</p>
            <p className="mt-5 text-sm leading-7 text-[#42536e]">{facebookEbookPolicy.intro}</p>

            <div className="mt-6 grid gap-6">
              {facebookEbookPolicy.sections.map((section) => (
                <section key={section.heading}>
                  <h3 className="text-base font-black text-[#10213d]">{section.heading}</h3>
                  <div className="mt-3 grid gap-3">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-7 text-[#42536e]">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-[#d7e3ff] bg-[#f8fbff] p-5">
            <p className="text-lg font-black">Tải bản PDF đầy đủ</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#5a6a84]">
              Link tải được tạo riêng cho tài khoản của anh/chị và có thời hạn ngắn để bảo vệ nội dung ebook.
            </p>

            <FacebookEbookPdfDownload />
          </aside>
        </div>
      </section>
    </main>
  );
}
