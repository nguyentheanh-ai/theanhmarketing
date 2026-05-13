import { LeadManager } from "@/components/admin/lead-manager";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getLeads } from "@/services/leadService";

export default async function AdminLeadsPage() {
  const leads = await getLeads();

  return (
    <ProtectedAdminShell nextPath="/admin/leads">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Quản lý lead.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-black/60">
          Lead đọc từ bảng Supabase `leads`, fallback về dữ liệu mẫu nếu bảng
          rỗng. Có thể thêm lead thủ công từ Facebook/Zalo ngay tại đây.
        </p>

        <SoftCard className="mt-10">
          <LeadManager leads={leads} />
        </SoftCard>
      </div>
    </ProtectedAdminShell>
  );
}
