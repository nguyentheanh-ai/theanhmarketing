"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BrandSettings } from "@/services/brandService";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function BrandSettingsManager({ settings }: { settings: BrandSettings }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const value: BrandSettings = {
      name: String(formData.get("name") ?? ""),
      shortName: String(formData.get("shortName") ?? ""),
      logoMark: String(formData.get("logoMark") ?? ""),
      logoImage: String(formData.get("logoImage") ?? ""),
      tagline: String(formData.get("tagline") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      primaryCtaLabel: String(formData.get("primaryCtaLabel") ?? ""),
      primaryCtaHref: String(formData.get("primaryCtaHref") ?? ""),
      heroImageUrl: String(formData.get("heroImageUrl") ?? ""),
      heroVideoUrl: String(formData.get("heroVideoUrl") ?? ""),
    };
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Brand settings chưa được lưu.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("site_settings").upsert({
      key: "brand",
      value,
      updated_at: new Date().toISOString(),
    });

    setIsSaving(false);

    if (error) {
      setMessage(
        `Chưa lưu được brand settings: ${error.message}. Nếu bảng site_settings chưa có, chạy SQL trong docs/DATABASE_SETUP.md.`,
      );
      return;
    }

    setMessage("Đã lưu thương hiệu vào Supabase.");
    router.refresh();
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.name}
          name="name"
          placeholder="Tên thương hiệu"
          required
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.shortName}
          name="shortName"
          placeholder="Tên ngắn"
          required
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.logoMark}
          name="logoMark"
          placeholder="Logo mark dạng chữ"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.logoImage}
          name="logoImage"
          placeholder="Logo image URL"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.phone}
          name="phone"
          placeholder="Hotline/Zalo"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.email}
          name="email"
          placeholder="Email"
          type="email"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.primaryCtaLabel}
          name="primaryCtaLabel"
          placeholder="Header CTA label"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.primaryCtaHref}
          name="primaryCtaHref"
          placeholder="Header CTA href"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.heroImageUrl}
          name="heroImageUrl"
          placeholder="Homepage hero image URL"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.heroVideoUrl}
          name="heroVideoUrl"
          placeholder="Homepage hero video URL"
        />
      </div>
      <textarea
        className="min-h-24 rounded-2xl border border-black/10 p-4"
        defaultValue={settings.tagline}
        name="tagline"
        placeholder="Tagline thương hiệu"
      />
      <button
        className="w-fit rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Đang lưu..." : "Lưu thương hiệu"}
      </button>
      {message ? (
        <p className="rounded-2xl bg-[#f2eadf] px-4 py-3 text-sm font-semibold text-black/65">
          {message}
        </p>
      ) : null}
    </form>
  );
}
