"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  CrmDataTable,
  CrmPaginationBar,
  FilterBar,
  InsightRow,
  MetricGrid,
  PageHeader,
  RightInsightPanel,
  OrderActionButtons,
} from "@/components/crm-v2";
import type { CrmListQuery, CrmListResult, CrmOrderRow } from "@/lib/crm-v2/types";

type OrdersPageClientProps = {
  query: CrmListQuery;
  ordersResult: CrmListResult<CrmOrderRow>;
};

export default function OrdersPageClient({ query, ordersResult }: OrdersPageClientProps) {
  const rows = ordersResult.rows;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const pending = rows.filter((row) => row.status.toLowerCase().includes("pending")).length;
  const paid = rows.filter((row) => row.status.toLowerCase().includes("paid")).length;
  const refund = rows.filter((row) => row.status.toLowerCase().includes("refund") || row.status.toLowerCase().includes("fail")).length;
  const revenue = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const successRate = rows.length > 0 ? `${Math.round((paid / rows.length) * 100)}%` : "0%";

  const statusOptions = useMemo(
    () => Array.from(new Set(["pending", "paid", "expired", "failed", ...rows.map((row) => row.status).filter(Boolean)])).map((value) => ({ label: value, value })),
    [rows],
  );
  const courseOptions = useMemo(
    () =>
      Array.from(new Map(rows.map((row) => [row.courseSlug || row.product, { label: row.product, value: row.courseSlug || row.product }])).values()).filter((option) =>
        Boolean(option.value),
      ),
    [rows],
  );
  const sourceOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.source).filter(Boolean))).map((value) => ({ label: value, value })), [rows]);
  const ownerOptions = useMemo(
    () => Array.from(new Map(rows.filter((row) => row.ownerId).map((row) => [row.ownerId || row.owner, { label: row.owner, value: row.ownerId || row.owner }])).values()),
    [rows],
  );

  const selectedOrder = rows.find((row) => row.id === selectedIds[0]) ?? rows[0];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Revenue ops"
        title="Đơn hàng & Thanh toán"
        actions={
          <>
            <Link
              className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
              href="/admin/crm-v2/email?status=pending_payment"
            >
              Nhắc nhở thanh toán
            </Link>
            <Link className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700" href="/admin/crm-v2/orders?status=pending">
              Mã giảm giá
            </Link>
          </>
        }
      />

      <OrderActionButtons order={selectedOrder} />

      <MetricGrid
        metrics={[
          { label: "Đơn hàng mới", value: `${ordersResult.total}`, tone: "blue", series: [8, 12, 20, 31, ordersResult.total] },
          { label: "Chờ thanh toán", value: `${pending}`, tone: "orange", series: [12, 14, 18, 19, pending] },
          { label: "Đã thanh toán", value: `${paid}`, tone: "green", series: [9, 12, 18, 24, paid] },
          { label: "Tỷ lệ thành công", value: successRate, tone: "green", series: [44, 51, 58, 63, Number.parseInt(successRate)] },
          { label: "Doanh thu thuần", value: `${new Intl.NumberFormat("vi-VN").format(revenue)}đ`, tone: "green", series: [80, 110, 130, 160, Math.round(revenue / 1_000_000)] },
          { label: "Hoàn tiền", value: `${refund}`, tone: "slate", series: [0, 0, 0, 0, 0] },
        ]}
      />

      <CrmPaginationBar basePath="/admin/crm-v2/orders" query={query} page={ordersResult.page} pageSize={ordersResult.pageSize} pageCount={ordersResult.pageCount} total={ordersResult.total} />

      <div className="grid min-w-0 gap-4 min-[1840px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <FilterBar
            items={[
              { label: "Khóa học", value: query.filters?.course, param: "course", options: courseOptions },
              { label: "Trạng thái thanh toán", value: query.filters?.status, param: "status", options: statusOptions },
              { label: "Kênh thanh toán" },
              { label: "Sale owner", value: query.filters?.owner, param: "owner", options: ownerOptions },
              { label: "Mã giảm giá" },
              { label: "Nguồn", value: query.filters?.source, param: "source", options: sourceOptions },
              { label: "Ngày tạo" },
            ]}
          />
          <CrmDataTable<CrmOrderRow>
            rows={rows}
            columns={[
              { key: "orderCode", label: "Mã đơn", width: "168px" },
              { key: "customer", label: "Khách hàng", width: "190px" },
              { key: "product", label: "Khóa học/sản phẩm", width: "280px" },
              { key: "value", label: "Giá trị", width: "118px" },
              { key: "discount", label: "Giảm giá", width: "96px" },
              { key: "payment", label: "Thanh toán", width: "110px" },
              { key: "status", label: "Trạng thái", width: "138px" },
              { key: "source", label: "Nguồn", width: "116px" },
              { key: "owner", label: "Owner", width: "130px" },
              { key: "created", label: "Ngày tạo", width: "135px" },
              { key: "due", label: "Hạn thanh toán", width: "135px" },
            ]}
            selectable
            rowIdKey="id"
            selectedIds={selectedIds}
            onSelectedRowsChange={(ids) => setSelectedIds(ids)}
          />
        </div>
        <RightInsightPanel title="Thu hồi thanh toán">
          <InsightRow label="Dòng/trang" value={`${ordersResult.pageSize}`} tone="blue" />
          <InsightRow label="Tổng đơn lọc" value={`${ordersResult.total}`} tone="green" />
          <InsightRow label="Gửi email nhắc" value={`${pending} đơn`} tone="orange" />
          <InsightRow label="Gửi mã giảm giá" value="3 đơn xuất" tone="purple" />
          <InsightRow label="Flow bỏ giỏ hàng" value="Đang bật" tone="green" />
          <InsightRow label="Top lý do thất bại" value="Quên CK" tone="blue" />
          <Link className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700" href="/admin/crm-v2/leads?stage=pending_payment">
            Tạo task thu hồi
          </Link>
        </RightInsightPanel>
      </div>
    </div>
  );
}
