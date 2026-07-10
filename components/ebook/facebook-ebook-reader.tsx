"use client";

import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FacebookEbookManifest, FacebookEbookPart } from "@/lib/ebook/facebook-ebook";
import { FACEBOOK_EBOOK_POLICY_STORAGE_KEY, facebookEbookPolicy } from "@/lib/ebook/facebook-ebook-policy";

type SearchResult = {
  id: string;
  label: string;
  detail: string;
  part: number;
  absolutePage: number;
};

type FacebookEbookReaderProps = {
  manifest: FacebookEbookManifest;
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function getAbsolutePage(part: FacebookEbookPart, page: number) {
  return part.startAbsolutePage + page - 1;
}

function getPartPageFromAbsolute(manifest: FacebookEbookManifest, absolutePage: number) {
  for (const part of manifest.parts) {
    const start = part.startAbsolutePage;
    const end = part.startAbsolutePage + part.pageCount - 1;

    if (absolutePage >= start && absolutePage <= end) {
      return {
        part,
        page: absolutePage - part.startAbsolutePage + 1,
      };
    }
  }

  return {
    part: manifest.parts[0],
    page: 1,
  };
}

function getImageSrc(part: number, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    part: String(part),
  });

  return `/api/ebook/facebook-ads/page?${params.toString()}`;
}

function getImageSrcFromAbsolute(manifest: FacebookEbookManifest, absolutePage: number) {
  const next = getPartPageFromAbsolute(manifest, Math.min(Math.max(absolutePage, 1), manifest.totalPages));
  return getImageSrc(next.part.part, next.page);
}

function preloadImageSrc(src: string, cache: Map<string, HTMLImageElement>) {
  const cachedImage = cache.get(src);

  if (cachedImage) {
    return cachedImage.decode().catch(() => undefined);
  }

  const preloadedImage = new Image();
  preloadedImage.decoding = "async";
  preloadedImage.src = src;
  cache.set(src, preloadedImage);
  return preloadedImage.decode().catch(() => undefined);
}

function preloadBufferedPages(manifest: FacebookEbookManifest, absolutePage: number, cache: Map<string, HTMLImageElement>) {
  const pagesToPreload = [absolutePage];

  for (let pageOffset = 1; pageOffset <= 4; pageOffset += 1) {
    pagesToPreload.push(absolutePage - pageOffset, absolutePage + pageOffset);
  }

  for (const page of pagesToPreload.filter((item) => item >= 1 && item <= manifest.totalPages)) {
    const src = getImageSrcFromAbsolute(manifest, page);
    preloadImageSrc(src, cache);
  }
}

function preloadTocTargets(manifest: FacebookEbookManifest, cache: Map<string, HTMLImageElement>) {
  const targetPages = new Set<number>();

  for (const part of manifest.parts) {
    targetPages.add(part.startAbsolutePage);

    for (const topicPage of part.topicPages) {
      targetPages.add(topicPage);
    }
  }

  for (const page of Array.from(targetPages).slice(0, 32)) {
    preloadImageSrc(getImageSrcFromAbsolute(manifest, page), cache);
  }
}

function shouldIgnoreKeyboardNavigation(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
}

function buildSearchResults(manifest: FacebookEbookManifest, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const part of manifest.parts) {
    const partHaystack = normalizeSearchText(`${part.title} ${part.keywords.join(" ")}`);

    if (partHaystack.includes(normalizedQuery)) {
      results.push({
        id: `part-${part.part}`,
        label: `Phần ${part.part}`,
        detail: part.title,
        part: part.part,
        absolutePage: part.startAbsolutePage,
      });
    }

    part.topics.forEach((topic, index) => {
      const absolutePage = part.topicPages[index] || part.startAbsolutePage;
      const haystack = normalizeSearchText(`${topic} ${part.title} ${part.keywords.join(" ")}`);

      if (!haystack.includes(normalizedQuery)) {
        return;
      }

      results.push({
        id: `part-${part.part}-topic-${index}`,
        label: `Phần ${part.part} - Trang ${absolutePage}`,
        detail: topic,
        part: part.part,
        absolutePage,
      });
    });
  }

  return results.slice(0, 24);
}

