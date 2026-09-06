import type { Metadata } from "next";
import { CrmShell, EmptyState, StatusBadge } from "@/components/crm-v2";
import { requireAdminAuth } from "@/lib/auth/session";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";

export const metadata: Metadata = {
  title: "Quản trị | The Anh Marketing",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function CrmV2Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await requireAdminAuth("/admin/crm-v2", ["owner", "editor"]);
  const enabled = isCrmV2Enabled(); // CRM_V2_ENABLED production gate

  return (
    <CrmShell adminRole={auth?.adminRole ?? "owner"} disabled={!enabled}>
      {enabled ? (
        children
      ) : (
        <div className="mx-auto max-w-3xl py-20">
          <EmptyState
            title="Khu quản trị chưa khả dụng"
            description="Khu quản trị đang tạm đóng theo cấu hình hệ thống. Anh kiểm tra cấu hình CRM_V2_ENABLED trước khi vận hành."
          />
          <div className="mt-4 flex justify-center">
            <StatusBadge tone="orange">Chưa khả dụng</StatusBadge>
          </div>
        </div>
      )}
    </CrmShell>
  );
}
