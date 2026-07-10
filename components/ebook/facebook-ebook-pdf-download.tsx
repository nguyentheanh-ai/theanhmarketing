"use client";

import { useState } from "react";
import { FACEBOOK_EBOOK_PDF_API_HREF, FACEBOOK_EBOOK_READER_HREF } from "@/lib/ebook/facebook-ebook";

type DownloadResponse =
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      message?: string;
    };

export function FacebookEbookPdfDownload() {
  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDownload() {
    if (!accepted) {
      setMessage("Anh/chị cần tick đồng ý điều khoản trước khi tải PDF.");
      return;
    }

    setIsLoading(true);
    setMessage("Đang tạo link tải PDF...");

    try {
      const response = await fetch(`${FACEBOOK_EBOOK_PDF_API_HREF}?accepted=1&format=json`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as DownloadResponse | null;

      if (!response.ok || !data || data.ok === false) {
        setMessage(
          data && data.ok === false && data.message
            ? data.message
            : "Chưa tạo được link tải PDF. Anh/chị thử đăng nhập lại rồi bấm tải lần nữa.",
        );
        setIsLoading(false);
        return;
      }

      setMessage("Đã tạo link tải. Trình duyệt sẽ bắt đầu tải file PDF.");
      window.location.href = data.url;
    } catch {
      setMessage("Không kết nối được máy chủ tải PDF. Anh/chị thử lại sau ít phút.");
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-5 grid gap-4">
      <label className="flex gap-3 rounded-2xl bg-white p-4 text-sm font-bold leading-6 text-[#243653] ring-1 ring-[#d7e3ff]">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => {
            setAccepted(event.target.checked);
            setMessage("");
          }}
          className="mt-1 size-4 accent-[#1f63ff]"
        />
        <span>
          Tôi đã đọc, hiểu và đồng ý với chính sách miễn trừ trách nhiệm, quyền sở hữu nội dung và chính sách bảo mật trước khi tải PDF.
        </span>
      </label>

      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={isLoading}
        className="min-h-12 rounded-full bg-[#1f63ff] px-5 text-sm font-black text-white shadow-[0_12px_34px_rgba(31,99,255,0.22)] transition-colors hover:bg-[#154bd0] disabled:cursor-wait disabled:opacity-70"
      >
        {isLoading ? "Đang tạo link tải..." : "Tôi đồng ý và tải file PDF"}
      </button>

      {message ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-6 text-[#42536e] ring-1 ring-[#d7e3ff]">
          {message}
        </p>
      ) : null}

      <a
        href={FACEBOOK_EBOOK_READER_HREF}
        className="text-center text-sm font-black text-[#1f63ff] hover:text-[#154bd0]"
      >
        Quay lại đọc online
      </a>
    </div>
  );
}
