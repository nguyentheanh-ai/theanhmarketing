import { requireAdminAuth } from "@/lib/auth/session";
import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/crm-v2";

const services = [
  {
    name: "Supabase",
    configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    note: "Dữ liệu website, CRM và LMS",
  },
  {
    name: "Meta Ads",
    configured: Boolean(process.env.META_ADS_ACCESS_TOKEN && process.env.META_ADS_AD_ACCOUNT_ID),
    note: "Chi phí và hiệu quả quảng cáo",
  },
  {
    name: "Resend",
    configured: Boolean(process.env.RESEND_API_KEY),
    note: "Email giao dịch từ luồng cấp tài khoản học viên",
  },
] as const;

export default async function CrmSettingsPage() {
  await requireAdminAuth("/admin/crm-v2/settings", ["owner"]);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Hệ thống" title="Cài đặt" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Thành viên & phân quyền", "/admin/crm-v2/team"], ["Nội dung website", "/admin/cms"],
          ["Email & tự động hóa", "/admin/crm-v2/email"], ["Tích hợp", "/admin/crm-v2/integrations"],
          ["SEO", "/admin/seo"], ["Vận hành dữ liệu", "/admin/database"],
        ].map(([label, href]) => <Link key={href} href={href} className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-900 transition hover:border-blue-400 hover:text-blue-700">{label} →</Link>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {services.map((service) => (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={service.name}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black text-slate-950">{service.name}</h2>
              <StatusBadge tone={service.configured ? "green" : "orange"}>
                {service.configured ? "Đã cấu hình" : "Chưa cấu hình"}
              </StatusBadge>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{service.note}</p>
          </section>
        ))}
      </div>
      <p className="text-sm font-semibold text-slate-600">
        Màn hình chỉ xác nhận trạng thái cấu hình; không đọc hoặc hiển thị giá trị bí mật.
      </p>
    </div>
  );
}
