import { ErrorState, MetricGrid, PageHeader, StatusBadge } from "@/components/crm-v2";
import { AdsMindGrantForm } from "@/components/crm-v2/products-admin-client";
import { requireAdminAuth } from "@/lib/auth/session";
import { adsmindPlanNames, getAdsMindOverview, type AdsMindPlanId } from "@/lib/products/adsmind-admin";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("vi-VN") : "—");
const plan = (p: string) => adsmindPlanNames[p as AdsMindPlanId] ?? p;
const notes: Record<string, string> = {
  not_configured: "Chưa có khóa ADSMIND_ADMIN_API_TOKEN trên máy chủ website. Thêm cùng một khóa vào Vercel (ADSMIND_ADMIN_API_TOKEN) và vào AdsMind (Cloudflare secret ADSMIND_ADMIN_API_TOKEN).",
  unauthorized: "AdsMind từ chối khóa quản trị. Kiểm tra hai khóa ở Vercel và Cloudflare có giống nhau không.",
  unavailable: "Chưa kết nối được AdsMind. Thử tải lại sau giây lát.",
};

export default async function AdsMindAdminPage() {
  await requireAdminAuth("/admin/crm-v2/adsmind", ["owner"]);
  const r = await getAdsMindOverview();
  const head = <PageHeader eyebrow="Sản phẩm" title="AdsMind" actions={<a href="https://adsmind.vn" target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-700">Mở adsmind.vn ↗</a>} />;
  if (!r.ok) return <div className="space-y-4">{head}<ErrorState title="Chưa đọc được dữ liệu AdsMind" description={notes[r.reason]} /><AdsMindGrantForm /></div>;
  const d = r.data, paid = d.orders.filter((o) => o.status === "paid"), pending = d.orders.filter((o) => o.status === "pending");
  return <div className="space-y-4">
    {head}
    <MetricGrid metrics={[
      { label: "Doanh thu tháng này", value: vnd(d.revenueThisMonth), tone: "green" },
      { label: "Gói đang hoạt động", value: String(d.active), tone: "blue" },
      { label: "Tài khoản AdsMind", value: d.signups === null ? "—" : String(d.signups), tone: "slate" },
      { label: "Đã đồng ý điều khoản", value: d.termsAccepted === null ? "—" : String(d.termsAccepted), tone: "purple" },
      { label: "Đơn đã thanh toán", value: String(paid.length), tone: "green" },
      { label: "Đơn chờ chuyển khoản", value: String(pending.length), tone: "orange" },
    ]} />
    <AdsMindGrantForm />
    <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-black">Khách đang có gói</h2>
      <table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">Email</th><th className="px-3 py-2">Gói</th><th className="px-3 py-2">Bắt đầu</th><th className="px-3 py-2">Hết hạn</th><th className="px-3 py-2">Trạng thái</th></tr></thead>
        <tbody>{d.subs.length ? d.subs.map((s) => <tr key={s.userId} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold">{s.email || s.userId}</td><td className="px-3 py-2">{plan(s.plan)}</td><td className="px-3 py-2">{day(s.startedAt)}</td><td className="px-3 py-2">{day(s.expiresAt)}</td><td className="px-3 py-2">{s.active ? <StatusBadge tone="green">Còn {s.daysLeft} ngày</StatusBadge> : <StatusBadge tone="slate">Hết hạn</StatusBadge>}</td></tr>) : <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Chưa có khách nào có gói.</td></tr>}</tbody></table>
    </section>
    <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-black">Đơn hàng gần đây</h2>
      <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">Mã đơn</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Gói</th><th className="px-3 py-2">Số tiền</th><th className="px-3 py-2">Tạo lúc</th><th className="px-3 py-2">Trạng thái</th></tr></thead>
        <tbody>{d.orders.length ? d.orders.slice(0, 100).map((o) => <tr key={o.code} className="border-t border-slate-100"><td className="px-3 py-2 font-mono text-xs">{o.code}</td><td className="px-3 py-2">{o.email}</td><td className="px-3 py-2">{plan(o.plan)}</td><td className="px-3 py-2">{o.grantedBy ? <span className="text-slate-500">Mở tay</span> : vnd(o.paidAmount ?? o.amount)}</td><td className="px-3 py-2 text-xs text-slate-500">{new Date(o.createdAt).toLocaleString("vi-VN")}</td>
          <td className="px-3 py-2">{o.status === "paid" ? <StatusBadge tone="green">Đã thanh toán</StatusBadge> : o.status === "pending" ? <StatusBadge tone="orange">Chờ chuyển khoản</StatusBadge> : <StatusBadge tone="slate">{o.status === "expired" ? "Hết hạn" : "Đã hủy"}</StatusBadge>}</td></tr>) : <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Chưa có đơn hàng.</td></tr>}</tbody></table>
    </section>
    <p className="text-xs text-slate-500">Dữ liệu đọc trực tiếp từ AdsMind lúc {new Date(d.fetchedAt).toLocaleString("vi-VN")}.</p>
  </div>;
}
