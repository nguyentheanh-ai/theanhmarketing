"use client";

import { useState } from "react";

type TransferDetailsProps = {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  amountLabel: string;
  transferContent: string;
};

function CopyButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-white/8 px-3 text-xs font-bold text-white/82 transition hover:bg-white/14"
      type="button"
      onClick={onClick}
    >
      <span>⧉</span>
      <span>{label}</span>
    </button>
  );
}

export function TransferDetails({
  bankName,
  bankAccountNumber,
  bankAccountName,
  amountLabel,
  transferContent,
}: TransferDetailsProps) {
  const [message, setMessage] = useState("");

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

  return (
    <div className="rounded-lg border border-white/8 bg-[#08090b] p-4 text-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-2">
          <span className="text-white/48">Ngân hàng</span>
          <span className="text-right font-black text-[#60a5fa]">{bankName}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2">
          <span className="text-white/48">Số TK</span>
          <span className="ml-auto font-mono text-lg font-black text-white">{bankAccountNumber}</span>
          <CopyButton label="Copy" onClick={() => copyText(bankAccountNumber, "số tài khoản")} />
        </div>

        {bankAccountName ? (
          <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-2">
            <span className="text-white/48">Chủ TK</span>
            <span className="text-right font-black text-white">{bankAccountName}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-2">
          <span className="text-white/48">Số tiền</span>
          <span className="text-xl font-black text-[#f2b84b]">{amountLabel}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-white/48">Nội dung CK</span>
          <span className="ml-auto rounded bg-[#f2b84b]/10 px-2 py-1 font-mono text-xs font-black text-[#f2b84b]">
            {transferContent}
          </span>
          <CopyButton label="Copy" onClick={() => copyText(transferContent, "nội dung chuyển khoản")} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <CopyButton label="Copy tất cả" onClick={copyAll} />
        {message ? <p className="text-xs font-bold text-emerald-300">{message}</p> : null}
      </div>
    </div>
  );
}
