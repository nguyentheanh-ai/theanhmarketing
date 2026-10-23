import Link from "next/link";
import { getAdsMindOverview } from "@/lib/products/adsmind-admin";
import { listBot247Licenses } from "@/lib/products/bot247-admin";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

/** Overview strip: one card per software product, read live from each product (never blocks the page; wrap in Suspense). */
export async function ProductPulse() {
  const [ads, bot] = await Promise.all([getAdsMindOverview(), listBot247Licenses()]);
  const card = (href: string, title: string, lines: Array<[string, string]>, problem?: string) => <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300">
    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
    {problem ? <p className="mt-2 text-sm text-slate-500">{problem}</p> : <dl className="mt-2 grid grid-cols-2 gap-2">{lines.map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="text-lg font-black text-slate-950">{v}</dd></div>)}</dl>}
  </Link>;
  const lic = bot.ok ? bot.data.licenses : [];
  return <section aria-label="Sản phẩm phần mềm" className="grid gap-3 md:grid-cols-2">
    {card("/admin/crm-v2/adsmind", "AdsMind", ads.ok ? [["Doanh thu tháng này", vnd(ads.data.revenueThisMonth)], ["Gói đang hoạt động", String(ads.data.active)]] : [], ads.ok ? undefined : "Chưa đọc được dữ liệu AdsMind — bấm để xem chi tiết.")}
    {card("/admin/crm-v2/bot247", "Bot 24/7", bot.ok ? [["Máy đang hoạt động", String(lic.filter((l) => (l.uses ?? 0) > 0 && !l.revoked).length)], ["Mã đã cấp", String(lic.length)]] : [], bot.ok ? undefined : "Chưa đọc được danh sách mã — bấm để xem chi tiết.")}
  </section>;
}
