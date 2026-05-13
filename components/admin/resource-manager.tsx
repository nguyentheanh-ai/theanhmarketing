"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Tài liệu chưa được lưu.");
      setIsSaving(false);
      return;
    }

    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      thumbnail: String(formData.get("thumbnail") ?? ""),
      file_url: String(formData.get("fileUrl") ?? ""),
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
          + Tạo tài liệu mới
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

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            defaultValue={selectedResource.title}
            key={`title-${selectedSlug}`}
            name="title"
            placeholder="Tên tài liệu"
            required
          />
          <select
            className="min-h-12 rounded-2xl border border-black/10 bg-white px-4"
            defaultValue={selectedResource.access}
            key={`access-${selectedSlug}`}
            name="access"
          >
            <option>Miễn phí</option>
            <option>Trả phí</option>
            <option>Chỉ học viên</option>
          </select>
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            defaultValue={selectedResource.fileUrl}
            key={`file-${selectedSlug}`}
            name="fileUrl"
            placeholder="Link file"
            required
          />
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            defaultValue={selectedResource.thumbnail}
            key={`thumb-${selectedSlug}`}
            name="thumbnail"
            placeholder="Thumbnail URL"
          />
        </div>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-black/10 p-4"
          defaultValue={selectedResource.description}
          key={`description-${selectedSlug}`}
          name="description"
          placeholder="Mô tả tài liệu"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="w-fit rounded-full bg-black px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Đang lưu..." : "Lưu tài liệu"}
          </button>
          {selectedResource.id ? (
            <button
              className="w-fit rounded-full border border-red-200 bg-red-50 px-6 py-3 text-sm font-bold text-red-700"
              type="button"
              onClick={handleDelete}
            >
              Xóa tài liệu
            </button>
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
