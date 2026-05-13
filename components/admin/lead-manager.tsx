"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createLead, type LeadItem } from "@/services/leadService";

export function LeadManager({ leads }: { leads: LeadItem[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-black/45">
            <tr>
              <th className="py-3">Họ tên</th>
              <th>Liên hệ</th>
              <th>Nhu cầu</th>
              <th>Nguồn</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id ?? `${lead.name}-${lead.phone}`} className="border-t border-black/10">
                <td className="py-4 font-semibold">{lead.name}</td>
                <td>
                  {lead.phone}
                  {lead.email ? (
                    <>
                      <br />
                      {lead.email}
                    </>
                  ) : null}
                </td>
                <td>{lead.need}</td>
                <td>{lead.source}</td>
                <td className="font-semibold text-[#c77b20]">{lead.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="grid gap-4 rounded-[1.5rem] bg-[#f7f3ec] p-5" onSubmit={handleSubmit}>
        <div>
          <p className="text-sm font-semibold text-[#c77b20]">Thêm lead thủ công</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
            Ghi lead từ Facebook/Zalo vào Supabase.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            name="name"
            placeholder="Tên lead"
            required
          />
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            name="phone"
            placeholder="Số điện thoại"
          />
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            name="email"
            placeholder="Email"
            type="email"
          />
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            name="source"
            placeholder="Nguồn: Facebook, Zalo..."
          />
        </div>
        <textarea
          className="min-h-24 rounded-2xl border border-black/10 p-4"
          name="message"
          placeholder="Nhu cầu / ghi chú tư vấn"
        />
        <button
          className="w-fit rounded-full bg-black px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Đang lưu..." : "Lưu lead"}
        </button>
        {message ? (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black/65">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
