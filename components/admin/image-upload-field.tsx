"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

type ImageUploadFieldProps = {
  description?: string;
  isUploading?: boolean;
  label: string;
  onFileSelect: (file: File | undefined) => void;
  onUrlChange: (url: string) => void;
  uploadLabel?: string;
  value: string;
};

export function ImageUploadField({
  description,
  isUploading = false,
  label,
  onFileSelect,
  onUrlChange,
  uploadLabel = "Chọn ảnh để upload",
  value,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="flex min-h-28 items-center justify-center overflow-hidden rounded-2xl bg-[#f2eadf] ring-1 ring-black/5">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={label} className="h-full w-full object-contain" src={value} />
          ) : (
            <span className="px-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-black/35">
              Chưa có ảnh
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-black text-black">{label}</p>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-black/55">{description}</p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              isLoading={isUploading}
              loadingLabel="Đang upload..."
              size="md"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              {uploadLabel}
            </Button>
            {value ? (
              <Button
                size="md"
                type="button"
                variant="secondary"
                onClick={() => window.open(value, "_blank", "noopener,noreferrer")}
              >
                Mở ảnh
              </Button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            accept="image/*"
            className="hidden"
            type="file"
            onChange={(event) => {
              onFileSelect(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <input
            className="mt-4 min-h-11 w-full rounded-2xl border border-black/10 bg-[#fbfaf7] px-4 text-sm outline-none transition focus:border-black/25"
            placeholder="URL ảnh sau khi upload"
            value={value}
            onChange={(event) => onUrlChange(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
