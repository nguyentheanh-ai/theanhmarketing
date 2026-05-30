"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProductAdsPerformanceRow } from "@/lib/admin/product-ads-report";
import type { MetaAdAccount } from "@/lib/meta/ads-api";

type ProductReportResponse = {
  ok: boolean;
  data?: {
    rows: ProductAdsPerformanceRow[];
    summary: ProductReportSummary;
    accounts: MetaAdAccount[];
    selectedAdAccountId: string;
    dateRange: {
      startDate: string;
      endDate: string;
    };
    metaConfigured: boolean;
    metaError: string | null;
    mappingStorage: string;
    kpiStorage: string;
  };
  message?: string;
};

type ProductReportSummary = {
  adSpend: number;
  funnelRevenue: number;
  leads: number;
  clicks: number;
  meRePercent: number | null;
  actualCostPerLead: number | null;
  cvrLpPercent: number | null;
};

type SortDirection = "asc" | "desc";

type SortKey =
  | "productName"
  | "adSpend"
  | "funnelRevenue"
  | "meRePercent"
  | "leads"
  | "averageLeadsPerDay"
  | "kpiLeadsPerDay"
  | "targetCpl"
  | "actualCostPerLead"
  | "clicks"
  | "cvrLpPercent";

const datePresets = [
  { label: "7 ngày", days: 7 },
  { label: "14 ngày", days: 14 },
  { label: "30 ngày", days: 30 },
];

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

function formatVnd(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} đ`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatCompactVnd(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  if (Math.abs(value) >= 1_000_000_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1_000_000_000)} tỷ`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1_000_000)} tr`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value / 1_000)}k`;
  }

  return formatNumber(value);
}

