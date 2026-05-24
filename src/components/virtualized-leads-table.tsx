"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Copy, Filter, Search } from "lucide-react";
import { useDeferredValue, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { calculateRemainingAmount, formatCurrencyVnd } from "@/lib/analytics";
import { useWorkspaceStore } from "@/lib/store";
import type { CareStatus, Lead, PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const paymentLabels: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
  failed: "Lỗi thanh toán",
  refunded: "Đã hoàn tiền",
};

const careLabels: Record<CareStatus, string> = {
  new: "Lead mới",
  contacted: "Đã liên hệ",
  consulting: "Đang tư vấn",
  waiting_payment: "Chờ thanh toán",
  paid: "Đã thanh toán",
  access_granted: "Đã cấp quyền",
  lost: "Lost",
};

function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge
      className={cn(
        "border",
        status === "paid" && "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        status === "partial" && "border-amber-300/20 bg-amber-300/10 text-amber-200",
        status === "unpaid" && "border-zinc-400/20 bg-zinc-400/10 text-zinc-300",
        status === "failed" && "border-red-400/20 bg-red-400/10 text-red-300",
      )}
      variant="outline"
    >
      {paymentLabels[status]}
    </Badge>
  );
}

export function VirtualizedLeadsTable({ leads }: { leads: Lead[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.toLowerCase());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { selectedLead, setSelectedLead } = useWorkspaceStore();

  const data = useMemo(() => {
    if (!deferredQuery) {
      return leads;
    }

    return leads.filter((lead) =>
      [lead.name, lead.email, lead.phone, lead.courseName, lead.orderCode, lead.utmSource, lead.owner]
        .join(" ")
        .toLowerCase()
        .includes(deferredQuery),
    );
  }, [deferredQuery, leads]);

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        accessorKey: "orderCode",
        header: "Mã đơn",
        cell: ({ row }) => (
          <span
            className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 transition hover:text-sky-200"
            onDoubleClick={() => navigator.clipboard?.writeText(row.original.orderCode)}
            title="Double click để copy mã đơn"
          >
            {row.original.orderCode}
            <Copy className="size-3" />
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Khách hàng",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.phone}</p>
          </div>
        ),
      },
      {
        accessorKey: "courseName",
        header: "Khóa học",
        cell: ({ row }) => <span className="line-clamp-1 text-sm text-zinc-200">{row.original.courseName}</span>,
      },
      {
        accessorKey: "paymentStatus",
        header: "Thanh toán",
        cell: ({ row }) => <PaymentBadge status={row.original.paymentStatus} />,
      },
      {
        accessorKey: "careStatus",
        header: "Chăm sóc",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{careLabels[row.original.careStatus]}</span>,
      },
      {
        accessorKey: "owner",
        header: "Phụ trách",
        cell: ({ row }) => <span className="text-sm">{row.original.owner}</span>,
      },
      {
        accessorKey: "paidAmount",
        header: "Đã thu",
        cell: ({ row }) => <span className="font-mono text-xs">{formatCurrencyVnd(row.original.paidAmount)}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 58,
    overscan: 8,
  });

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm lead, SĐT, khóa học, nguồn..."
            value={query}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Filter />
            Bộ lọc
          </Button>
          <Button size="sm" variant="outline">
            Export
          </Button>
          <Button size="sm">Bulk action</Button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-card/64">
        <div className="grid grid-cols-[120px_190px_minmax(220px,1fr)_150px_140px_120px_130px] border-b border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-muted-foreground">
          {table.getFlatHeaders().map((header) => (
            <div key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</div>
          ))}
        </div>
        <div ref={scrollRef} className="h-[386px] overflow-auto">
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  aria-label={`Mở lead ${row.original.orderCode}`}
                  className="absolute left-0 grid w-full grid-cols-[120px_190px_minmax(220px,1fr)_150px_140px_120px_130px] items-center border-b border-white/6 px-3 text-left transition hover:bg-sky-400/[0.06]"
                  key={row.id}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedLead(row.original);
                    }
                  }}
                  onClick={() => setSelectedLead(row.original)}
                  role="button"
                  style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                  tabIndex={0}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div className="min-w-0 pr-3" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Sheet open={Boolean(selectedLead)} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent className="w-full border-white/10 bg-[#0b0f19] sm:max-w-xl">
          {selectedLead ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLead.name}</SheetTitle>
                <SheetDescription>{selectedLead.orderCode} · {selectedLead.courseName}</SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-92px)] px-4 pb-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Giá khóa học</p>
                      <p className="mt-1 font-mono text-sm">{formatCurrencyVnd(selectedLead.price)}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Còn thiếu</p>
                      <p className="mt-1 font-mono text-sm">
                        {formatCurrencyVnd(calculateRemainingAmount(selectedLead.price, selectedLead.paidAmount))}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Pipeline</p>
                      <PaymentBadge status={selectedLead.paymentStatus} />
                    </div>
                    <div className="mt-4 grid gap-3">
                      {[
                        "Lead mới",
                        "Đã liên hệ",
                        "Đang tư vấn",
                        "Chờ thanh toán",
                        "Đã thanh toán",
                        "Đã cấp quyền",
                      ].map((step, index) => (
                        <div className="flex items-center gap-3" key={step}>
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              index < 4 || selectedLead.paymentStatus === "paid" ? "bg-sky-300" : "bg-white/20",
                            )}
                          />
                          <span className="text-sm text-zinc-300">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm font-medium">Activity timeline</p>
                    <div className="mt-4 space-y-4">
                      {[
                        "Submit form từ landing page",
                        "Click xem bảng giá",
                        selectedLead.paymentStatus === "paid" ? "Thanh toán thành công" : "Sale thêm ghi chú chăm sóc",
                      ].map((event) => (
                        <div className="border-l border-white/10 pl-3" key={event}>
                          <p className="text-sm">{event}</p>
                          <p className="text-xs text-muted-foreground">Hôm nay · {selectedLead.utmSource}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm font-medium">Ghi chú nội bộ</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedLead.notes || "Chưa có ghi chú. Sale có thể thêm note, tag và lịch nhắc follow-up."}
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
