import { ErrorState, MetricGrid, PageHeader } from "@/components/crm-v2";
import { Bot247Panel } from "@/components/crm-v2/products-admin-client";
import { requireAdminAuth } from "@/lib/auth/session";
import { listBot247Licenses } from "@/lib/products/bot247-admin";

const notes: Record<string, string> = {
  not_configured: "Chưa có khóa BOT247_ADMIN_TOKEN trên máy chủ website. Thêm cùng một khóa vào Vercel (BOT247_ADMIN_TOKEN) và vào cổng bot247-connect (Cloudflare secret ADMIN_TOKEN).",
  unauthorized: "Cổng Bot 24/7 từ chối khóa quản trị. Kiểm tra hai khóa ở Vercel và Cloudflare có giống nhau không.",
  unavailable: "Chưa kết nối được cổng Bot 24/7 (connect.theanhmarketing.com). Thử tải lại sau giây lát.",
};

export default async function Bot247AdminPage() {
  await requireAdminAuth("/admin/crm-v2/bot247", ["owner"]);
  const r = await listBot247Licenses();
  const head = <PageHeader eyebrow="Sản phẩm" title="Bot 24/7 · Mã kích hoạt" />;
  if (!r.ok) return <div className="space-y-4">{head}<ErrorState title="Chưa đọc được danh sách mã" description={notes[r.reason]} /></div>;
  const l = r.data.licenses, used = l.filter((x) => (x.uses ?? 0) > 0 && !x.revoked).length;
  return <div className="space-y-4">
    {head}
    <MetricGrid metrics={[
      { label: "Mã đã cấp", value: String(l.length), tone: "blue" },
      { label: "Máy đang hoạt động", value: String(used), tone: "green" },
      { label: "Chưa kích hoạt", value: String(l.filter((x) => !(x.uses ?? 0) && !x.revoked).length), tone: "orange" },
      { label: "Đã thu hồi", value: String(l.filter((x) => x.revoked).length), tone: "red" },
    ]} />
    <Bot247Panel licenses={l} />
    <p className="text-xs text-slate-500">Bảng giá gói Bot 24/7 chưa thiết lập — sẽ thêm khi chốt giá.</p>
  </div>;
}
