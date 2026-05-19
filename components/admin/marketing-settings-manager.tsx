"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { normalizeMarketingSettings, type MarketingSettings } from "@/lib/marketing-settings";

export function MarketingSettingsManager({ settings }: { settings: MarketingSettings }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const value = normalizeMarketingSettings({
      seoTitle: String(formData.get("seoTitle") ?? ""),
      seoDescription: String(formData.get("seoDescription") ?? ""),
      socialImageUrl: String(formData.get("socialImageUrl") ?? ""),
      googleSiteVerification: String(formData.get("googleSiteVerification") ?? ""),
      facebookDomainVerification: String(formData.get("facebookDomainVerification") ?? ""),
      trackingEnabled: formData.get("trackingEnabled") === "on",
      facebookPixelEnabled: formData.get("facebookPixelEnabled") === "on",
      facebookPixelId: String(formData.get("facebookPixelId") ?? ""),
      gaEnabled: formData.get("gaEnabled") === "on",
      gaMeasurementId: String(formData.get("gaMeasurementId") ?? ""),
      gtmEnabled: formData.get("gtmEnabled") === "on",
      gtmId: String(formData.get("gtmId") ?? ""),
    });
    const response = await fetch("/api/admin/site-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key: "marketing", value }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };

    setIsSaving(false);

    if (!response.ok) {
      setMessage(`Chưa lưu được SEO/Tracking: ${payload.message ?? "Lỗi không xác định."}`);
      return;
    }

    setMessage("Đã lưu SEO/Tracking vào Supabase. Website sẽ tự đọc cấu hình này khi tải trang.");
    router.refresh();
  }

  return (
    <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
      <section className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4">
        <div>
          <p className="text-sm font-black text-[#2f8f62]">SEO mặc định</p>
          <p className="mt-1 text-sm leading-6 text-black/55">
            Dùng cho trang chủ, thẻ chia sẻ mạng xã hội và fallback khi trang con chưa có metadata riêng.
          </p>
        </div>
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.seoTitle}
          name="seoTitle"
          placeholder="SEO title"
        />
        <textarea
          className="min-h-28 rounded-2xl border border-black/10 p-4"
          defaultValue={settings.seoDescription}
          name="seoDescription"
          placeholder="SEO description"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.socialImageUrl}
          name="socialImageUrl"
          placeholder="Ảnh OpenGraph mặc định, ví dụ /og-image.jpg hoặc https://..."
        />
      </section>

      <section className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4">
        <div>
          <p className="text-sm font-black text-[#2f8f62]">Xác minh SEO</p>
          <p className="mt-1 text-sm leading-6 text-black/55">
            Có thể dán riêng mã content hoặc dán nguyên thẻ meta từ Google Search Console/Facebook Domain Verification.
          </p>
        </div>
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.googleSiteVerification}
          name="googleSiteVerification"
          placeholder="Search Console verification"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4"
          defaultValue={settings.facebookDomainVerification}
          name="facebookDomainVerification"
          placeholder="Facebook domain verification"
        />
      </section>

      <section className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-[#2f8f62]">Pixel và Analytics</p>
            <p className="mt-1 text-sm leading-6 text-black/55">
              Bật công tắc tổng trước, sau đó bật từng nền tảng cần dùng.
            </p>
          </div>
          <label className="flex w-fit items-center gap-3 rounded-2xl bg-[#e7f3df] px-4 py-3 text-sm font-bold">
            <input defaultChecked={settings.trackingEnabled} name="trackingEnabled" type="checkbox" />
            Bật tracking
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-3 rounded-2xl border border-black/10 p-4">
            <span className="flex items-center gap-3 text-sm font-black">
              <input defaultChecked={settings.facebookPixelEnabled} name="facebookPixelEnabled" type="checkbox" />
              Facebook Pixel
            </span>
            <input
              className="min-h-12 rounded-xl border border-black/10 px-4"
              defaultValue={settings.facebookPixelId}
              name="facebookPixelId"
              placeholder="1234567890"
            />
          </label>

          <label className="grid gap-3 rounded-2xl border border-black/10 p-4">
            <span className="flex items-center gap-3 text-sm font-black">
              <input defaultChecked={settings.gaEnabled} name="gaEnabled" type="checkbox" />
              Google Analytics
            </span>
            <input
              className="min-h-12 rounded-xl border border-black/10 px-4 uppercase"
              defaultValue={settings.gaMeasurementId}
              name="gaMeasurementId"
              placeholder="G-XXXXXXXXXX"
            />
          </label>

          <label className="grid gap-3 rounded-2xl border border-black/10 p-4">
            <span className="flex items-center gap-3 text-sm font-black">
              <input defaultChecked={settings.gtmEnabled} name="gtmEnabled" type="checkbox" />
              Google Tag Manager
            </span>
            <input
              className="min-h-12 rounded-xl border border-black/10 px-4 uppercase"
              defaultValue={settings.gtmId}
              name="gtmId"
              placeholder="GTM-XXXXXXX"
            />
          </label>
        </div>
      </section>

      <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
        Lưu SEO/Tracking
      </Button>
      {message ? <p className="rounded-2xl bg-[#f2eadf] px-4 py-3 text-sm font-semibold text-black/65">{message}</p> : null}
    </form>
  );
}