function meReClass(value: number | null) {
  if (value === null) {
    return "bg-slate-100 text-slate-500";
  }

  if (value < 25) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (value <= 40) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

function costPerLeadClass(row: ProductAdsPerformanceRow) {
  if (row.actualCostPerLead === null) {
    return "text-slate-400";
  }

  if (row.targetCpl > 0 && row.actualCostPerLead > row.targetCpl) {
    return "bg-rose-100 text-rose-700";
  }

  return "text-slate-900";
}

function isRiskRow(row: ProductAdsPerformanceRow) {
  const meReRisk = row.meRePercent !== null && row.meRePercent > 40;
  const cplRisk = row.targetCpl > 0 && row.actualCostPerLead !== null && row.actualCostPerLead > row.targetCpl;

  return meReRisk || cplRisk;
}

function getSortValue(row: ProductAdsPerformanceRow, sortKey: SortKey) {
  return row[sortKey];
}

function sortRows(rows: ProductAdsPerformanceRow[], sortKey: SortKey, sortDirection: SortDirection) {
  return [...rows].sort((a, b) => {
    const left = getSortValue(a, sortKey);
    const right = getSortValue(b, sortKey);

    if (typeof left === "string" && typeof right === "string") {
      return sortDirection === "asc" ? left.localeCompare(right, "vi") : right.localeCompare(left, "vi");
    }

    const leftMissing = left === null || left === undefined;
    const rightMissing = right === null || right === undefined;

    if (leftMissing && rightMissing) {
      return a.productName.localeCompare(b.productName, "vi");
    }

    if (leftMissing) {
      return 1;
    }

    if (rightMissing) {
      return -1;
    }

    const leftNumber = Number(left);
    const rightNumber = Number(right);
    const difference = sortDirection === "asc" ? leftNumber - rightNumber : rightNumber - leftNumber;

    return difference || a.productName.localeCompare(b.productName, "vi");
  });
}

function SummaryItem({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "warn" }) {
  const toneClass =
    tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-rose-700" : "text-slate-950";

  return (
    <div className="min-w-28 border-r border-slate-200 pr-4 last:border-r-0">
      <p className="text-[11px] font-black uppercase text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function SortButton({
  label,
  sortColumn,
  activeSortKey,
  sortDirection,
  onSort,
  align = "right",
}: {
  label: string;
  sortColumn: SortKey;
  activeSortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (sortKey: SortKey) => void;
  align?: "left" | "center" | "right";
}) {
  const isActive = activeSortKey === sortColumn;
  const alignment = align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end";

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-1 ${alignment} font-black text-slate-500 hover:text-slate-950`}
      onClick={() => onSort(sortColumn)}
    >
      <span>{label}</span>
      <span className="text-[10px] text-slate-400">{isActive ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

const chartColors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#4f46e5", "#475569"];

function compactProductName(productName: string) {
  return productName.length > 18 ? `${productName.slice(0, 18)}...` : productName;
}

function ChartCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3">
        <h2 className="text-sm font-black uppercase tracking-[0.06em] text-slate-900">{title}</h2>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function AdsRevenueCharts({ rows }: { rows: ProductAdsPerformanceRow[] }) {
  const chartRows = useMemo(
    () =>
      rows
        .filter((row) => row.adSpend > 0 || row.funnelRevenue > 0 || row.leads > 0 || row.clicks > 0)
        .slice()
        .sort((a, b) => b.adSpend + b.funnelRevenue - (a.adSpend + a.funnelRevenue))
        .slice(0, 8)
        .map((row) => ({
          productName: row.productName,
          shortName: compactProductName(row.productName),
          adSpend: row.adSpend,
          funnelRevenue: row.funnelRevenue,
          leads: row.leads,
          clicks: row.clicks,
          actualCostPerLead: row.actualCostPerLead ?? 0,
          meRePercent: row.meRePercent ?? 0,
        })),
    [rows],
  );

  const spendMix = chartRows.filter((row) => row.adSpend > 0);

  if (chartRows.length === 0) {
    return (
      <div className="mt-5">
        <ChartCard
          title="Doanh thu / chi phí"
          description="Biểu đồ ads - doanh thu sẽ hiện sau khi báo cáo tải được dữ liệu theo bộ lọc hiện tại."
        >
          <div className="grid min-h-40 place-items-center rounded-md bg-slate-50 text-sm font-semibold text-slate-500">
            Chưa có dữ liệu biểu đồ.
          </div>
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
      <ChartCard
        title="Doanh thu / chi phí"
        description="So sánh DT phễu với chi phí QC theo từng sản phẩm. Dùng để nhìn nhanh sản phẩm nào đang kéo biên lợi nhuận."
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} barGap={2}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="shortName" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={formatCompactVnd} />
              <RechartsTooltip formatter={(value) => formatVnd(Number(value))} labelFormatter={(_, payload) => payload?.[0]?.payload?.productName ?? ""} />
              <Bar dataKey="funnelRevenue" name="DT phễu" fill="#059669" radius={[6, 6, 0, 0]} />
              <Bar dataKey="adSpend" name="Chi phí QC" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Phân bổ chi phí"
        description="Cơ cấu ngân sách quảng cáo theo sản phẩm đang hiển thị trong bộ lọc."
      >
        <div className="grid gap-3 lg:grid-cols-[180px_1fr] lg:items-center xl:grid-cols-1">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={spendMix} dataKey="adSpend" nameKey="shortName" innerRadius={58} outerRadius={88} paddingAngle={2}>
                  {spendMix.map((row, index) => (
                    <Cell key={row.productName} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => formatVnd(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2">
            {spendMix.slice(0, 6).map((row, index) => (
              <div key={row.productName} className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                  <span className="truncate">{row.productName}</span>
                </span>
                <span className="shrink-0 text-slate-900">{formatCompactVnd(row.adSpend)}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      <ChartCard
        title="Lead & click"
        description="Đường lead và click giúp thấy chất lượng traffic tương đối giữa các sản phẩm."
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="shortName" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={formatNumber} />
              <RechartsTooltip formatter={(value) => formatNumber(Number(value))} labelFormatter={(_, payload) => payload?.[0]?.payload?.productName ?? ""} />
              <Line type="monotone" dataKey="clicks" name="Click" stroke="#2563eb" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="leads" name="Leads" stroke="#d97706" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="CPL & ME/RE"
        description="CPL thực tế so với ME/RE để phát hiện sản phẩm đốt tiền hoặc cần tối ưu phễu."
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartRows}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="shortName" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis yAxisId="money" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={formatCompactVnd} />
              <YAxis yAxisId="percent" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
              <RechartsTooltip
                formatter={(value, name) =>
                  name === "ME/RE" ? formatPercent(Number(value)) : formatVnd(Number(value))
                }
                labelFormatter={(_, payload) => payload?.[0]?.payload?.productName ?? ""}
              />
              <Bar yAxisId="money" dataKey="actualCostPerLead" name="CPL TT" fill="#0891b2" radius={[6, 6, 0, 0]} />
              <Line yAxisId="percent" type="monotone" dataKey="meRePercent" name="ME/RE" stroke="#dc2626" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

export function ProductAdsReportClient() {
  const initialRange = useMemo(() => defaultDateRange(), []);
  const [rows, setRows] = useState<ProductAdsPerformanceRow[]>([]);
  const [summary, setSummary] = useState<ProductReportSummary | null>(null);
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [productFilter, setProductFilter] = useState("");
  const [riskOnly, setRiskOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("adSpend");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState("");
  const [notice, setNotice] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const params = new URLSearchParams(window.location.search);
    const connectError = params.get("meta_error");

    if (connectError) {
      return connectError;
    }

    return params.get("connected") === "facebook" ? "Đã kết nối Facebook. Đang tải lại tài khoản quảng cáo thật." : "";
  });

  const loadReport = useCallback(async () => {
    setNotice("");

    if (startDate && endDate && startDate > endDate) {
      setNotice("Ngày bắt đầu không được sau ngày kết thúc.");
      setLoading(false);
      return;
    }

    setLoading(true);

    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });

    if (selectedAccount) {
      params.set("ad_account_id", selectedAccount);
    }

    try {
      const response = await fetch(`/api/admin/meta/product-report?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as ProductReportResponse | null;

      if (!response.ok || !payload?.ok || !payload.data) {
        setNotice(payload?.message ?? "Không tải được báo cáo Facebook Ads.");
        return;
      }

      const reportData = payload.data;

      setRows(reportData.rows);
      setSummary(reportData.summary);
      setAccounts(reportData.accounts);
      setSelectedAccount(reportData.selectedAdAccountId || selectedAccount);

      if (!reportData.metaConfigured) {
        setNotice("Chưa cấu hình META_ADS_ACCESS_TOKEN nên bảng đang dùng doanh thu/lead CRM và KPI nội bộ.");
      } else if (reportData.metaError) {
        setNotice(reportData.metaError);
      } else if (reportData.accounts.some((account) => account.id === reportData.selectedAdAccountId && /sandbox/i.test(account.name ?? ""))) {
        setNotice("Facebook đang trả về Sandbox Ad Account. Hãy bấm Kết nối Facebook bằng tài khoản có quyền trên tài khoản quảng cáo thật.");
      } else if (reportData.kpiStorage === "missing_schema" || reportData.mappingStorage === "missing_schema") {
        setNotice("Cần chạy SQL product_ads_mappings/product_ads_kpis để lưu mapping và KPI lâu dài.");
      }
    } catch {
      setNotice("Không tải được báo cáo Facebook Ads.");
    } finally {
      setLoading(false);
    }
  }, [endDate, selectedAccount, startDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReport();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadReport]);

  const filteredRows = useMemo(() => {
    const keyword = productFilter.trim().toLowerCase();
    const productRows = keyword ? rows.filter((row) => row.productName.toLowerCase().includes(keyword)) : rows;
    const riskRows = riskOnly ? productRows.filter(isRiskRow) : productRows;

    return sortRows(riskRows, sortKey, sortDirection);
  }, [productFilter, riskOnly, rows, sortDirection, sortKey]);

  function applyLastDays(days: number) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    setStartDate(formatDateInput(start));
    setEndDate(formatDateInput(end));
  }

  function toggleSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "productName" ? "asc" : "desc");
  }

  async function saveKpi(row: ProductAdsPerformanceRow) {
    setSavingProduct(row.productName);
    setNotice("");

    const response = await fetch("/api/admin/meta/product-kpis", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productName: row.productName,
        kpiLeadsPerDay: row.kpiLeadsPerDay,
        targetCpl: row.targetCpl,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

    if (!response.ok || !payload?.ok) {
      setNotice(payload?.message ?? "Không lưu được KPI sản phẩm.");
    }

    setSavingProduct("");
  }

  function updateRow(productName: string, patch: Partial<ProductAdsPerformanceRow>) {
    setRows((currentRows) =>
      currentRows.map((row) => (row.productName === productName ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Facebook Ads</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Báo cáo sản phẩm
          </h1>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <a
            className="grid h-10 place-items-center rounded-md bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700"
            href="/api/admin/meta/connect/start"
          >
            Kết nối Facebook
          </a>
          <label className="grid gap-1 text-xs font-bold text-slate-500">
            Tài khoản quảng cáo
            <select
              className="h-10 min-w-52 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none"
              value={selectedAccount}
              onChange={(event) => setSelectedAccount(event.target.value)}
            >
              <option value="">{accounts.length > 0 ? "Tự chọn tài khoản" : "Chưa có tài khoản"}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name || account.id}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-500">
            Từ ngày
            <input
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-500">
            Đến ngày
            <input
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-500">
            Sản phẩm
            <input
              className="h-10 w-52 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="Lọc sản phẩm"
              type="search"
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
            />
          </label>
          <div className="flex h-10 items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
            {datePresets.map((preset) => (
              <button
                key={preset.days}
                className="h-8 rounded px-2 text-xs font-black text-slate-600 hover:bg-slate-100"
                type="button"
                onClick={() => applyLastDays(preset.days)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">
            <input
              className="size-4 accent-blue-600"
              type="checkbox"
              checked={riskOnly}
              onChange={(event) => setRiskOnly(event.target.checked)}
            />
            Chỉ cảnh báo
          </label>
          <button
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            type="button"
            disabled={loading}
            onClick={() => void loadReport()}
          >
            {loading ? "Đang sync" : "Sync"}
          </button>
        </div>
      </div>

      {notice ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {notice}
        </div>
      ) : null}

      {summary ? (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <SummaryItem label="Tổng chi" value={formatVnd(summary.adSpend)} />
          <SummaryItem label="DT phễu" value={formatVnd(summary.funnelRevenue)} />
          <SummaryItem
            label="ME/RE"
            value={formatPercent(summary.meRePercent)}
            tone={summary.meRePercent !== null && summary.meRePercent > 40 ? "warn" : "default"}
          />
          <SummaryItem label="Leads" value={formatNumber(summary.leads)} tone="good" />
          <SummaryItem
            label="CPL TT"
            value={formatVnd(summary.actualCostPerLead)}
            tone={summary.actualCostPerLead !== null && summary.actualCostPerLead > 150000 ? "warn" : "default"}
          />
          <SummaryItem label="Click" value={formatNumber(summary.clicks)} />
          <SummaryItem label="CVR LP" value={formatPercent(summary.cvrLpPercent)} />
          <p className="ml-auto text-xs font-semibold text-slate-500">
            Đang xem {filteredRows.length}/{rows.length} sản phẩm
          </p>
        </div>
      ) : null}

      <AdsRevenueCharts rows={filteredRows} />

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3">#</th>
              <th className="border-b border-slate-200 px-4 py-3">
                <SortButton label="Sản phẩm" sortColumn="productName" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="left" />
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right">
                <SortButton label="Chi phí QC" sortColumn="adSpend" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right">
                <SortButton label="DT phễu" sortColumn="funnelRevenue" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-center">
                <SortButton label="ME/RE" sortColumn="meRePercent" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="center" />
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-center">
                <SortButton label="Leads" sortColumn="leads" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="center" />
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right">
                <SortButton label="Lead TB/ngày" sortColumn="averageLeadsPerDay" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right">
                <SortButton label="KPI Lead/ngày" sortColumn="kpiLeadsPerDay" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right">
                <SortButton label="Giá Lead (KH)" sortColumn="targetCpl" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right">
                <SortButton label="Chi phí/Lead TT" sortColumn="actualCostPerLead" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right">
                <SortButton label="Click" sortColumn="clicks" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right">
                <SortButton label="CVR LP" sortColumn="cvrLpPercent" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, index) => (
                <tr key={row.productName} className="align-middle odd:bg-white even:bg-slate-50/40">
                  <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-400">{index + 1}</td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    <p className="max-w-[220px] text-sm font-black leading-5 text-slate-900">{row.productName}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Meta {row.metaLeads} · CRM {row.crmLeads}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-right font-black text-violet-700">
                    {formatVnd(row.adSpend)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-right font-semibold text-slate-700">
                    {formatVnd(row.funnelRevenue)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-center">
                    <span className={`inline-flex min-w-16 justify-center rounded px-2 py-1 font-black ${meReClass(row.meRePercent)}`}>
                      {formatPercent(row.meRePercent)}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-center">
                    <span className="inline-flex min-w-12 justify-center rounded bg-emerald-100 px-2 py-1 font-black text-emerald-700">
                      {formatNumber(row.leads)}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-right font-semibold text-slate-700">
                    {formatNumber(row.averageLeadsPerDay)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-right">
                    <input
                      className="h-8 w-20 rounded border border-slate-200 bg-white px-2 text-right text-sm font-bold text-slate-800 outline-none focus:border-blue-400"
                      inputMode="decimal"
                      value={row.kpiLeadsPerDay}
                      onBlur={() => void saveKpi(row)}
                      onChange={(event) =>
                        updateRow(row.productName, { kpiLeadsPerDay: Number(event.target.value || 0) })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        className="h-8 w-24 rounded border border-slate-200 bg-white px-2 text-right text-sm font-bold text-slate-800 outline-none focus:border-blue-400"
                        inputMode="numeric"
                        value={row.targetCpl}
                        onBlur={() => void saveKpi(row)}
                        onChange={(event) =>
                          updateRow(row.productName, { targetCpl: Number(event.target.value || 0) })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
                      />
                      <span className="text-xs font-bold text-slate-400">đ</span>
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-right">
                    <span className={`inline-flex min-w-24 justify-end rounded px-2 py-1 font-black ${costPerLeadClass(row)}`}>
                      {formatVnd(row.actualCostPerLead)}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-right font-semibold text-sky-700">
                    {formatNumber(row.clicks)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-right font-black text-violet-700">
                    {formatPercent(row.cvrLpPercent)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-sm font-semibold text-slate-500" colSpan={12}>
                  {loading ? "Đang tải báo cáo..." : "Chưa có dữ liệu trong khoảng ngày này."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {savingProduct ? <p className="mt-3 text-xs font-semibold text-slate-500">Đang lưu KPI: {savingProduct}</p> : null}
    </div>
  );
}
