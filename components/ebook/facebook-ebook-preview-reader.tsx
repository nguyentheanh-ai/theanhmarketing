"use client";

import { ChevronLeft, ChevronRight, Lock, Menu, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { useMemo, useState } from "react";

type PreviewPart = {
  part: number;
  title: string;
  pageCount: number;
  startAbsolutePage: number;
  unlocked: boolean;
};

const BUY_EBOOK_HREF = "/academy/ebook-facebook-ads-2026-premium#price";

const previewParts: PreviewPart[] = [
  { part: 1, title: "Hiểu về Facebook Ads", pageCount: 37, startAbsolutePage: 1, unlocked: true },
  { part: 2, title: "Mục tiêu và hình thức quảng cáo", pageCount: 44, startAbsolutePage: 38, unlocked: false },
  { part: 3, title: "Target và tệp khách hàng", pageCount: 35, startAbsolutePage: 82, unlocked: false },
  { part: 4, title: "Content và media quảng cáo", pageCount: 37, startAbsolutePage: 117, unlocked: false },
  { part: 5, title: "Thực hành tạo quảng cáo", pageCount: 53, startAbsolutePage: 154, unlocked: true },
  { part: 6, title: "Pixel và CAPI", pageCount: 63, startAbsolutePage: 207, unlocked: false },
  { part: 7, title: "Đọc chỉ số và tối ưu quảng cáo", pageCount: 24, startAbsolutePage: 270, unlocked: false },
  { part: 8, title: "Remarketing chuyên sâu", pageCount: 59, startAbsolutePage: 294, unlocked: false },
  { part: 9, title: "Testing, Optimize và Scale Up", pageCount: 67, startAbsolutePage: 353, unlocked: false },
  { part: 10, title: "Chính sách Facebook & hướng dẫn rời rạc", pageCount: 52, startAbsolutePage: 420, unlocked: false },
];

const unlockedParts = previewParts.filter((part) => part.unlocked);
const fullBookPages = previewParts.reduce((total, part) => total + part.pageCount, 0);

function getAbsolutePage(part: PreviewPart, page: number) {
  return part.startAbsolutePage + page - 1;
}

function getPublicImageSrc(part: number, page: number) {
  return `/ebook-facebook-ads-2026/phan-${part}/${page}.png`;
}

function clampPage(part: PreviewPart, page: number) {
  return Math.min(part.pageCount, Math.max(1, Number(page) || 1));
}

export function FacebookEbookPreviewReader() {
  const [currentPartNumber, setCurrentPartNumber] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isTocOpen, setIsTocOpen] = useState(true);
  const [lockedPart, setLockedPart] = useState<PreviewPart | null>(null);

  const currentPart = useMemo(
    () => previewParts.find((part) => part.part === currentPartNumber) || previewParts[0],
    [currentPartNumber],
  );
  const currentUnlockedIndex = unlockedParts.findIndex((part) => part.part === currentPart.part);
  const absolutePage = getAbsolutePage(currentPart, currentPage);
  const imageSrc = getPublicImageSrc(currentPart.part, currentPage);

  function openPart(part: PreviewPart) {
    if (!part.unlocked) {
      setLockedPart(part);
      return;
    }

    setCurrentPartNumber(part.part);
    setCurrentPage(1);
  }

  function goToPage(page: number) {
    setCurrentPage(clampPage(currentPart, page));
  }

  function previousPage() {
    if (currentPage > 1) {
      setCurrentPage((page) => page - 1);
      return;
    }

    const previousPart = unlockedParts[currentUnlockedIndex - 1];
    if (previousPart) {
      setCurrentPartNumber(previousPart.part);
      setCurrentPage(previousPart.pageCount);
    }
  }

  function nextPage() {
    if (currentPage < currentPart.pageCount) {
      setCurrentPage((page) => page + 1);
      return;
    }

    const nextPart = unlockedParts[currentUnlockedIndex + 1];
    if (nextPart) {
      setCurrentPartNumber(nextPart.part);
      setCurrentPage(1);
    }
  }

  function changeZoom(step: number) {
    setZoom((value) => Math.min(140, Math.max(75, value + step)));
  }

  return (
    <main className="min-h-screen bg-[#eef2f6] text-slate-950">
      <div className={`grid min-h-screen ${isTocOpen ? "lg:grid-cols-[292px_minmax(0,1fr)]" : "lg:grid-cols-[0_minmax(0,1fr)]"}`}>
        <aside
          className={`fixed inset-y-0 left-0 z-30 overflow-y-auto border-r border-slate-200 bg-white transition-[transform,width] lg:sticky lg:top-0 lg:h-screen ${
            isTocOpen
              ? "w-[292px] translate-x-0"
              : "pointer-events-none w-[292px] -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden lg:border-transparent"
          }`}
        >
          <div className={`${isTocOpen ? "flex" : "hidden"} min-h-screen flex-col p-5`}>
            <div>
              <p className="text-lg font-black leading-tight">Tất tần tật về Facebook Ads 2026</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Đọc thử 2 chương trong ebook {fullBookPages} trang
              </p>
            </div>

            <div className="mt-5 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Mục lục</p>
              <div className="mt-3 grid gap-2">
                {previewParts.map((part) => {
                  const isActive = part.part === currentPart.part;

                  return (
                    <button
                      className={`w-full rounded-lg border px-4 py-4 text-left transition ${
                        part.unlocked
                          ? isActive
                            ? "border-blue-500 bg-blue-50 text-slate-950 shadow-[inset_4px_0_0_#155eef,0_10px_24px_rgba(21,94,239,0.12)]"
                            : "border-blue-100 bg-white text-slate-950 shadow-[0_8px_20px_rgba(16,24,40,0.05)] hover:border-blue-300 hover:bg-blue-50"
                          : "border-slate-200 bg-slate-50 text-slate-500 opacity-60 hover:opacity-75"
                      }`}
                      key={part.part}
                      type="button"
                      onClick={() => openPart(part)}
                    >
                      <span className="block truncate text-[15px] font-black leading-5">{part.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <a
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
              href={BUY_EBOOK_HREF}
            >
              <ShoppingCart className="size-4" />
              Mua Ebook
            </a>
          </div>
        </aside>

        <button
          aria-label={isTocOpen ? "Ẩn mục lục" : "Mở mục lục"}
          className="fixed left-0 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-blue-700 shadow-sm lg:left-[292px] lg:data-[closed=true]:left-0"
          data-closed={!isTocOpen}
          type="button"
          onClick={() => setIsTocOpen((value) => !value)}
        >
          {isTocOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/92 px-4 backdrop-blur">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black md:text-xl">{currentPart.title}</h1>
              <p className="text-xs font-semibold text-slate-500">
                Trang {absolutePage}/{fullBookPages}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50" type="button" onClick={previousPage}>
                <ChevronLeft className="size-4" />
              </button>
              <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50" type="button" onClick={nextPage}>
                <ChevronRight className="size-4" />
              </button>
              <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50" type="button" onClick={() => changeZoom(-10)}>
                <Minus className="size-4" />
              </button>
              <span className="hidden min-w-16 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold md:inline-block">{zoom}%</span>
              <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50" type="button" onClick={() => changeZoom(10)}>
                <Plus className="size-4" />
              </button>
            </div>
          </header>

          <div className="grid min-h-[calc(100vh-8rem)] place-items-start overflow-auto bg-[#eef2f6] p-3 md:p-6">
            <button
              aria-label="Chuyển trang bằng vùng ảnh"
              className="mx-auto block border-0 bg-transparent p-0"
              style={{ width: `${zoom}%`, maxWidth: zoom <= 100 ? "1120px" : "none" }}
              type="button"
              onClick={(event) => {
                const box = event.currentTarget.getBoundingClientRect();
                if (event.clientX - box.left < box.width / 2) previousPage();
                else nextPage();
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Ebook trial images are static public assets. */}
              <img
                alt={`${currentPart.title}, trang ${currentPage}`}
                className="block w-full select-none bg-white shadow-[0_16px_44px_rgba(15,23,42,0.12)]"
                decoding="async"
                draggable={false}
                fetchPriority="high"
                key={imageSrc}
                src={imageSrc}
              />
            </button>
          </div>

          <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/94 px-4 py-3 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <input
                aria-label="Chọn trang trong chương đang mở"
                className="w-full accent-blue-600"
                max={currentPart.pageCount}
                min={1}
                type="range"
                value={currentPage}
                onChange={(event) => goToPage(Number(event.target.value))}
              />
              <label className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-600">
                Trang
                <input
                  className="h-10 w-20 rounded-lg border border-slate-200 px-3 text-center font-bold text-slate-950 outline-none focus:border-blue-500"
                  max={currentPart.pageCount}
                  min={1}
                  type="number"
                  value={currentPage}
                  onChange={(event) => goToPage(Number(event.target.value))}
                />
              </label>
            </div>
          </footer>
        </section>
      </div>

      {lockedPart ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-5 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
            <div className="grid size-11 place-items-center rounded-full bg-amber-100 text-amber-700">
              <Lock className="size-5" />
            </div>
            <h2 className="mt-4 text-2xl font-black leading-tight">Phần này nằm trong bản Ebook đầy đủ</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
              Bản đọc thử đang mở chương 1 và chương 5. Anh/chị mua Ebook đầy đủ để mở toàn bộ nội dung và khu đọc online dành cho khách đã mua.
            </p>
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{lockedPart.title}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                type="button"
                onClick={() => setLockedPart(null)}
              >
                Để sau
              </button>
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
                href={BUY_EBOOK_HREF}
              >
                <ShoppingCart className="size-4" />
                Mua Ebook
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
