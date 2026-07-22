import Image from "next/image";
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
            Tải về để xem và làm theo
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-white/62">
          Bộ đã lọc theo đúng ba việc: nghiên cứu, lập kế hoạch và tham khảo hình ảnh AI.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {packs.map((pack) => (
          <article
            className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.07]"
            key={pack.id}
          >
            <div className="relative aspect-video overflow-hidden bg-black/30">
              <Image
                alt={pack.previewAlt}
                className="object-cover object-top transition duration-300 hover:scale-[1.02]"
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 42vw, 100vw"
                src={pack.previewUrl}
              />
            </div>

            <div className="flex flex-1 flex-col p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#77d7ff]">{pack.eyebrow}</p>
              <h3 className="mt-2 text-base font-semibold leading-snug text-white">{pack.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/68">{pack.description}</p>

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
                className="mt-4 block rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-black transition hover:bg-[#dff4ff]"
                download
                href={pack.downloadUrl}
              >
                Tải tài liệu ↓
              </a>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-200/10 px-4 py-3 text-xs leading-5 text-amber-50/82">
        <strong>Ghi chú:</strong> đây là case mẫu. Số liệu, ngân sách và giả định chỉ để minh họa cách làm,
        không phải cam kết hiệu quả. Dữ liệu Meta Ad Library có thể thay đổi theo thời điểm; không sao chép
        creative của đối thủ. Hình AI chỉ dùng để tham khảo.
      </p>
    </section>
  );
}

