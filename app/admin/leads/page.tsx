import { AdminPageHeader } from "@/components/admin/crm-ui";
import { LeadManager } from "@/components/admin/lead-manager";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { getLeads } from "@/services/leadService";

export default async function AdminLeadsPage() {
  const leads = await getLeads({ includeFallback: false });

  return (
    <ProtectedAdminShell nextPath="/admin/leads">
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader
          eyebrow="CRM"
          title="Quản lý lead"
          description="Tập trung lead từ form tư vấn, đăng ký và nhập tay từ Facebook/Zalo để admin theo dõi trạng thái chăm sóc."
        />
        <div className="mt-6">
          <LeadManager leads={leads} />
        </div>
      </div>
    </ProtectedAdminShell>
  );
}
