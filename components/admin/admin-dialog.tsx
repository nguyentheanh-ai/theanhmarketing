"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** A native modal keeps focus inside the active window and returns it on close. */
export function AdminDialog({ open, onClose, title, description, wide = false, busy = false, children }: {
  open: boolean; onClose: () => void; title: string; description?: string; wide?: boolean; busy?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <dialog data-admin-ui="modern" aria-busy={busy} ref={ref} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
    className={`m-auto max-h-[92dvh] w-[calc(100%_-_2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 ${wide ? "max-w-6xl" : "max-w-2xl"}`}
    onCancel={(event) => { event.preventDefault(); if (!busy) closeRef.current(); }}
    onClose={() => { if (open) closeRef.current(); }}
    onClick={(event) => { if (!busy && event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeRef.current(); } }}>
    {open ? <div className="flex max-h-[92dvh] flex-col">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0"><h2 id={titleId} className="break-words text-lg font-bold">{title}</h2>{description ? <p id={descriptionId} className="mt-1 text-sm text-slate-500">{description}</p> : null}</div>
        <button type="button" aria-label="Đóng cửa sổ" disabled={busy} onClick={onClose} className="rounded-lg p-2 text-slate-500 disabled:cursor-wait disabled:opacity-40 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"><X className="size-5" /></button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5">{children}</div>
    </div> : null}
  </dialog>;
}
