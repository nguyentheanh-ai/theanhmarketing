import { LeadManager } from "@/components/admin/lead-manager";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { getAdminLeads } from "@/services/adminDataService";

export default async function AdminLeadsPage() {
  const leads = await getAdminLeads();

  return (
    <ProtectedAdminShell nextPath="/admin/leads">
      <div className="mx-auto max-w-[1480px]">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-blue-700">Lead CRM</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              CRM gọn cho sale và CSKH
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              Lead từ landing page, form tư vấn và nhập tay vẫn lấy từ Supabase cũ, nhưng bảng được tóm tắt lại để không trộn tracking log vào nội dung chăm sóc.
            </p>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            Realtime data
          </div>
        </div>
        <div className="mt-6">
          <LeadManager leads={leads} />
        </div>
      </div>
    </ProtectedAdminShell>
  );
}
