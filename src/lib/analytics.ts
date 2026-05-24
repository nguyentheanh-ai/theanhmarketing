import type { AdminDataset, DashboardSummary } from "./types";

export function formatCurrencyVnd(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value)} VND`;
}

export function isSameUtcDate(isoDate: string | undefined, compareDate: Date) {
  if (!isoDate) {
    return false;
  }

  const current = new Date(isoDate);
  return (
    current.getUTCFullYear() === compareDate.getUTCFullYear() &&
    current.getUTCMonth() === compareDate.getUTCMonth() &&
    current.getUTCDate() === compareDate.getUTCDate()
  );
}

export function buildDashboardSummary(
  dataset: AdminDataset,
  now = new Date(),
): DashboardSummary {
  const totalRevenue = dataset.orders.reduce((sum, order) => sum + order.paidAmount, 0);
  const todayRevenue = dataset.orders
    .filter((order) => isSameUtcDate(order.createdAt, now))
    .reduce((sum, order) => sum + order.paidAmount, 0);

  const paidOrders = dataset.orders.filter((order) => order.status === "paid").length;
  const unpaidOrders = dataset.orders.filter((order) => order.status === "unpaid").length;
  const partialOrders = dataset.orders.filter((order) => order.status === "partial").length;

  return {
    totalRevenue,
    todayRevenue,
    totalStudents: dataset.courses.reduce((sum, course) => sum + course.students, 0),
    newStudentsToday: dataset.leads.filter(
      (lead) => lead.paymentStatus === "paid" && isSameUtcDate(lead.paidAt, now),
    ).length,
    totalCourses: dataset.courses.filter((course) => course.status === "active").length,
    totalLeads: dataset.leads.length,
    totalOrders: dataset.orders.length,
    totalLandingPageVisits: dataset.clickEvents.filter(
      (event) => event.eventType === "pricing_view" || event.eventType === "cta_click",
    ).length,
    totalConversions: dataset.clickEvents.filter((event) => event.eventType === "payment_success").length,
    paidOrders,
    unpaidOrders,
    partialOrders,
  };
}

export function calculateFunnelConversion({
  clicks,
  payments,
}: {
  clicks: number;
  payments: number;
}) {
  if (clicks <= 0) {
    return 0;
  }

  return Math.round((payments / clicks) * 1000) / 10;
}

export function calculateRemainingAmount(price: number, paidAmount: number) {
  return Math.max(price - paidAmount, 0);
}
