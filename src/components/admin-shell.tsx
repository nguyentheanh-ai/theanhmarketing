"use client";

import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Menu,
  MousePointerClick,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState } from "react";

import { KpiCard } from "@/components/kpi-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { VirtualizedLeadsTable } from "@/components/virtualized-leads-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildDashboardSummary, calculateFunnelConversion, formatCurrencyVnd } from "@/lib/analytics";
import { emptyAdminDataset } from "@/lib/empty-dataset";
import { legacyBrandAssets, legacyFacebookPixelContract } from "@/lib/legacy-contracts";
import { useWorkspaceStore } from "@/lib/store";
import type { AdminDataset } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isWorkspaceTab, workspaceNavigation, workspaceTabs, type WorkspaceTab } from "@/lib/workspace-navigation";

const RevenueChart = dynamic(() => import("@/components/charts").then((module) => module.RevenueChart), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full rounded-lg bg-white/[0.03]" />,
});

const CampaignChart = dynamic(() => import("@/components/charts").then((module) => module.CampaignChart), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full rounded-lg bg-white/[0.03]" />,
});

const navigationIcons: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  crm: Users,
  students: GraduationCap,
  courses: BookOpen,
  automation: Workflow,
  events: MousePointerClick,
  payments: CreditCard,
  reports: ChartNoAxesCombined,
  logs: ShieldCheck,
  settings: Settings,
};

const navigation = workspaceNavigation.map((item) => ({
  ...item,
  icon: navigationIcons[item.id] ?? LayoutDashboard,
}));

