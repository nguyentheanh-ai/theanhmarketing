"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type TransferDetailsProps = {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  transferContent: string;
};

export function TransferDetails({
  bankName,
  bankAccountNumber,
  bankAccountName,
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

  return (
    <div className="grid gap-3 rounded-2xl border border-black/10 bg-[#fbfaf7] p-4 text-sm leading-6 text-black/65">
      <p>
        Ngân hàng: <span className="font-bold text-black">{bankName}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <p>
          Số tài khoản: <span className="font-bold text-black">{bankAccountNumber}</span>
        </p>
        <Button
          className="min-h-8 rounded-full px-3 text-xs"
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
          Chủ tài khoản: <span className="font-bold text-black">{bankAccountName}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <p>
          Nội dung: <span className="font-bold text-black">{transferContent}</span>
        </p>
        <Button
          className="min-h-8 rounded-full px-3 text-xs"
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => copyText(transferContent, "nội dung chuyển khoản")}
        >
          Copy nội dung
        </Button>
      </div>

      {message ? <p className="text-xs font-semibold text-[#1f5e41]">{message}</p> : null}
    </div>
  );
}
