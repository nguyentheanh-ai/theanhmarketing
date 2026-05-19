import { MarketingSettingsManager } from "@/components/admin/marketing-settings-manager";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getMarketingSettings } from "@/services/marketingSettingsService";

export default async function AdminSeoPage() {
  const settings = await getMarketingSettings();

  return (
    <ProtectedAdminShell nextPath="/admin/seo">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-[#2f8f62]">SEO & Tracking</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Gắn Pixel, Google và SEO từ admin.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-black/60">
          Nhập mã Facebook Pixel, GA4, Google Tag Manager, Search Console và Facebook Domain Verification tại đây.
          Website chỉ nhúng script khi bạn bật tracking, nên có thể chuẩn bị SEO trước mà không làm chậm trang.
        </p>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <SoftCard>
            <p className="text-sm font-semibold text-black/50">Facebook Pixel</p>
            <p className="mt-2 text-2xl font-black">{settings.facebookPixelEnabled ? "Đang bật" : "Đang tắt"}</p>
            <p className="mt-2 text-sm text-black/55">{settings.facebookPixelId || "Chưa nhập Pixel ID"}</p>
          </SoftCard>
          <SoftCard>
            <p className="text-sm font-semibold text-black/50">Google Analytics</p>
            <p className="mt-2 text-2xl font-black">{settings.gaEnabled ? "Đang bật" : "Đang tắt"}</p>
            <p className="mt-2 text-sm text-black/55">{settings.gaMeasurementId || "Chưa nhập GA4 ID"}</p>
          </SoftCard>
          <SoftCard>
            <p className="text-sm font-semibold text-black/50">Google Tag Manager</p>
            <p className="mt-2 text-2xl font-black">{settings.gtmEnabled ? "Đang bật" : "Đang tắt"}</p>
            <p className="mt-2 text-sm text-black/55">{settings.gtmId || "Chưa nhập GTM ID"}</p>
          </SoftCard>
        </section>

        <SoftCard className="mt-5">
          <MarketingSettingsManager settings={settings} />
        </SoftCard>
      </div>
    </ProtectedAdminShell>
  );
}
