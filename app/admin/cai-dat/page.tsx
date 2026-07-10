import { AdminPageHeader, AdminPanel, TextLink } from "@/components/admin/crm-ui";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";

export default function AdminSettingsPage() {
  return (
    <ProtectedAdminShell nextPath="/admin/cai-dat" allowedRoles={["owner"]}>
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          eyebrow="Cài đặt"
          title="Quản trị và khu vực nâng cao."
          description="Các lối vào dành cho chủ hệ thống được gom tại đây, tách khỏi công việc vận hành hằng ngày."
        />

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <AdminPanel className="p-6">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Quản trị</p>
            <h2 className="mt-3 text-xl font-black tracking-[-0.02em]">Thành viên admin</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Xem và quản lý những tài khoản được phép truy cập khu vực admin.
            </p>
            <div className="mt-5">
              <TextLink href="/admin/thanh-vien-admin">Mở quản lý thành viên</TextLink>
            </div>
          </AdminPanel>

          <AdminPanel className="p-6">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">Nâng cao</p>
            <h2 className="mt-3 text-xl font-black tracking-[-0.02em]">CRM V2</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Khu vực tương thích nâng cao cho các quy trình CRM V2 hiện có; không thuộc điều hướng vận hành chính.
            </p>
            <div className="mt-5">
              <TextLink href="/admin/crm-v2">Mở khu vực CRM V2</TextLink>
            </div>
          </AdminPanel>
        </section>
      </div>
    </ProtectedAdminShell>
  );
}
