"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AdminPanel, EmptyState, StatusBadge } from "@/components/admin/crm-ui";
import { Button } from "@/components/ui/button";
import { formatAdminDate, getLeadStatusMeta } from "@/lib/admin/crm-dashboard";
import { createLead, type LeadItem } from "@/services/leadService";

export function LeadManager({ leads }: { leads: LeadItem[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const openLeadCount = leads.filter((lead) => getLeadStatusMeta(lead.status).tone !== "success").length;
  const sourceCount = new Set(leads.map((lead) => lead.source).filter(Boolean)).size;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const result = await createLead({
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
      source: String(formData.get("source") ?? "Admin"),
    });

    setIsSaving(false);

    if (!result.ok) {
      setMessage(`Chưa lưu được lead: ${result.error}`);
      return;
    }

    setMessage("Đã lưu lead vào Supabase.");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <AdminPanel className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Tổng lead</p>
          <p className="mt-2 text-3xl font-black">{leads.length}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Cần chăm sóc</p>
          <p className="mt-2 text-3xl font-black text-[#285f9f]">{openLeadCount}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Nguồn lead</p>
          <p className="mt-2 text-3xl font-black">{sourceCount}</p>
        </AdminPanel>
      </div>

      <AdminPanel className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">Pipeline lead</p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">Danh sách tư vấn</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="info">Mới</StatusBadge>
            <StatusBadge tone="warning">Đang chăm sóc</StatusBadge>
            <StatusBadge tone="success">Đã xử lý</StatusBadge>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          {leads.length > 0 ? (
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-black/38">
                <tr>
                  <th className="py-3">Lead</th>
                  <th>Liên hệ</th>
                  <th>Nhu cầu</th>
                  <th>Nguồn</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const status = getLeadStatusMeta(lead.status);

                  return (
                    <tr key={lead.id ?? `${lead.name}-${lead.phone}`} className="border-t border-black/10 align-top">
                      <td className="py-4 font-black">{lead.name}</td>
                      <td>
                        <p>{lead.phone || "Chưa có SĐT"}</p>
                        {lead.email ? <p className="mt-1 text-xs text-black/45">{lead.email}</p> : null}
                      </td>
                      <td className="max-w-sm text-black/65">{lead.need || "Chưa có ghi chú"}</td>
                      <td>{lead.source || "Website"}</td>
                      <td className="text-black/50">{formatAdminDate(lead.createdAt)}</td>
                      <td>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="Chưa có lead"
              description="Lead từ form public hoặc nhập thủ công sẽ được đưa vào pipeline này."
            />
          )}
        </div>
      </AdminPanel>

      <form className="grid gap-4 rounded-lg border border-black/10 bg-white p-5" onSubmit={handleSubmit}>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">Thêm lead thủ công</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
            Ghi lead từ Facebook/Zalo vào Supabase.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="min-h-12 rounded-lg border border-black/10 px-4"
            name="name"
            placeholder="Tên lead"
            required
          />
          <input
            className="min-h-12 rounded-lg border border-black/10 px-4"
            name="phone"
            placeholder="Số điện thoại"
          />
          <input
            className="min-h-12 rounded-lg border border-black/10 px-4"
            name="email"
            placeholder="Email"
            type="email"
          />
          <input
            className="min-h-12 rounded-lg border border-black/10 px-4"
            name="source"
            placeholder="Nguồn: Facebook, Zalo..."
          />
        </div>
        <textarea
          className="min-h-24 rounded-lg border border-black/10 p-4"
          name="message"
          placeholder="Nhu cầu / ghi chú tư vấn"
        />
        <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
          Lưu lead
        </Button>
        {message ? (
          <p className="rounded-lg bg-[#f7f7f5] px-4 py-3 text-sm font-semibold text-black/65">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
