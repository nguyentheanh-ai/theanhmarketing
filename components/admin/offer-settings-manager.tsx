"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { OfferSettings } from "@/services/offerService";

export function OfferSettingsManager({ settings }: { settings: OfferSettings }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const value: OfferSettings = {
      enabled: formData.get("enabled") === "on",
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      couponCode: String(formData.get("couponCode") ?? "").trim().toUpperCase(),
      discountLabel: String(formData.get("discountLabel") ?? "").trim(),
      items: String(formData.get("items") ?? "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      ctaLabel: String(formData.get("ctaLabel") ?? "").trim(),
      ctaHref: String(formData.get("ctaHref") ?? "").trim() || "/dang-ky",
    };

    const response = await fetch("/api/admin/site-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "offer", value }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };

    setIsSaving(false);

    if (!response.ok) {
      setMessage(`Chưa lưu được ưu đãi: ${payload.message ?? "Lỗi không xác định."}`);
      return;
    }

    setMessage("Đã lưu ưu đãi vào Supabase.");
    router.refresh();
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <label className="flex w-fit items-center gap-3 rounded-2xl border border-black/10 bg-[#e7f3df] px-4 py-3 text-sm font-bold text-slate-900">
        <input defaultChecked={settings.enabled} name="enabled" type="checkbox" />
        Hiển thị popup ưu đãi trên trang khóa học
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={settings.title}
          name="title"
          placeholder="Tiêu đề popup"
          required
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={settings.discountLabel}
          name="discountLabel"
          placeholder="Nhãn ưu đãi, ví dụ: Giảm 200.000đ"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 font-black uppercase tracking-[0.08em] text-slate-900"
          defaultValue={settings.couponCode}
          name="couponCode"
          placeholder="Mã giảm giá"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900"
          defaultValue={settings.ctaLabel}
          name="ctaLabel"
          placeholder="Nút CTA"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 text-slate-900 md:col-span-2"
          defaultValue={settings.ctaHref}
          name="ctaHref"
          placeholder="Link CTA"
        />
      </div>
      <textarea
        className="min-h-24 rounded-2xl border border-black/10 p-4 text-slate-900"
        defaultValue={settings.description}
        name="description"
        placeholder="Mô tả ngắn của ưu đãi"
      />
      <textarea
        className="min-h-32 rounded-2xl border border-black/10 p-4 text-slate-900"
        defaultValue={settings.items.join("\n")}
        name="items"
        placeholder="Mỗi dòng là một quyền lợi/quà tặng"
      />
      <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
        Lưu ưu đãi
      </Button>
      {message ? <p className="rounded-2xl bg-[#f2eadf] px-4 py-3 text-sm font-semibold text-slate-800">{message}</p> : null}
    </form>
  );
}
