import type { Metadata } from "next";
import { CrmShell, EmptyState, StatusBadge } from "@/components/crm-v2";
import { requireAdminAuth } from "@/lib/auth/session";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";

export const metadata: Metadata = {
  title: "CRM v2 | The Anh Marketing",
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
  await requireAdminAuth("/admin/crm-v2", ["owner"]);
  const enabled = isCrmV2Enabled(); // CRM_V2_ENABLED production gate

  return (
    <CrmShell disabled={!enabled}>
      {enabled ? (
        children
      ) : (
        <div className="mx-auto max-w-3xl py-20">
          <EmptyState
            title="CRM mới chưa mở cho vận hành"
            description="Khi chủ hệ thống bật CRM mới, dữ liệu thật đã được đối chiếu sẽ hiển thị tại đây. Các màn admin hiện tại vẫn hoạt động bình thường."
          />
          <div className="mt-4 flex justify-center">
            <StatusBadge tone="orange">Chưa khả dụng</StatusBadge>
          </div>
        </div>
      )}
    </CrmShell>
  );
}
