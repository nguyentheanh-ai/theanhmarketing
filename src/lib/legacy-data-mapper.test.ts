import { describe, expect, it } from "vitest";

import { buildAdminDatasetFromLegacy } from "./legacy-data-mapper";

describe("legacy data mapper", () => {
  it("builds admin data from old courses, leads, and orders without demo rows", () => {
    const dataset = buildAdminDatasetFromLegacy({
      courses: [
        {
          id: "course-1",
          slug: "facebook-ads-2026",
          title: "Facebook Ads 2026",
          price: 399000,
          status: "open",
          lesson_count: 8,
        },
      ],
      leads: [
        {
          id: "lead-1",
          name: "An",
          phone: "0901",
          email: "an@example.com",
          message: "Muốn học Facebook Ads",
          source: "Website",
          created_at: "2026-05-24T02:00:00.000Z",
        },
      ],
      orders: [
        {
          id: "order-1",
          order_code: "TAM-001",
          student_name: "An",
          email: "an@example.com",
          phone: "0901",
          course_slug: "facebook-ads-2026",
          course_title: "Facebook Ads 2026",
          amount: 399000,
          status: "paid",
          payment_method: "sepay",
          created_at: "2026-05-24T02:00:00.000Z",
          paid_at: "2026-05-24T02:10:00.000Z",
        },
      ],
    });

    expect(dataset.courses).toHaveLength(1);
    expect(dataset.courses[0]).toMatchObject({
      id: "facebook-ads-2026",
      students: 1,
      lessons: 8,
      revenue: 399000,
    });
    expect(dataset.orders[0]).toMatchObject({
      transactionId: "TAM-001",
      paidAmount: 399000,
      status: "paid",
    });
    expect(dataset.leads.find((lead) => lead.orderCode === "TAM-001")?.paymentStatus).toBe("paid");
    expect(dataset.leads.some((lead) => lead.email.endsWith("@example.com"))).toBe(true);
  });

  it("merges checkout orders with duplicate lead forms into one CRM row per contact", () => {
    const dataset = buildAdminDatasetFromLegacy({
      leads: [
        {
          id: "lead-checkout-1",
          name: "Test",
          phone: "+84367928921",
          email: "test@example.com",
          message: "Muốn học",
          source: "LDP Facebook Ads Master 2026",
          created_at: "2026-05-24T11:16:21.897607+00:00",
        },
        {
          id: "lead-duplicated-older",
          name: "Đỗ hảo",
          phone: "0986124988",
          email: "hdo091188@gmail.com",
          message: "Trial cũ",
          source: "trial",
          created_at: "2026-05-15T08:04:10.144229+00:00",
        },
        {
          id: "lead-duplicated-newer",
          name: "Đỗ hảo",
          phone: "0986124988",
          email: "hdo091188@gmail.com",
          message: "Trial mới",
          source: "trial",
          created_at: "2026-05-15T08:57:34.065323+00:00",
        },
        {
          id: "lead-duplicated-same-note",
          name: "Đỗ hảo",
          phone: "0986124988",
          email: "hdo091188@gmail.com",
          message: "Trial mới",
          source: "trial",
          created_at: "2026-05-15T08:20:34.065323+00:00",
        },
      ],
      orders: [
        {
          id: "order-checkout-1",
          order_code: "TAMMPJOMDTUCWWSF",
          student_name: "Test",
          email: "test@example.com",
          phone: "+84367928921",
          course_slug: "facebook-ads-2026",
          course_title: "Quảng cáo Facebook Master 2026",
          amount: 399000,
          status: "pending",
          payment_method: "sepay",
          created_at: "2026-05-24T11:16:21.620532+00:00",
          paid_at: null,
        },
      ],
    });

    expect(dataset.leads).toHaveLength(2);
    expect(dataset.leads.find((lead) => lead.email === "test@example.com")).toMatchObject({
      id: "order:order-checkout-1",
      orderCode: "TAMMPJOMDTUCWWSF",
      courseName: "Quảng cáo Facebook Master 2026",
      careStatus: "waiting_payment",
    });
    const duplicatedLead = dataset.leads.find((lead) => lead.email === "hdo091188@gmail.com");
    expect(duplicatedLead).toMatchObject({
      id: "lead:lead-duplicated-newer",
    });
    expect(duplicatedLead?.notes).toContain("Trial mới");
    expect(duplicatedLead?.notes).toContain("Trial cũ");
    expect(duplicatedLead?.notes.match(/Trial mới/g)).toHaveLength(1);
  });

  it("returns empty arrays when there are no legacy rows", () => {
    const dataset = buildAdminDatasetFromLegacy({});

    expect(dataset.leads).toEqual([]);
    expect(dataset.courses).toEqual([]);
    expect(dataset.orders).toEqual([]);
    expect(dataset.clickEvents).toEqual([]);
  });
});
