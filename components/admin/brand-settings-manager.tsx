"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import type { BrandSettings } from "@/services/brandService";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadMediaFile } from "@/lib/supabase/media-upload";

export function BrandSettingsManager({ settings }: { settings: BrandSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<keyof BrandSettings | null>(null);

  function updateField(field: keyof BrandSettings, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function uploadBrandImage(field: "logoImage" | "heroImageUrl", file: File | undefined) {
    if (!file) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Không thể upload ảnh.");
      return;
    }

    setUploadingField(field);
    setMessage("");

    try {
      const url = await uploadMediaFile({
        file,
        folder: field === "logoImage" ? "brand/logo" : "brand/hero",
        supabase,
      });
      updateField(field, url);
      setMessage("Đã upload ảnh và cập nhật URL trong form. Bấm lưu để ghi vào database.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không upload được ảnh.");
    } finally {
      setUploadingField(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const value: BrandSettings = {
      name: String(formData.get("name") ?? ""),
      shortName: String(formData.get("shortName") ?? ""),
      logoMark: String(formData.get("logoMark") ?? ""),
      logoImage: form.logoImage,
      tagline: String(formData.get("tagline") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      primaryCtaLabel: String(formData.get("primaryCtaLabel") ?? ""),
      primaryCtaHref: String(formData.get("primaryCtaHref") ?? ""),
      heroImageUrl: form.heroImageUrl,
      heroVideoUrl: String(formData.get("heroVideoUrl") ?? ""),
    };

    const response = await fetch("/api/admin/site-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "brand", value }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };

    setIsSaving(false);

    if (!response.ok) {
      setMessage(`Chưa lưu được thương hiệu: ${payload.message ?? "Lỗi không xác định."}`);
      return;
    }

    setMessage("Đã lưu thương hiệu vào Supabase.");
    router.refresh();
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={form.name}
          name="name"
          placeholder="Tên thương hiệu"
          required
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={form.shortName}
          name="shortName"
          placeholder="Tên ngắn"
          required
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={form.logoMark}
          name="logoMark"
          placeholder="Logo mark dạng chữ"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={form.phone}
          name="phone"
          placeholder="Hotline/Zalo"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={form.email}
          name="email"
          placeholder="Email"
          type="email"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={form.primaryCtaLabel}
          name="primaryCtaLabel"
          placeholder="Header CTA label"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={form.primaryCtaHref}
          name="primaryCtaHref"
          placeholder="Header CTA href"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={form.heroVideoUrl}
          name="heroVideoUrl"
          placeholder="Homepage hero video URL"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ImageUploadField
          description="Logo này hiển thị ở header và footer. Bấm chọn ảnh để upload, URL sẽ tự điền."
          isUploading={uploadingField === "logoImage"}
          label="Logo website"
          uploadLabel="Upload logo"
          value={form.logoImage}
          onFileSelect={(file) => uploadBrandImage("logoImage", file)}
          onUrlChange={(url) => updateField("logoImage", url)}
        />
        <ImageUploadField
          description="Ảnh hero trang chủ. Sau khi upload, bấm lưu thương hiệu để cập nhật public site."
          isUploading={uploadingField === "heroImageUrl"}
          label="Ảnh hero trang chủ"
          uploadLabel="Upload ảnh hero"
          value={form.heroImageUrl}
          onFileSelect={(file) => uploadBrandImage("heroImageUrl", file)}
          onUrlChange={(url) => updateField("heroImageUrl", url)}
        />
      </div>
      <textarea
        className="min-h-24 rounded-2xl border border-black/10 p-4 text-slate-900"
        defaultValue={form.tagline}
        name="tagline"
        placeholder="Tagline thương hiệu"
      />
      <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
        Lưu thương hiệu
      </Button>
      {message ? (
        <p className="rounded-2xl bg-[#f2eadf] px-4 py-3 text-sm font-semibold text-slate-800">
          {message}
        </p>
      ) : null}
    </form>
  );
}