export function FacebookEbookReader({ manifest }: FacebookEbookReaderProps) {
  const [currentPartNumber, setCurrentPartNumber] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(100);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPolicyGate, setShowPolicyGate] = useState(true);
  const [isPolicyChecked, setIsPolicyChecked] = useState(false);
  const [pendingAbsolutePage, setPendingAbsolutePage] = useState<number | null>(null);
  const [expandedTocParts, setExpandedTocParts] = useState<Set<number>>(() => new Set([1]));
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const navigationRequestRef = useRef(0);
  const preloadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const currentPart = manifest.parts.find((part) => part.part === currentPartNumber) || manifest.parts[0];
  const absolutePage = getAbsolutePage(currentPart, currentPage);
  const pendingTarget = pendingAbsolutePage ? getPartPageFromAbsolute(manifest, pendingAbsolutePage) : null;
  const searchResults = useMemo(() => buildSearchResults(manifest, query), [manifest, query]);
  const imageSrc = getImageSrc(currentPart.part, currentPage);
  const isWideReadingMode = !isSidebarOpen && !isFullscreen;
  const readingAreaPaddingClassName = isWideReadingMode ? "p-1 md:p-2" : "p-4";
  const readerFrameClassName = isFullscreen
    ? "relative grid h-screen w-screen place-items-center overflow-auto bg-[#eef3f8] p-0"
    : `relative mx-auto grid min-h-[60vh] place-items-center overflow-auto bg-[#eef3f8] ${isWideReadingMode ? "p-2 md:p-3" : "p-2 md:p-6"}`;
  const imageButtonClassName = isFullscreen ? "block cursor-pointer border-0 bg-transparent p-0" : "mx-auto block cursor-pointer border-0 bg-transparent p-0";
  const imageButtonStyle = {
    width: isFullscreen ? (zoom === 100 ? "100vw" : `${zoom}vw`) : isWideReadingMode ? "fit-content" : `${zoom}%`,
    maxWidth: isFullscreen ? "none" : isWideReadingMode ? "100%" : zoom <= 100 ? "1120px" : "none",
  };
  const imageClassName = isFullscreen
    ? "block h-auto w-full select-none bg-white object-contain"
    : isWideReadingMode
      ? "block h-auto max-w-full select-none bg-white object-contain shadow-[0_16px_44px_rgba(15,23,42,0.12)]"
      : "block w-full select-none bg-white shadow-[0_16px_44px_rgba(15,23,42,0.12)]";
  const imageStyle = {
    maxHeight: isFullscreen && zoom <= 100 ? "100vh" : isWideReadingMode ? "calc(100vh - 9rem)" : "none",
  };

  const goToPart = useCallback(async (partNumber: number, page = 1) => {
    const part = manifest.parts.find((item) => item.part === partNumber);

    if (!part) {
      return;
    }

    const nextPage = Math.min(Math.max(page, 1), part.pageCount);
    const targetAbsolutePage = getAbsolutePage(part, nextPage);

    if (part.part === currentPartNumber && nextPage === currentPage) {
      setPendingAbsolutePage(null);
      preloadBufferedPages(manifest, targetAbsolutePage, preloadedImagesRef.current);
      return;
    }

    const requestId = navigationRequestRef.current + 1;
    navigationRequestRef.current = requestId;
    setPendingAbsolutePage(targetAbsolutePage);
    await preloadImageSrc(getImageSrc(part.part, nextPage), preloadedImagesRef.current);

    if (navigationRequestRef.current !== requestId) {
      return;
    }

    setCurrentPartNumber(part.part);
    setCurrentPage(nextPage);
    setPendingAbsolutePage(null);
    preloadBufferedPages(manifest, targetAbsolutePage, preloadedImagesRef.current);
  }, [currentPage, currentPartNumber, manifest]);

  const goToAbsolutePage = useCallback((nextAbsolutePage: number) => {
    const next = getPartPageFromAbsolute(manifest, Math.min(Math.max(nextAbsolutePage, 1), manifest.totalPages));
    void goToPart(next.part.part, next.page);
  }, [goToPart, manifest]);

  const goPrevious = useCallback(() => {
    goToAbsolutePage(absolutePage - 1);
  }, [absolutePage, goToAbsolutePage]);

  const goNext = useCallback(() => {
    goToAbsolutePage(absolutePage + 1);
  }, [absolutePage, goToAbsolutePage]);

  const changeZoom = useCallback((step: number) => {
    setZoom((value) => Math.min(130, Math.max(75, value + step)));
  }, []);

  const handleTocIntent = useCallback((partNumber: number, page = 1) => {
    const part = manifest.parts.find((item) => item.part === partNumber);

    if (!part) {
      return;
    }

    preloadBufferedPages(manifest, getAbsolutePage(part, page), preloadedImagesRef.current);
  }, [manifest]);

  const toggleTocPart = useCallback((partNumber: number) => {
    setExpandedTocParts((current) => {
      const next = new Set(current);

      if (next.has(partNumber)) {
        next.delete(partNumber);
      } else {
        next.add(partNumber);
      }

      return next;
    });
  }, []);

  const expandTocPart = useCallback((partNumber: number) => {
    setExpandedTocParts((current) => {
      const next = new Set(current);
      next.add(partNumber);
      return next;
    });
  }, []);

  function openResult(result: SearchResult) {
    goToAbsolutePage(result.absolutePage);
  }

  async function toggleFullscreen() {
    const imageWrap = imageWrapRef.current;

    if (!imageWrap) {
      return;
    }

    if (document.fullscreenElement === imageWrap) {
      await document.exitFullscreen();
      return;
    }

    await imageWrap.requestFullscreen({ navigationUI: "hide" });
  }

  function acceptPolicy() {
    localStorage.setItem(FACEBOOK_EBOOK_POLICY_STORAGE_KEY, "accepted");
    setShowPolicyGate(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowPolicyGate(localStorage.getItem(FACEBOOK_EBOOK_POLICY_STORAGE_KEY) !== "accepted");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyboardNavigation(event.target)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        goPrevious();
      }

      if (event.key === "ArrowRight") {
        goNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === imageWrapRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    preloadBufferedPages(manifest, absolutePage, preloadedImagesRef.current);
  }, [absolutePage, manifest]);

  useEffect(() => {
    function runPreload() {
      preloadTocTargets(manifest, preloadedImagesRef.current);
    }

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(runPreload, { timeout: 1800 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(runPreload, 600);
    return () => globalThis.clearTimeout(timeoutId);
  }, [manifest]);

  if (showPolicyGate) {
    return (
      <main className="min-h-screen bg-[#eef3f8] px-4 py-8 text-slate-950">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl place-items-center">
          <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 md:px-8">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-700">Trước khi đọc ebook</p>
              <h1 aria-label="Chính sách miễn trừ trách nhiệm và chính sách bảo mật" className="mt-2 text-2xl font-black md:text-3xl">
                {facebookEbookPolicy.title}
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">{facebookEbookPolicy.updatedAt}</p>
            </div>

            <div className="max-h-[58vh] space-y-6 overflow-y-auto px-5 py-6 text-sm leading-7 text-slate-700 md:px-8">
              <p className="font-semibold text-slate-800">{facebookEbookPolicy.intro}</p>
              {facebookEbookPolicy.sections.map((section) => (
                <section key={section.heading} className="space-y-3">
                  <h2 className="text-lg font-black text-slate-950">{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>

            <div className="grid gap-4 border-t border-slate-200 bg-white px-5 py-5 md:grid-cols-[1fr_auto] md:items-center md:px-8">
              <label className="flex items-start gap-3 text-sm font-bold leading-6 text-slate-700">
                <input
                  className="mt-1 size-4 accent-blue-600"
                  checked={isPolicyChecked}
                  type="checkbox"
                  onChange={(event) => setIsPolicyChecked(event.target.checked)}
                />
                <span>Tôi đã đọc, hiểu và đồng ý với chính sách miễn trừ trách nhiệm và chính sách bảo mật của ebook.</span>
              </label>
              <button
                className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!isPolicyChecked}
                type="button"
                onClick={acceptPolicy}
              >
                Tôi đã đọc, hiểu và đồng ý
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-950">
      <div className={`grid min-h-screen ${isSidebarOpen ? "lg:grid-cols-[292px_minmax(0,1fr)]" : "lg:grid-cols-[0_minmax(0,1fr)]"}`}>
        <aside
          className={`fixed inset-y-0 left-0 z-30 overflow-y-auto border-r border-slate-200 bg-white transition-[transform,width] lg:sticky lg:top-0 lg:h-screen ${
            isSidebarOpen
              ? "w-[292px] translate-x-0"
              : "pointer-events-none w-[292px] -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden lg:border-transparent"
          }`}
        >
          <div className={`${isSidebarOpen ? "block" : "hidden"} p-4`}>
            <div>
              <p className="text-lg font-black leading-tight">Tất tần tật về Facebook Ads 2026</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {manifest.totalParts} phần · {manifest.totalPages} trang
              </p>
            </div>

            <label className="mt-4 flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
              <Search aria-hidden className="size-4 shrink-0" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                placeholder="Tìm phần hoặc đề mục"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            {query.trim() ? (
              <div className="mt-3 grid gap-2">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      className="rounded-lg border border-slate-200 bg-white p-3 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50"
                      key={result.id}
                      type="button"
                      onFocus={() => void preloadImageSrc(getImageSrcFromAbsolute(manifest, result.absolutePage), preloadedImagesRef.current)}
                      onClick={() => openResult(result)}
                      onPointerEnter={() => void preloadImageSrc(getImageSrcFromAbsolute(manifest, result.absolutePage), preloadedImagesRef.current)}
                    >
                      <span className="block font-black text-blue-700">{result.label}</span>
                      <span className="mt-1 line-clamp-2 block text-xs font-semibold text-slate-600">{result.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-500">Chưa có phần hoặc đề mục phù hợp.</p>
                )}
              </div>
            ) : null}

            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Mục lục</p>
              <div className="mt-3 grid gap-2">
                {manifest.parts.map((part) => {
                  const isActive = part.part === currentPart.part;
                  const isPending = pendingTarget?.part.part === part.part && !isActive;
                  const isExpanded = expandedTocParts.has(part.part);

                  return (
                    <div
                      className={`rounded-lg border transition ${
                        isActive ? "border-blue-500 bg-blue-50" : isPending ? "border-blue-300 bg-blue-50/70" : "border-slate-200 bg-white hover:border-blue-200"
                      }`}
                      key={part.part}
                    >
                      <div className="grid grid-cols-[1fr_40px] gap-1 p-2">
                        <button
                          className="grid grid-cols-[40px_1fr] gap-3 rounded-md p-1 text-left transition hover:bg-white/70"
                          type="button"
                          onDoubleClick={() => toggleTocPart(part.part)}
                          onFocus={() => handleTocIntent(part.part)}
                          onClick={() => {
                            expandTocPart(part.part);
                            void goToPart(part.part);
                          }}
                          onPointerEnter={() => handleTocIntent(part.part)}
                        >
                          <span className={`grid size-9 place-items-center rounded-full text-sm font-black ${isActive ? "bg-blue-600 text-white" : isPending ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                            {part.part}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-black">Phần {part.part}</span>
                            <span className="line-clamp-2 block text-xs font-semibold text-slate-500">{part.title}</span>
                            <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                              {part.pageCount} trang
                            </span>
                          </span>
                        </button>

                        <button
                          aria-label={isExpanded ? `Thu gọn Phần ${part.part}` : `Bung Phần ${part.part}`}
                          aria-expanded={isExpanded}
                          className="grid size-10 place-items-center self-start rounded-md border border-slate-200 bg-white text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
                          type="button"
                          onClick={() => toggleTocPart(part.part)}
                          onFocus={() => handleTocIntent(part.part)}
                          onPointerEnter={() => handleTocIntent(part.part)}
                        >
                          {isExpanded ? <Minus className="size-4" /> : <Plus className="size-4" />}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-1 border-t border-slate-200/80 px-3 py-2">
                          {part.topics.map((topic, index) => {
                            const topicAbsolutePage = part.topicPages[index] || part.startAbsolutePage;
                            const isTopicActive = absolutePage === topicAbsolutePage;

                            return (
                              <button
                                className={`grid w-full grid-cols-[1fr_auto] items-start gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold transition ${
                                  isTopicActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white hover:text-blue-700"
                                }`}
                                key={`${part.part}-${topic}`}
                                type="button"
                                onClick={() => goToAbsolutePage(topicAbsolutePage)}
                                onFocus={() => void preloadImageSrc(getImageSrcFromAbsolute(manifest, topicAbsolutePage), preloadedImagesRef.current)}
                                onPointerEnter={() => void preloadImageSrc(getImageSrcFromAbsolute(manifest, topicAbsolutePage), preloadedImagesRef.current)}
                              >
                                <span>{topic}</span>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${isTopicActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
                                  Trang {topicAbsolutePage}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <button
          aria-label={isSidebarOpen ? "Ẩn mục lục" : "Mở mục lục"}
          className="fixed left-0 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-blue-700 shadow-sm lg:left-[292px] lg:data-[closed=true]:left-0"
          data-closed={!isSidebarOpen}
          type="button"
          onClick={() => setIsSidebarOpen((value) => !value)}
        >
          {isSidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
        </button>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/92 px-4 backdrop-blur">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black md:text-xl">Phần {currentPart.part}: {currentPart.title}</h1>
              <p className="text-xs font-semibold text-slate-500">
                Trang {absolutePage}/{manifest.totalPages} · Phần {currentPart.part}/{manifest.totalParts}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50" type="button" onClick={goPrevious}>
                <ChevronLeft className="size-4" />
              </button>
              <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50" type="button" onClick={goNext}>
                <ChevronRight className="size-4" />
              </button>
              <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50" type="button" onClick={() => changeZoom(-10)}>
                <ZoomOut className="size-4" />
              </button>
              <span className="hidden min-w-16 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold md:inline-block">{zoom}%</span>
              <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50" type="button" onClick={() => changeZoom(10)}>
                <ZoomIn className="size-4" />
              </button>
              <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50" type="button" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            </div>
          </header>

          <div className={readingAreaPaddingClassName}>
            <div ref={imageWrapRef} className={readerFrameClassName}>
              {isFullscreen ? (
                <button
                  aria-label="Thoát toàn màn hình"
                  className="fixed right-4 top-4 z-50 grid size-11 place-items-center rounded-full bg-slate-950/70 text-white shadow-lg backdrop-blur transition hover:bg-slate-950"
                  type="button"
                  onClick={toggleFullscreen}
                >
                  <Minimize2 className="size-5" />
                </button>
              ) : null}
              {pendingTarget ? (
                <div
                  aria-live="polite"
                  className="pointer-events-none absolute left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-blue-100 bg-white/92 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm backdrop-blur"
                >
                  <span className="size-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                  Đang tải trang {pendingAbsolutePage}
                </div>
              ) : null}
              <button
                aria-label="Chuyển trang bằng vùng ảnh"
                className={imageButtonClassName}
                style={imageButtonStyle}
                type="button"
                onClick={(event) => {
                  const box = event.currentTarget.getBoundingClientRect();
                  const isLeftHalf = event.clientX - box.left < box.width / 2;
                  if (isLeftHalf) {
                    goPrevious();
                  } else {
                    goNext();
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Protected ebook pages must keep the browser session on the API request. */}
                <img
                  alt={`Phần ${currentPart.part}, trang ${currentPage}`}
                  className={imageClassName}
                  decoding="async"
                  draggable={false}
                  fetchPriority="high"
                  style={imageStyle}
                  src={imageSrc}
                />
              </button>
            </div>
          </div>

          <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/94 px-4 py-3 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <input
                aria-label="Chọn trang"
                className="w-full accent-blue-600"
                max={manifest.totalPages}
                min={1}
                type="range"
                value={absolutePage}
                onChange={(event) => goToAbsolutePage(Number(event.target.value))}
              />
              <label className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-600">
                Trang
                <input
                  className="h-10 w-20 rounded-lg border border-slate-200 px-3 text-center font-bold text-slate-950 outline-none focus:border-blue-500"
                  min={1}
                  max={manifest.totalPages}
                  type="number"
                  value={absolutePage}
                  onChange={(event) => goToAbsolutePage(Number(event.target.value))}
                />
              </label>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
