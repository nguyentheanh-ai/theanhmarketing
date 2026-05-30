"use client";

import { useState } from "react";

type TransferDetailsProps = {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  amountLabel: string;
  amount?: number;
  transferContent: string;
  variant?: "dark" | "light";
  prominent?: boolean;
};

function CopyButton({
  label,
  onClick,
  variant = "dark",
  prominent = false,
}: {
  label: string;
  onClick: () => void;
  variant?: "dark" | "light";
  prominent?: boolean;
}) {
  const displayLabel = prominent ? "Copy" : label;

  return (
    <button
      aria-label={label}
      className={
        variant === "light"
          ? prominent
            ? "inline-flex h-8 w-fit shrink-0 items-center rounded-full bg-blue-50 px-2 text-[10px] font-black text-blue-600 transition hover:bg-blue-100"
            : "inline-flex h-8 shrink-0 items-center rounded-full bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100"
          : "inline-flex h-8 shrink-0 items-center rounded-md bg-white/8 px-3 text-xs font-bold text-white/82 transition hover:bg-white/14"
      }
      type="button"
      onClick={onClick}
    >
      {displayLabel}
    </button>
  );
}

export function TransferDetails({
  bankName,
  bankAccountNumber,
  bankAccountName,
  amountLabel,
  transferContent,
  variant = "dark",
  prominent = false,
}: TransferDetailsProps) {
  const [message, setMessage] = useState("");
  const isLight = variant === "light";

  async function copyText(value: string, label: string) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setMessage(`Đã copy ${label}.`);
      window.setTimeout(() => setMessage(""), 1800);
    } catch {
      setMessage("Không copy được. Vui lòng thử lại.");
    }
  }

  async function copyAll() {
    const lines = [
      bankName ? `Ngân hàng: ${bankName}` : "",
      bankAccountNumber ? `Số tài khoản: ${bankAccountNumber}` : "",
      bankAccountName ? `Chủ tài khoản: ${bankAccountName}` : "",
      amountLabel ? `Số tiền: ${amountLabel}` : "",
      transferContent ? `Nội dung chuyển khoản: ${transferContent}` : "",
    ].filter(Boolean);

    await copyText(lines.join("\n"), "thông tin chuyển khoản");
  }

  const actionRowClass = isLight
    ? prominent
      ? "grid items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/45 px-3 py-3"
      : "flex flex-wrap items-center justify-between gap-2 border-b border-slate-900/8 pb-2"
    : "flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2";
  const actionRowStyle = prominent ? { gridTemplateColumns: "clamp(54px, 14vw, 84px) minmax(0, 1fr) max-content" } : undefined;
  const labelClass = isLight
    ? prominent
      ? "text-[10px] font-black uppercase tracking-[0.08em] text-slate-400"
      : "text-slate-500"
    : "text-white/48";

  return (
    <div
      className={
        isLight
          ? prominent
            ? "rounded-[28px] border-2 border-blue-100 bg-white p-3 text-sm shadow-[0_18px_56px_rgba(0,97,255,0.12)] sm:p-5"
            : "rounded-3xl border border-slate-900/8 bg-white p-4 text-sm shadow-[0_14px_44px_rgba(15,23,42,0.06)]"
          : "rounded-lg border border-white/8 bg-[#08090b] p-4 text-sm"
      }
    >
      <div className={prominent ? "grid gap-3" : "space-y-3"}>
        <div className={actionRowClass} style={actionRowStyle}>
          <span className={labelClass}>Ngân hàng</span>
          <span className={isLight ? prominent ? "min-w-0 text-right text-sm font-black text-blue-600 sm:text-base" : "text-right font-black text-blue-600" : "text-right font-black text-[#60a5fa]"}>
            {bankName}
          </span>
          <CopyButton label="Copy ngân hàng" onClick={() => copyText(bankName, "ngân hàng")} variant={variant} prominent={prominent} />
        </div>

        <div className={actionRowClass} style={actionRowStyle}>
          <span className={labelClass}>Số TK</span>
          <span className={isLight ? prominent ? "min-w-0 text-right font-mono text-base font-black tracking-[-0.04em] text-slate-950 sm:text-2xl" : "ml-auto font-mono text-lg font-black text-slate-950" : "ml-auto font-mono text-lg font-black text-white"}>
            {bankAccountNumber}
          </span>
          <CopyButton label="Copy STK" onClick={() => copyText(bankAccountNumber, "số tài khoản")} variant={variant} prominent={prominent} />
        </div>

        {bankAccountName ? (
          <div className={actionRowClass} style={actionRowStyle}>
            <span className={labelClass}>Chủ TK</span>
            <span className={isLight ? prominent ? "min-w-0 text-right text-sm font-black text-slate-950 sm:text-base" : "text-right font-black text-slate-950" : "text-right font-black text-white"}>
              {bankAccountName}
            </span>
            <CopyButton label="Copy chủ tài khoản" onClick={() => copyText(bankAccountName, "chủ tài khoản")} variant={variant} prominent={prominent} />
          </div>
        ) : null}

        <div className={actionRowClass} style={actionRowStyle}>
          <span className={labelClass}>Số tiền</span>
          <span className={isLight ? prominent ? "min-w-0 text-right text-base font-black tracking-[-0.04em] text-orange-500 sm:text-2xl" : "ml-auto text-xl font-black text-orange-500" : "ml-auto text-xl font-black text-[#f2b84b]"}>
            {amountLabel}
          </span>
          <CopyButton label="Copy số tiền" onClick={() => copyText(amountLabel.replace(/[^\d]/g, ""), "số tiền")} variant={variant} prominent={prominent} />
        </div>

        <div className={isLight && prominent ? actionRowClass : "flex flex-wrap items-center justify-between gap-2"} style={isLight && prominent ? actionRowStyle : undefined}>
          <span className={labelClass}>{prominent ? "Nội dung" : "Nội dung CK"}</span>
          <span className={isLight ? prominent ? "min-w-0 justify-self-end rounded-xl bg-white px-2 py-2 text-right font-mono text-[11px] font-black text-blue-600" : "ml-auto rounded-full bg-blue-50 px-3 py-1 font-mono text-xs font-black text-blue-600" : "ml-auto rounded bg-[#f2b84b]/10 px-2 py-1 font-mono text-xs font-black text-[#f2b84b]"}>
            {transferContent}
          </span>
          <CopyButton label="Copy nội dung" onClick={() => copyText(transferContent, "nội dung chuyển khoản")} variant={variant} prominent={prominent} />
        </div>
      </div>

      {!prominent ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <CopyButton label="Copy tất cả" onClick={copyAll} variant={variant} />
          {message ? <p className={isLight ? "text-xs font-bold text-emerald-600" : "text-xs font-bold text-emerald-300"}>{message}</p> : null}
        </div>
      ) : message ? (
        <p className="mt-3 text-right text-xs font-bold text-emerald-600">{message}</p>
      ) : null}
    </div>
  );
}
