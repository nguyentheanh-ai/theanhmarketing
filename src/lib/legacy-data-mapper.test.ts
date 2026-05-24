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

  it("returns empty arrays when there are no legacy rows", () => {
    const dataset = buildAdminDatasetFromLegacy({});

    expect(dataset.leads).toEqual([]);
    expect(dataset.courses).toEqual([]);
    expect(dataset.orders).toEqual([]);
    expect(dataset.clickEvents).toEqual([]);
  });
});
