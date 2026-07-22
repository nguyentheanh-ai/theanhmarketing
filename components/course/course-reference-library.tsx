import type { CourseReferencePack } from "@/data/course-reference-packs";

type CourseReferenceLibraryProps = {
  packs: CourseReferencePack[];
};

export function CourseReferenceLibrary({ packs }: CourseReferenceLibraryProps) {
  if (packs.length === 0) return null;

  return (
    <section
      aria-labelledby="course-reference-library-title"
      className="mt-4 rounded-2xl border border-[#77d7ff]/15 bg-white/[0.06] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] ring-1 ring-white/5 sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#77d7ff]">
            Tài liệu mẫu tham khảo
          </p>
          <h2 id="course-reference-library-title" className="mt-2 text-xl font-semibold text-white md:text-2xl">
            6 Master Prompt và 1 kịch bản mẫu
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-white/62">
          Chọn đúng việc cần làm, tải file TXT rồi dán vào ChatGPT. Bản kịch bản mở trực tiếp bằng Google Sheet.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {packs.map((pack) => (
          <article
            className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-white/[0.07] p-4"
            key={pack.id}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#77d7ff]">{pack.eyebrow}</p>
            <h3 className="mt-2 text-base font-semibold leading-snug text-white">{pack.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-white/68">{pack.description}</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {pack.formats.map((format) => (
                <span
                  className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold text-white/68"
                  key={format}
                >
                  {format}
                </span>
              ))}
            </div>

            <a
              className="mt-4 block rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-black transition hover:bg-[#dff4ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#77d7ff]"
              download={!pack.external}
              href={pack.downloadUrl}
              rel={pack.external ? "noreferrer" : undefined}
              target={pack.external ? "_blank" : undefined}
            >
              {pack.actionLabel}
            </a>
          </article>
        ))}
      </div>

      <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-200/10 px-4 py-3 text-xs leading-5 text-amber-50/82">
        <strong>Cách dùng:</strong> tải từng prompt về, mở bằng Notepad rồi sao chép toàn bộ vào một cuộc trò chuyện mới.
        Với Google Sheet, anh chị có thể xem trực tiếp hoặc tạo bản sao vào Drive cá nhân.
      </p>
    </section>
  );
}
