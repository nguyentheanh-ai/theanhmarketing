import { AdminPageHeader, AdminPanel } from "@/components/admin/crm-ui";
import { MarketingSettingsManager } from "@/components/admin/marketing-settings-manager";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { getMarketingSettings } from "@/services/marketingSettingsService";

export default async function AdminSeoPage() {
  const settings = await getMarketingSettings();

  return (
    <ProtectedAdminShell nextPath="/admin/seo">
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader
          eyebrow="SEO & Tracking"
          title="Gắn Pixel, Google và SEO từ admin."
          description="Nhập Facebook Pixel, GA4, Google Tag Manager, Search Console và Facebook Domain Verification tại đây. Website chỉ nhúng script khi bạn bật tracking, nên có thể chuẩn bị SEO trước mà không làm chậm trang."
        />

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <AdminPanel className="p-5">
            <p className="text-sm font-semibold text-slate-500">Facebook Pixel</p>
            <p className="mt-2 text-2xl font-black">{settings.facebookPixelEnabled ? "Đang bật" : "Đang tắt"}</p>
            <p className="mt-2 text-sm text-slate-500">{settings.facebookPixelId || "Chưa nhập Pixel ID"}</p>
          </AdminPanel>
          <AdminPanel className="p-5">
            <p className="text-sm font-semibold text-slate-500">Google Analytics</p>
            <p className="mt-2 text-2xl font-black">{settings.gaEnabled ? "Đang bật" : "Đang tắt"}</p>
            <p className="mt-2 text-sm text-slate-500">{settings.gaMeasurementId || "Chưa nhập GA4 ID"}</p>
          </AdminPanel>
          <AdminPanel className="p-5">
            <p className="text-sm font-semibold text-slate-500">Google Tag Manager</p>
            <p className="mt-2 text-2xl font-black">{settings.gtmEnabled ? "Đang bật" : "Đang tắt"}</p>
            <p className="mt-2 text-sm text-slate-500">{settings.gtmId || "Chưa nhập GTM ID"}</p>
          </AdminPanel>
        </section>

        <AdminPanel className="mt-5 p-5">
          <MarketingSettingsManager settings={settings} />
        </AdminPanel>
      </div>
    </ProtectedAdminShell>
  );
}