function SidebarContent({
  activeTab,
  onTabChange,
}: {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}) {
  const { sidebarCollapsed, setSidebarCollapsed } = useWorkspaceStore();

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 border-r border-white/10 bg-[#080c14]/90 backdrop-blur-xl transition-all lg:sticky lg:top-0 lg:flex lg:flex-col",
        sidebarCollapsed ? "w-[78px]" : "w-[268px]",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center overflow-hidden rounded-lg border border-sky-300/20 bg-white",
              sidebarCollapsed ? "size-9" : "h-10 w-[72px]",
            )}
          >
            <Image
              alt="The Anh Marketing"
              height={sidebarCollapsed ? 28 : 41}
              priority
              src={sidebarCollapsed ? legacyBrandAssets.mark : legacyBrandAssets.logo}
              unoptimized
              width={sidebarCollapsed ? 28 : 72}
            />
          </div>
          {!sidebarCollapsed ? (
            <div>
              <p className="text-sm font-semibold leading-none">The Anh Marketing</p>
              <p className="mt-1 text-xs text-muted-foreground">AI Growth OS</p>
            </div>
          ) : null}
        </div>
        <Button
          aria-label="Thu gọn sidebar"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          size="icon-sm"
          variant="ghost"
        >
          {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>
      {!sidebarCollapsed ? (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 pl-8" placeholder="Tìm module..." />
          </div>
        </div>
      ) : null}
      <nav className="grid gap-1 px-3 py-2">
        {navigation.map((item) => {
          const isActive = item.tab === activeTab;
          return (
          <Button
            aria-label={sidebarCollapsed ? item.label : undefined}
            className={cn(
              "justify-start gap-3 text-muted-foreground",
              sidebarCollapsed && "justify-center px-0",
              isActive && "border-sky-300/20 bg-sky-300/10 text-sky-100 shadow-[0_0_30px_rgba(56,189,248,0.08)]",
            )}
            data-active={isActive}
            key={item.label}
            onClick={() => onTabChange(item.tab)}
            size="lg"
            type="button"
            variant="ghost"
          >
            <item.icon className="size-4" />
            {!sidebarCollapsed ? <span>{item.label}</span> : null}
          </Button>
          );
        })}
      </nav>
      <div className="mt-auto p-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-amber-200" />
            {!sidebarCollapsed ? <p className="text-xs font-medium">AI Operator</p> : null}
          </div>
          {!sidebarCollapsed ? (
            <p className="mt-2 text-xs text-muted-foreground">Theo dõi lead nóng, thanh toán và automation realtime.</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function MobileNav({
  activeTab,
  onTabChange,
}: {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="lg:hidden" size="icon-sm" variant="outline">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className="border-white/10 bg-[#080c14]" side="left">
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="flex h-10 w-[72px] items-center justify-center overflow-hidden rounded-lg border border-sky-300/20 bg-white">
            <Image alt="The Anh Marketing" height={41} priority src={legacyBrandAssets.logo} unoptimized width={72} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">The Anh Marketing</p>
            <p className="mt-1 text-xs text-muted-foreground">AI Growth OS</p>
          </div>
        </div>
        <nav className="mt-4 grid gap-1 px-3">
          {navigation.map((item) => {
            const isActive = item.tab === activeTab;
            return (
            <Button
              className={cn(
                "justify-start gap-3 text-muted-foreground",
                isActive && "border-sky-300/20 bg-sky-300/10 text-sky-100",
              )}
              data-active={isActive}
              key={item.label}
              onClick={() => {
                onTabChange(item.tab);
                setOpen(false);
              }}
              type="button"
              variant="ghost"
            >
              <item.icon className="size-4" />
              {item.label}
            </Button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function Topbar({
  activeTab,
  onTabChange,
}: {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}) {
  const activeLabel = workspaceTabs.find((tab) => tab.value === activeTab)?.label ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]/84 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <MobileNav activeTab={activeTab} onTabChange={onTabChange} />
        <div className="hidden text-sm text-muted-foreground md:block">Admin / Growth OS / {activeLabel}</div>
        <div className="relative ml-auto hidden w-full max-w-md md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-8 pl-8" placeholder="Tìm lead, đơn hàng, học viên, campaign..." />
        </div>
        <Button size="sm" variant="outline">
          <Sparkles />
          Tạo nhanh
        </Button>
        <Button aria-label="Thông báo" className="relative" size="icon-sm" variant="outline">
          <Bell />
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-300" />
        </Button>
        <ThemeToggle />
        <Avatar className="size-8 border border-white/10">
          <AvatarFallback>TA</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-white/12 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function KpiGrid({ dataset }: { dataset: AdminDataset }) {
  const summary = useMemo(() => buildDashboardSummary(dataset, new Date()), [dataset]);
  const clickConversion = calculateFunnelConversion({
    clicks: summary.totalLandingPageVisits,
    payments: summary.totalConversions,
  });

  const cards = [
    {
      label: "Tổng doanh thu",
      value: formatCurrencyVnd(summary.totalRevenue),
      trend: 18,
      tone: "blue" as const,
      icon: Gauge,
      sparkline: [36, 42, 50, 49, 63, 72, 79],
    },
    {
      label: "Doanh thu hôm nay",
      value: formatCurrencyVnd(summary.todayRevenue),
      trend: 12,
      tone: "gold" as const,
      icon: CreditCard,
      sparkline: [8, 12, 14, 16, 15, 18, 23],
    },
    {
      label: "Tổng học viên",
      value: summary.totalStudents.toLocaleString("vi-VN"),
      trend: 9,
      tone: "emerald" as const,
      icon: GraduationCap,
      sparkline: [42, 44, 46, 48, 54, 57, 62],
    },
    {
      label: "Lead CRM",
      value: summary.totalLeads.toLocaleString("vi-VN"),
      trend: 21,
      tone: "graphite" as const,
      icon: Users,
      sparkline: [18, 28, 32, 38, 41, 43, 49],
    },
    {
      label: "Khóa học active",
      value: summary.totalCourses.toString(),
      trend: 0,
      tone: "blue" as const,
      icon: BookOpen,
      sparkline: [9, 9, 9, 9, 9, 9, 9],
    },
    {
      label: "Đơn thành công",
      value: summary.paidOrders.toLocaleString("vi-VN"),
      trend: 14,
      tone: "emerald" as const,
      icon: Activity,
      sparkline: [12, 16, 19, 21, 27, 31, 38],
    },
    {
      label: "Đơn chưa thu đủ",
      value: summary.partialOrders.toLocaleString("vi-VN"),
      trend: -6,
      tone: "red" as const,
      icon: CreditCard,
      sparkline: [28, 26, 25, 24, 21, 20, 18],
    },
    {
      label: "Click → Payment",
      value: `${clickConversion}%`,
      trend: 4,
      tone: "gold" as const,
      icon: MousePointerClick,
      sparkline: [5, 6, 7, 7, 8, 9, 10],
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}

function DashboardOverview({ dataset }: { dataset: AdminDataset }) {
  return (
    <div className="grid gap-4">
      <KpiGrid dataset={dataset} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.8fr)]">
        <Card className="border-white/10 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Revenue chart</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Doanh thu theo mốc thời gian và target tháng 5</p>
            </div>
            <Badge className="border-sky-300/20 bg-sky-300/10 text-sky-200" variant="outline">
              Realtime
            </Badge>
          </CardHeader>
          <CardContent>
            {(dataset.revenueSeries ?? []).length > 0 ? (
              <RevenueChart data={dataset.revenueSeries ?? []} />
            ) : (
              <EmptyState message="Chưa có dữ liệu doanh thu thật từ Supabase." />
            )}
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-card/70">
          <CardHeader>
            <CardTitle>Campaign performance</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Lead theo nguồn traffic</p>
          </CardHeader>
          <CardContent>
            {(dataset.campaignSeries ?? []).length > 0 ? (
              <CampaignChart data={dataset.campaignSeries ?? []} />
            ) : (
              <EmptyState message="Chưa có dữ liệu campaign thật từ leads/orders." />
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Card className="border-white/10 bg-card/70">
          <CardHeader>
            <CardTitle>Lead CRM</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Lead mới, chăm sóc, thanh toán và phân bổ sale trong ngày</p>
          </CardHeader>
          <CardContent>
            <VirtualizedLeadsTable leads={dataset.leads} />
          </CardContent>
        </Card>
        <RealtimePanel dataset={dataset} />
      </div>
    </div>
  );
}

function RealtimePanel({ dataset }: { dataset: AdminDataset }) {
  const events = dataset.clickEvents.slice(0, 8);

  return (
    <Card className="border-white/10 bg-card/70">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Realtime stream</CardTitle>
          <span className="flex items-center gap-2 text-xs text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
            Live
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {events.length > 0 ? events.map((event) => (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3" key={event.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{event.eventName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{event.pageUrl} · {event.utmSource}</p>
              </div>
              <Badge variant="outline">{event.deviceType}</Badge>
            </div>
          </div>
        )) : <EmptyState message="Chưa có click event thật. Sau khi gắn tracking, stream sẽ hiện ở đây." />}
      </CardContent>
    </Card>
  );
}

function CourseGrid({ dataset }: { dataset: AdminDataset }) {
  if (dataset.courses.length === 0) {
    return <EmptyState message="Chưa đọc được khóa học thật từ Supabase." />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {dataset.courses.map((course) => (
        <Card className="border-white/10 bg-card/70" key={course.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base leading-6">{course.title}</CardTitle>
              <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300" variant="outline">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Học viên</p>
                <p className="mt-1 font-mono">{course.students}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bài học</p>
                <p className="mt-1 font-mono">{course.lessons}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="mt-1 font-mono">{Math.round(course.revenue / 1000000)}tr</p>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Completion</span>
                <span>{course.completionRate}%</span>
              </div>
              <Progress className="[&_[data-slot=progress-indicator]]:bg-sky-300" value={course.completionRate} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AutomationBoard({ dataset }: { dataset: AdminDataset }) {
  const flows = dataset.automationFlows ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card className="border-white/10 bg-card/70">
        <CardHeader>
          <CardTitle>Email automation</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Welcome, nhắc thanh toán, kích hoạt học và upsell sau hoàn thành</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {["Lead mới", "Delay 1 ngày", "Nếu chưa thanh toán", "Gửi reminder"].map((node, index) => (
              <div className="relative rounded-lg border border-white/10 bg-white/[0.03] p-4" key={node}>
                <div className="flex size-9 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200">
                  {index === 0 ? <MousePointerClick /> : index === 1 ? <Activity /> : index === 2 ? <Gauge /> : <Megaphone />}
                </div>
                <p className="mt-4 text-sm font-medium">{node}</p>
                <p className="mt-1 text-xs text-muted-foreground">Đang chạy</p>
                {index < 3 ? <div className="absolute right-[-18px] top-1/2 hidden h-px w-9 bg-sky-300/30 md:block" /> : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {flows.length > 0 ? flows.map((flow) => (
          <Card className="border-white/10 bg-card/70" key={flow.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{flow.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{flow.trigger}</p>
                </div>
                <Badge
                  className={flow.status === "active" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : ""}
                  variant="outline"
                >
                  {flow.status}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Audience</p>
                  <p className="mt-1 font-mono text-sm">{flow.audience}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Open</p>
                  <p className="mt-1 font-mono text-sm">{flow.openRate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Click</p>
                  <p className="mt-1 font-mono text-sm">{flow.clickRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : <EmptyState message="Chưa có automation flow thật. Bảng automation mới sẽ hiện sau khi migration chạy." />}
      </div>
    </div>
  );
}

function AuditLogs({ dataset }: { dataset: AdminDataset }) {
  const logs = dataset.activityLogs ?? [];

  return (
    <Card className="border-white/10 bg-card/70">
      <CardHeader>
        <CardTitle>Activity logs</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Before/after, actor, IP và module liên quan</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        {logs.length > 0 ? logs.map((log) => (
          <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[180px_1fr_180px]" key={log.id}>
            <div>
              <p className="text-sm font-medium">{log.actor}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            <div>
              <Badge variant="outline">{log.module}</Badge>
              <p className="mt-2 text-sm">{log.action}</p>
              <p className="mt-1 text-xs text-muted-foreground">{log.target}</p>
              {log.before || log.after ? (
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                  <div className="rounded-md bg-red-400/10 p-2 text-red-200">Trước: {log.before || "empty"}</div>
                  <div className="rounded-md bg-emerald-400/10 p-2 text-emerald-200">Sau: {log.after || "empty"}</div>
                </div>
              ) : null}
            </div>
            <div className="font-mono text-xs text-muted-foreground">{log.ipAddress}</div>
          </div>
        )) : <EmptyState message="Chưa có audit log thật. Khi admin thao tác dữ liệu, log sẽ ghi tại đây." />}
      </CardContent>
    </Card>
  );
}

function ClickEventsPanel({ dataset }: { dataset: AdminDataset }) {
  const events = dataset.clickEvents ?? [];
  const conversion = calculateFunnelConversion({
    clicks: events.length,
    payments: events.filter((event) => event.eventType === "payment_success").length,
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border-white/10 bg-card/70">
        <CardHeader>
          <CardTitle>Click events tracking</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            CTA, form submit, checkout và payment events được stream theo phiên truy cập.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3">
          {events.length > 0 ? events.map((event) => (
            <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1fr_160px_160px] md:items-center" key={event.id}>
              <div>
                <p className="text-sm font-medium">{event.eventName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{event.pageUrl}</p>
              </div>
              <Badge variant="outline">{event.utmSource ?? "direct"}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("vi-VN")}</span>
            </div>
          )) : <EmptyState message="Chưa có click event thật từ Supabase. Tracking sẽ ghi vào bảng click_events khi migration được áp dụng." />}
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-card/70">
        <CardHeader>
          <CardTitle>CTA analytics</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Click đến thanh toán</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-xs text-emerald-100">Conversion</p>
            <p className="mt-2 text-3xl font-semibold text-white">{conversion}%</p>
          </div>
          <div className="grid gap-3">
            {events.length > 0 ? events.slice(0, 4).map((event) => (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3" key={`cta-${event.id}`}>
                <p className="text-sm font-medium">{event.eventName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{event.utmSource ?? "direct"} · {event.deviceType ?? "unknown"}</p>
              </div>
            )) : <EmptyState message="Chưa có CTA click thật." />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsPanel({ dataset }: { dataset: AdminDataset }) {
  const orders = dataset.orders ?? [];

  return (
    <Card className="border-white/10 bg-card/70">
      <CardHeader>
        <CardTitle>Payment management</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Theo dõi SePay, chuyển khoản, thanh toán thiếu và đối soát thủ công.</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {orders.length > 0 ? orders.map((order) => (
          <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1fr_160px_160px_140px] md:items-center" key={order.id}>
            <div>
              <p className="text-sm font-medium">{order.gateway}</p>
              <p className="mt-1 text-xs text-muted-foreground">{order.transactionId ?? order.id}</p>
            </div>
            <span className="font-mono text-sm">{formatCurrencyVnd(order.amount)}</span>
            <span className="font-mono text-sm">{formatCurrencyVnd(order.paidAmount)}</span>
            <Badge
              className={order.status === "paid" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : ""}
              variant="outline"
            >
              {order.status}
            </Badge>
          </div>
        )) : <EmptyState message="Chưa có order thật từ Supabase hoặc app chưa được nối env cũ." />}
      </CardContent>
    </Card>
  );
}

function ReportsPanel({ dataset }: { dataset: AdminDataset }) {
  const revenueSeries = dataset.revenueSeries ?? [];
  const campaignSeries = dataset.campaignSeries ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="border-white/10 bg-card/70">
        <CardHeader>
          <CardTitle>Revenue report</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Doanh thu theo ngày, không load toàn bộ đơn cùng lúc.</p>
        </CardHeader>
        <CardContent>
          {revenueSeries.length > 0 ? (
            <RevenueChart data={revenueSeries} />
          ) : (
            <EmptyState message="Chưa có doanh thu thật để vẽ báo cáo." />
          )}
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-card/70">
        <CardHeader>
          <CardTitle>Campaign report</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Lead, payment và CTR theo nguồn traffic.</p>
        </CardHeader>
        <CardContent>
          {campaignSeries.length > 0 ? (
            <CampaignChart data={campaignSeries} />
          ) : (
            <EmptyState message="Chưa có dữ liệu campaign thật để vẽ báo cáo." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPanel() {
  const pixelFields = legacyFacebookPixelContract.jsonFields.join(", ");

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="border-white/10 bg-card/70">
        <CardHeader>
          <CardTitle>Data preservation</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin mới đọc tiếp dữ liệu cũ; migration chỉ thêm bảng phụ cho analytics và automation.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3">
          {[
            ["Khóa học", "Giữ bảng courses, course_modules, lessons và numeric price hiện có."],
            ["Học viên", "Giữ rule cũ: paid orders + lead source admin-student:* để xác định quyền học."],
            ["Facebook Pixel", `Giữ ${legacyFacebookPixelContract.table}.${legacyFacebookPixelContract.key}: ${pixelFields}.`],
            ["Thanh toán", "Giữ orders, order_code, order_items, paid_at và trạng thái paid/pending."],
          ].map(([label, detail]) => (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4" key={label}>
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-card/70">
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Logo đang dùng asset chính từ website theanhmarketing.com.</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg bg-white">
              <Image alt="The Anh Marketing" height={63} src={legacyBrandAssets.logo} unoptimized width={112} />
            </div>
            <div>
              <p className="text-sm font-medium">The Anh Marketing</p>
              <p className="mt-1 text-xs text-muted-foreground">public/brand/ta-logo.svg</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminShell({ dataset = emptyAdminDataset }: { dataset?: AdminDataset }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  function handleTabChange(value: string) {
    if (isWorkspaceTab(value)) {
      setActiveTab(value);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-foreground">
      <div className="flex min-h-screen">
        <SidebarContent activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="min-w-0 flex-1">
          <Topbar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="mx-auto grid w-full max-w-[1720px] gap-5 px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="border-sky-300/20 bg-sky-300/10 text-sky-200" variant="outline">
                    Growth OS
                  </Badge>
                  <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100" variant="outline">
                    Realtime
                  </Badge>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-normal text-white md:text-3xl">
                  CRM + LMS + Marketing Automation
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Vận hành lead, học viên, khóa học, thanh toán, tracking và automation trong một hệ Growth OS.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Activity />
                  Đồng bộ
                </Button>
                <Button>
                  <Sparkles />
                  Tạo campaign
                </Button>
              </div>
            </div>

            <Tabs className="grid gap-4" onValueChange={handleTabChange} value={activeTab}>
              <TabsList className="w-full justify-start overflow-x-auto">
                {workspaceTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="overview">
                <DashboardOverview dataset={dataset} />
              </TabsContent>
              <TabsContent value="crm">
                <Card className="border-white/10 bg-card/70">
                  <CardHeader>
                    <CardTitle>Lead CRM management</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {dataset.leads.length.toLocaleString("vi-VN")} lead thật từ Supabase và website cũ
                    </p>
                  </CardHeader>
                  <CardContent>
                    <VirtualizedLeadsTable leads={dataset.leads} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="lms">
                <CourseGrid dataset={dataset} />
              </TabsContent>
              <TabsContent value="automation">
                <AutomationBoard dataset={dataset} />
              </TabsContent>
              <TabsContent value="events">
                <ClickEventsPanel dataset={dataset} />
              </TabsContent>
              <TabsContent value="payments">
                <PaymentsPanel dataset={dataset} />
              </TabsContent>
              <TabsContent value="reports">
                <ReportsPanel dataset={dataset} />
              </TabsContent>
              <TabsContent value="logs">
                <AuditLogs dataset={dataset} />
              </TabsContent>
              <TabsContent value="settings">
                <SettingsPanel />
              </TabsContent>
            </Tabs>
            <Separator className="bg-white/10" />
            <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-4">
              <span>Facebook / TikTok / YouTube</span>
              <span>Zalo / Website / Email</span>
              <span>SePay / Bank transfer / Momo</span>
              <span>Attract / Grow / Scale / CRM/Data</span>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
