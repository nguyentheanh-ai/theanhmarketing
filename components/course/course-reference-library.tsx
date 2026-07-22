import type { CourseReferencePack } from "@/data/course-reference-packs";

type CourseReferenceLibraryProps = {
  packs: CourseReferencePack[];
};

function ResourceAction({ pack }: { pack: CourseReferencePack }) {
  return (
    <a
      className="inline-flex w-full items-center justify-center rounded-lg bg-white px-3 py-2.5 text-center text-xs font-black text-black transition hover:bg-[#dff4ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#77d7ff] sm:w-auto"
      download={!pack.external}
      href={pack.downloadUrl}
      rel={pack.external ? "noreferrer" : undefined}
      target={pack.external ? "_blank" : undefined}
    >
      {pack.actionLabel}
    </a>
  );
}

function ResourceTable({ packs, title, description }: { packs: CourseReferencePack[]; title: string; description: string }) {
  if (packs.length === 0) return null;

  return (
    <section aria-label={title} className="mt-7">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-white/62">{description}</p>
        </div>
        <span className="text-xs font-bold text-[#77d7ff]">{packs.length} tài liệu</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/15">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead className="bg-white/[0.07] text-[11px] font-black uppercase tracking-[0.1em] text-white/64">
              <tr>
                <th className="px-4 py-3">Tài liệu</th>
                <th className="px-4 py-3">Dùng để làm gì</th>
                <th className="px-4 py-3">Định dạng</th>
                <th className="px-4 py-3 text-right">Tải về</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {packs.map((pack) => (
                <tr className="align-top" key={pack.id}>
                  <td className="px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#77d7ff]">{pack.eyebrow}</p>
                    <p className="mt-1 font-semibold leading-snug text-white">{pack.title}</p>
                  </td>
                  <td className="max-w-xl px-4 py-4 text-sm leading-6 text-white/68">{pack.description}</td>
                  <td className="px-4 py-4">
                    <div className="flex max-w-48 flex-wrap gap-1.5">
                      {pack.formats.map((format) => (
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-white/68" key={format}>
                          {format}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <ResourceAction pack={pack} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function CourseReferenceLibrary({ packs }: CourseReferenceLibraryProps) {
  if (packs.length === 0) return null;

  return (
    <section
      aria-labelledby="course-reference-library-title"
      className="mt-4 rounded-2xl border border-[#77d7ff]/15 bg-white/[0.06] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] ring-1 ring-white/5 sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#77d7ff]">Tài liệu mẫu tham khảo</p>
          <h2 id="course-reference-library-title" className="mt-2 text-xl font-semibold text-white md:text-2xl">
            Prompt, bảng kế hoạch, nghiên cứu và visual mẫu
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-white/62">
          Chọn đúng tài liệu cần dùng: Prompt tải về để dán vào ChatGPT, Sheet mở trực tiếp, còn bảng mẫu và visual có thể tải về để tham khảo.
        </p>
      </div>

      <ResourceTable
        description="Tải prompt để dùng với ChatGPT, mở trực tiếp Google Sheet, hoặc tải kế hoạch, nghiên cứu và visual mẫu để tham khảo cách triển khai."
        packs={packs}
        title="Tất cả tài liệu mẫu"
      />

      <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-200/10 px-4 py-3 text-xs leading-5 text-amber-50/82">
        <strong>Cách dùng:</strong> tải từng Prompt về, mở bằng Notepad rồi sao chép toàn bộ vào một cuộc trò chuyện mới. Với Google Sheet, anh chị có thể xem trực tiếp hoặc tạo bản sao vào Drive cá nhân. Các mẫu nghiên cứu chỉ phản ánh phạm vi và thời điểm ghi trong tài liệu, không phải báo cáo hiệu quả ads hiện tại.
      </p>
    </section>
  );
}
