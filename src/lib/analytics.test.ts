import { describe, expect, it } from "vitest";

import {
  buildDashboardSummary,
  calculateFunnelConversion,
  formatCurrencyVnd,
} from "./analytics";
import type { AdminDataset } from "./types";

const dataset: AdminDataset = {
  leads: [
    {
      id: "lead_1",
      code: "LD-001",
      orderCode: "TAM-001",
      name: "Nguyen Van A",
      email: "a@example.com",
      phone: "0901000001",
      courseId: "course_ai_agent",
      courseName: "Tao AI Agent ca nhan X10",
      landingPage: "AI Agent X10",
      campaign: "FB Lead May",
      utmSource: "facebook",
      paymentStatus: "paid",
      careStatus: "paid",
      owner: "Sale 01",
      price: 99000,
      paidAmount: 99000,
      registeredAt: "2026-05-24T02:00:00.000Z",
      paidAt: "2026-05-24T02:20:00.000Z",
      tags: ["entry"],
      notes: "",
    },
    {
      id: "lead_2",
      code: "LD-002",
      orderCode: "TAM-002",
      name: "Tran Thi B",
      email: "b@example.com",
      phone: "0901000002",
      courseId: "course_performance_ai",
      courseName: "Performance Marketing With AI",
      landingPage: "Performance AI",
      campaign: "Zalo Retargeting",
      utmSource: "zalo",
      paymentStatus: "partial",
      careStatus: "consulting",
      owner: "Sale 02",
      price: 799000,
      paidAmount: 300000,
      registeredAt: "2026-05-23T08:00:00.000Z",
      paidAt: "2026-05-23T09:00:00.000Z",
      tags: ["mid-ticket"],
      notes: "",
    },
  ],
  courses: [
    {
      id: "course_ai_agent",
      title: "Tao AI Agent ca nhan X10",
      price: 99000,
      students: 1,
      lessons: 12,
      completionRate: 46,
      revenue: 99000,
      status: "active",
    },
    {
      id: "course_performance_ai",
      title: "Performance Marketing With AI",
      price: 799000,
      students: 1,
      lessons: 28,
      completionRate: 18,
      revenue: 300000,
      status: "active",
    },
  ],
  clickEvents: [
    {
      id: "clk_1",
      eventName: "Click dang ky",
      eventType: "cta_click",
      pageUrl: "/ai-agent-x10",
      landingPageId: "lp_ai_agent",
      createdAt: "2026-05-24T01:00:00.000Z",
      utmSource: "facebook",
      deviceType: "mobile",
    },
    {
      id: "clk_2",
      eventName: "Payment success",
      eventType: "payment_success",
      pageUrl: "/ai-agent-x10",
      landingPageId: "lp_ai_agent",
      createdAt: "2026-05-24T02:20:00.000Z",
      utmSource: "facebook",
      deviceType: "mobile",
    },
  ],
  orders: [
    {
      id: "order_1",
      leadId: "lead_1",
      gateway: "SePay",
      amount: 99000,
      paidAmount: 99000,
      status: "paid",
      createdAt: "2026-05-24T02:00:00.000Z",
    },
    {
      id: "order_2",
      leadId: "lead_2",
      gateway: "Bank transfer",
      amount: 799000,
      paidAmount: 300000,
      status: "partial",
      createdAt: "2026-05-23T08:00:00.000Z",
    },
  ],
};

describe("analytics helpers", () => {
  it("formats VND compactly for Vietnamese operators", () => {
    expect(formatCurrencyVnd(2199000)).toBe("2.199.000 VND");
  });

  it("builds dashboard totals without loading hidden assumptions", () => {
    const summary = buildDashboardSummary(dataset, new Date("2026-05-24T12:00:00.000Z"));

    expect(summary.totalRevenue).toBe(399000);
    expect(summary.todayRevenue).toBe(99000);
    expect(summary.totalLeads).toBe(2);
    expect(summary.paidOrders).toBe(1);
    expect(summary.unpaidOrders).toBe(0);
    expect(summary.partialOrders).toBe(1);
    expect(summary.newStudentsToday).toBe(1);
  });

  it("calculates click to payment conversion as a percentage", () => {
    expect(calculateFunnelConversion({ clicks: 250, payments: 25 })).toBe(10);
    expect(calculateFunnelConversion({ clicks: 0, payments: 25 })).toBe(0);
  });
});
