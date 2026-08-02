"use client";

import { useState } from "react";
import { emptyInvoiceDetails, type InvoiceDetails } from "@/lib/orders/invoice";

export function InvoiceRequestFields({
  variant = "dark",
  onChange,
}: {
  variant?: "light" | "dark";
  onChange?: (value: InvoiceDetails) => void;
}) {
  const [value, setValue] = useState<InvoiceDetails>(emptyInvoiceDetails);
  const light = variant === "light";

  function update(patch: Partial<InvoiceDetails>) {
    const next = { ...value, ...patch };
    setValue(next);
    onChange?.(next.requested ? next : emptyInvoiceDetails);
  }

  const inputClass = light
    ? "min-h-11 rounded-xl border border-slate-900/10 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500"
    : "min-h-11 rounded-xl border border-white/10 bg-white/8 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orange-400/60";

  return (
    <div className="grid gap-3">
      <label className={`flex items-center justify-center gap-2 text-xs ${light ? "text-slate-500" : "text-white/55"}`}>
        <input
          checked={value.requested}
          className="size-4 accent-orange-500"
          name="invoiceRequested"
          onChange={(event) => update({ requested: event.target.checked })}
          type="checkbox"
        />
        Tôi cần xuất hóa đơn
      </label>
      {value.requested ? (
        <div className={`grid gap-3 rounded-2xl p-4 ${light ? "bg-slate-50" : "bg-white/5"}`}>
          <input className={inputClass} name="invoiceTaxCode" onChange={(event) => update({ taxCode: event.target.value })} placeholder="Mã số thuế" required />
          <input className={inputClass} name="invoiceCompanyName" onChange={(event) => update({ companyName: event.target.value })} placeholder="Tên doanh nghiệp" required />
          <textarea className={`${inputClass} min-h-20 py-3`} name="invoiceCompanyAddress" onChange={(event) => update({ companyAddress: event.target.value })} placeholder="Địa chỉ doanh nghiệp" required />
          <input className={inputClass} name="invoiceEmail" onChange={(event) => update({ email: event.target.value })} placeholder="Email nhận hóa đơn" required type="email" />
        </div>
      ) : null}
    </div>
  );
}
