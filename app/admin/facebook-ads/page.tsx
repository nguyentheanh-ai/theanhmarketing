import { ProductAdsReportClient } from "@/components/admin/product-ads-report-client";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";

export default function AdminFacebookAdsPage() {
  return (
    <ProtectedAdminShell nextPath="/admin/facebook-ads" allowedRoles={["owner"]}>
      <ProductAdsReportClient />
    </ProtectedAdminShell>
  );
}
