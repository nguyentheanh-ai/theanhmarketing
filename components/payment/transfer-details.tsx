"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type TransferDetailsProps = {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  amount: number;
  amountLabel: string;
  transferContent: string;
};

export function TransferDetails({
  bankName,
  bankAccountNumber,
  bankAccountName,
  amount,
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
      amount > 0 ? `Số tiền: ${amount}` : "",
      transferContent ? `Nội dung chuyển khoản: ${transferContent}` : "",
    ].filter(Boolean);

    await copyText(lines.join("\n"), "thông tin chuyển khoản");
  }

  return (
    <div className="grid gap-3 rounded-xl border border-white/10 bg-white/7 p-4 text-sm leading-6 text-white/65">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <p className="font-bold text-white">Thông tin chuyển khoản</p>
        <Button
          className="min-h-8 rounded-xl px-3 text-xs"
          size="sm"
          type="button"
          variant="secondary"
          onClick={copyAll}
        >
          Copy tất cả
        </Button>
      </div>

      <p>
        Ngân hàng: <span className="font-bold text-white">{bankName}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <p>
          Số tài khoản: <span className="font-bold text-white">{bankAccountNumber}</span>
        </p>
        <Button
          className="min-h-8 rounded-xl px-3 text-xs"
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => copyText(bankAccountNumber, "số tài khoản")}
        >
          Copy STK
        </Button>
      </div>

      {bankAccountName ? (
        <p>
          Chủ tài khoản: <span className="font-bold text-white">{bankAccountName}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <p>
          Số tiền: <span className="font-bold text-white">{amountLabel}</span>
        </p>
        <Button
          className="min-h-8 rounded-xl px-3 text-xs"
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => copyText(String(amount), "số tiền")}
        >
          Copy số tiền
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p>
          Nội dung: <span className="font-bold text-white">{transferContent}</span>
        </p>
        <Button
          className="min-h-8 rounded-xl px-3 text-xs"
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => copyText(transferContent, "nội dung chuyển khoản")}
        >
          Copy nội dung
        </Button>
      </div>

      {message ? <p className="text-xs font-semibold text-emerald-200">{message}</p> : null}
    </div>
  );
}
