"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

export function ResourceForm() {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSaving(true);

        const formData = new FormData(event.currentTarget);
        const supabase = createSupabaseBrowserClient();

        if (!supabase) {
          setMessage("Thiếu biến môi trường Supabase. Dữ liệu chưa được ghi vào database.");
          setIsSaving(false);
          return;
        }

        const { error } = await supabase.from("resources").insert({
          title: String(formData.get("title") ?? ""),
          description: String(formData.get("description") ?? ""),
          thumbnail: String(formData.get("thumbnail") ?? ""),
          file_url: String(formData.get("fileUrl") ?? ""),
          access_type: toAccessType(String(formData.get("access") ?? "")),
        });

        setIsSaving(false);

        if (error) {
          setMessage(`Không lưu được tài liệu lên Supabase: ${error.message}`);
          return;
        }

        setMessage("Đã lưu tài liệu lên Supabase. Tải lại trang để thấy dữ liệu mới.");
        event.currentTarget.reset();
      }}
    >
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          name="title"
          placeholder="Tên tài liệu"
          required
        />
        <select
          className="min-h-12 rounded-2xl border border-black/10 bg-white px-4"
          name="access"
        >
          <option>Miễn phí</option>
          <option>Trả phí</option>
          <option>Chỉ học viên</option>
        </select>
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          name="fileUrl"
          placeholder="Link file"
          required
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          name="thumbnail"
          placeholder="Thumbnail URL"
        />
      </div>
      <textarea
        className="min-h-24 w-full rounded-2xl border border-black/10 p-4"
        name="description"
        placeholder="Mô tả tài liệu"
      />
      <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
        Lưu tài liệu
      </Button>
      {message ? <p className="text-sm font-semibold text-black/55">{message}</p> : null}
    </form>
  );
}
