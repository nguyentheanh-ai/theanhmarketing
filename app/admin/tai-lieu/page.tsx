import { ResourceManager } from "@/components/admin/resource-manager";
import { AdminShell } from "@/components/app/admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getResources } from "@/services/resourceService";

export default async function AdminResourcesPage() {
  const resources = await getResources();

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Quản lý tài liệu.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-black/60">
          Tài liệu đọc từ Supabase trước, fallback về file tĩnh nếu database
          chưa có dữ liệu. Form bên dưới tạo/sửa/xóa trực tiếp trong bảng
          resources.
        </p>

        <SoftCard className="mt-10">
          <p className="text-sm font-semibold text-[#c77b20]">Resource CMS</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            Tạo, sửa, xóa tài liệu.
          </h2>
          <ResourceManager resources={resources} />
        </SoftCard>
      </div>
    </AdminShell>
  );
}
