"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import type { AdminRole } from "@/lib/auth/session";
const groups = [
 { id: "content", title: "Nội dung", description: "Bài viết, tài liệu, phản hồi và hiển thị website.", items: [["Trình quản lý nội dung", "/admin/cms", "Các nội dung và thành phần trên website"], ["Bài viết", "/admin/bai-viet", "Viết và xuất bản bài"], ["Tài liệu", "/admin/tai-lieu", "Tài liệu và nội dung tải về"], ["Phản hồi", "/admin/feedback", "Ý kiến từ học viên"], ["SEO", "/admin/seo", "Tiêu đề và thông tin tìm kiếm"]] },
 { id: "care", title: "Chăm sóc khách hàng", description: "Email, phân khúc và các việc cần xử lý.", items: [["Email", "/admin/crm-v2/email", "Soạn, duyệt và theo dõi email"], ["Phân khúc khách hàng", "/admin/crm-v2/segments", "Chọn đúng nhóm khách"], ["Tự động hóa", "/admin/crm-v2/automation", "Các luồng đang vận hành"], ["Việc cần xử lý", "/admin/viec-can-xu-ly", "Theo dõi việc tồn đọng"], ["Chăm sóc lại", "/admin/remarketing", "Các nhắc nhở và theo dõi"]] },
 { id: "system", title: "Hệ thống", description: "Quyền quản trị, kết nối và nhật ký.", items: [["Thành viên & phân quyền", "/admin/crm-v2/team", "Vai trò chủ hệ thống và biên tập viên"], ["Tích hợp", "/admin/crm-v2/integrations", "Các kết nối của website"], ["Lịch sử hoạt động", "/admin/crm-v2/activity", "Tra cứu các hoạt động quản trị"], ["Vận hành dữ liệu", "/admin/database", "Kiểm tra nguồn dữ liệu"]] },
];
export function AdminSettingsWorkspace({ role }: { role: AdminRole }) {
 const [group, setGroup] = useState(role === "owner" ? "system" : "content");
 const [search, setSearch] = useState("");
 const visible = groups.filter((item) => role === "owner" || item.id === "content");
 const selected = visible.find((item) => item.id === group) ?? visible[0];
 const items = (search ? visible.flatMap((item) => item.items) : selected.items).filter(([title,href,description]) => (role === "owner" || href !== "/admin/seo") && `${title} ${description}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
 return <div data-admin-ui="modern" className="space-y-5"><header><h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1><p className="mt-1 text-sm text-slate-500">Chọn nhóm công việc để mở đúng công cụ.</p></header>
  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4"><nav aria-label="Nhóm cài đặt" className="flex flex-wrap gap-1">{visible.map((item) => <button key={item.id} type="button" aria-pressed={group === item.id} className={`rounded-lg px-3 py-2 text-sm font-semibold ${group === item.id ? "bg-blue-50 text-blue-700" : "text-slate-600"}`} onClick={() => { setGroup(item.id); setSearch(""); }}>{item.title}</button>)}</nav><label className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Search className="size-4 text-slate-400" /><input aria-label="Tìm cài đặt" className="min-w-0 text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm công cụ…" /></label></div>
   <div className="p-5"><p className="mb-4 text-sm text-slate-500">{search ? "Kết quả tìm kiếm" : selected.description}</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map(([title,href,description]) => <Link key={href} href={href} className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/30"><div><h2 className="text-sm font-semibold text-slate-900">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-500">{description}</p></div><ArrowUpRight className="size-4 shrink-0 text-slate-400 group-hover:text-blue-600" /></Link>)}</div>{!items.length ? <p className="py-10 text-center text-sm text-slate-500">Không tìm thấy công cụ.</p> : null}</div>
  </section>
 </div>;
}
