"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ResourceItem } from "@/services/resourceService";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function toAccessType(value: string) {
  if (value === "Chỉ học viên") {
    return "enrolled_only";
  }

  if (value === "Trả phí") {
    return "paid";
  }

  return "free";
}

const emptyResource: ResourceItem = {
  slug: "",
  title: "",
  type: "Tài liệu",
  access: "Miễn phí",
  description: "",
  thumbnail: "",
  fileUrl: "",
};

function isValidDownloadUrl(value: string) {
  const link = value.trim();

  return (
    link.startsWith("https://") ||
    link.startsWith("http://") ||
    link.startsWith("/") ||
    link.startsWith("mailto:")
  );
}

export function ResourceManager({ resources }: { resources: ResourceItem[] }) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState(resources[0]?.slug ?? "new");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedResource = useMemo(() => {
    return resources.find((resource) => resource.slug === selectedSlug) ?? emptyResource;
  }, [resources, selectedSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    const title = String(formData.get("title") ?? "").trim();
    const fileUrl = String(formData.get("fileUrl") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const thumbnail = String(formData.get("thumbnail") ?? "").trim();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Tài liệu chưa được lưu.");
      setIsSaving(false);
      return;
    }

    if (!title) {
      setMessage("Vui lòng nhập tên tài liệu.");
      setIsSaving(false);
      return;
    }

    if (!isValidDownloadUrl(fileUrl)) {
      setMessage("Link tải cần bắt đầu bằng https://, http://, / hoặc mailto:.");
      setIsSaving(false);
      return;
    }

    const payload = {
      title,
      description,
      thumbnail,
      file_url: fileUrl,
      access_type: toAccessType(String(formData.get("access") ?? "")),
    };

    const query = selectedResource.id
      ? supabase.from("resources").update(payload).eq("id", selectedResource.id)
      : supabase.from("resources").insert(payload);

    const { error } = await query;
    setIsSaving(false);

    if (error) {
      setMessage(`Chưa lưu được tài liệu: ${error.message}`);
      return;
    }

    setMessage("Đã lưu tài liệu vào Supabase.");
    router.refresh();
  }

  async function handleDelete() {
    if (!selectedResource.id) {
      setMessage("Tài liệu fallback từ file tĩnh chưa có id Supabase để xóa.");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase.");
      return;
    }

    const { error } = await supabase
      .from("resources")
      .delete()
      .eq("id", selectedResource.id);

    if (error) {
      setMessage(`Chưa xóa được tài liệu: ${error.message}`);
      return;
    }

    setSelectedSlug("new");
    setMessage("Đã xóa tài liệu.");
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="grid content-start gap-3">
        <button
          className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
            selectedSlug === "new"
              ? "bg-black text-white"
              : "border border-black/10 bg-white text-black/65"
          }`}
          type="button"
          onClick={() => setSelectedSlug("new")}
        >
          + Đăng tài liệu miễn phí mới
        </button>
        {resources.map((resource) => (
          <button
            className={`rounded-2xl px-4 py-3 text-left transition ${
              selectedSlug === resource.slug
                ? "bg-black text-white"
                : "border border-black/10 bg-white text-black/65 hover:text-black"
            }`}
            key={resource.slug}
            type="button"
            onClick={() => setSelectedSlug(resource.slug)}
          >
            <span className="block text-sm font-bold">{resource.title}</span>
            <span className="mt-1 block text-xs opacity-70">
              {resource.type} · {resource.access}
            </span>
          </button>
        ))}
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-black/10 bg-[#fbfaf7] p-4">
          <p className="text-sm font-black text-black">Thông tin tài liệu</p>
          <p className="mt-2 text-sm leading-6 text-black/55">
            Với tài liệu miễn phí, admin chỉ cần nhập rõ tên tài liệu, link tải và bài viết giới thiệu.
            Nội dung này sẽ hiển thị ở trang tài liệu public và dashboard học viên.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-black/62">Tên tài liệu</span>
            <input
              className="min-h-12 rounded-2xl border border-black/10 px-4"
              defaultValue={selectedResource.title}
              key={`title-${selectedSlug}`}
              name="title"
              placeholder="Ví dụ: Checklist xây AI workflow cho Solopreneur"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black/62">Quyền truy cập</span>
            <select
              className="min-h-12 rounded-2xl border border-black/10 bg-white px-4"
              defaultValue={selectedResource.access || "Miễn phí"}
              key={`access-${selectedSlug}`}
              name="access"
            >
              <option>Miễn phí</option>
              <option>Trả phí</option>
              <option>Chỉ học viên</option>
            </select>
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black/62">Link tải</span>
            <input
              className="min-h-12 rounded-2xl border border-black/10 px-4"
              defaultValue={selectedResource.fileUrl}
              key={`file-${selectedSlug}`}
              name="fileUrl"
              placeholder="https://... hoặc /tai-lieu/..."
              required
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black/62">Thumbnail URL</span>
            <input
              className="min-h-12 rounded-2xl border border-black/10 px-4"
              defaultValue={selectedResource.thumbnail}
              key={`thumb-${selectedSlug}`}
              name="thumbnail"
              placeholder="https://... ảnh minh họa tài liệu"
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-black/62">Bài viết về tài liệu</span>
          <textarea
            className="min-h-44 w-full rounded-2xl border border-black/10 p-4"
            defaultValue={selectedResource.description}
            key={`description-${selectedSlug}`}
            name="description"
            placeholder="Viết nội dung giới thiệu: tài liệu này giúp ai, dùng trong tình huống nào, sau khi tải về nên làm bước gì..."
          />
        </label>

        {selectedResource.fileUrl ? (
          <a
            className="w-fit rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-black/65 transition hover:border-black/20 hover:text-black"
            href={selectedResource.fileUrl}
            rel="noreferrer"
            target={selectedResource.fileUrl.startsWith("http") ? "_blank" : undefined}
          >
            Mở link tải hiện tại
          </a>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
            Lưu tài liệu
          </Button>
          {selectedResource.id ? (
            <Button className="w-fit" variant="danger" type="button" onClick={handleDelete}>
              Xóa tài liệu
            </Button>
          ) : null}
        </div>
        {message ? (
          <p className="rounded-2xl bg-[#f2eadf] px-4 py-3 text-sm font-semibold text-black/65">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
