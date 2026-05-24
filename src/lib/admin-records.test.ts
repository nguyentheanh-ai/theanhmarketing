import { describe, expect, it } from "vitest";

import {
  addLeadRecord,
  addStudentEnrollment,
  buildLocalLeadRecord,
  buildLocalStudentEnrollment,
  deleteRecordFromDataset,
  getStudentLeads,
} from "./admin-records";
import type { AdminDataset, Course, Lead, Order } from "./types";

const now = new Date("2026-05-24T10:00:00.000Z");

const course: Course = {
  id: "facebook-ads-2026",
  title: "Facebook Ads 2026",
  price: 4_000_000,
  students: 3,
  lessons: 12,
  completionRate: 20,
  revenue: 12_000_000,
  status: "active",
};

const baseLead: Lead = {
  id: "lead:old",
  code: "LEAD-00001",
  orderCode: "",
  name: "Lead Cu",
  email: "lead@example.com",
  phone: "0900000000",
  courseId: "",
  courseName: "",
  landingPage: "",
  campaign: "",
  utmSource: "Website",
  paymentStatus: "unpaid",
  careStatus: "new",
  owner: "Admin",
  price: 0,
  paidAmount: 0,
  registeredAt: "2026-05-23T10:00:00.000Z",
  tags: ["Website"],
  notes: "",
};

const baseOrder: Order = {
  id: "order:old",
  leadId: "old",
  gateway: "Manual",
  amount: 4_000_000,
  paidAmount: 4_000_000,
  status: "paid",
  createdAt: "2026-05-23T10:00:00.000Z",
};

const dataset: AdminDataset = {
  leads: [baseLead],
  courses: [course],
  orders: [baseOrder],
  clickEvents: [],
};

describe("admin records", () => {
  it("creates a manual lead without granting course access", () => {
    const lead = buildLocalLeadRecord(
      {
        name: "Lead Moi",
        email: "new@example.com",
        phone: "0911111111",
        notes: "Can follow up",
        source: "admin-crm",
      },
      now,
    );

    expect(lead.id).toMatch(/^lead:local-/);
    expect(lead.paymentStatus).toBe("unpaid");
    expect(lead.careStatus).toBe("new");
    expect(lead.tags).toContain("admin-crm");
  });

  it("creates a student enrollment as paid and access granted for the selected course", () => {
    const enrollment = buildLocalStudentEnrollment(
      {
        name: "Hoc Vien Moi",
        email: "student@example.com",
        phone: "0922222222",
        courseId: course.id,
        notes: "Cap quyen ngay",
      },
      course,
      now,
    );

    expect(enrollment.lead.courseId).toBe(course.id);
    expect(enrollment.lead.courseName).toBe(course.title);
    expect(enrollment.lead.paymentStatus).toBe("paid");
    expect(enrollment.lead.careStatus).toBe("access_granted");
    expect(enrollment.lead.paidAmount).toBe(course.price);
    expect(enrollment.order.status).toBe("paid");
    expect(enrollment.order.amount).toBe(course.price);
  });

  it("adds students to the student view and removes only the requested record", () => {
    const lead = buildLocalLeadRecord({ name: "Lead Moi", email: "", phone: "0911111111" }, now);
    const enrollment = buildLocalStudentEnrollment(
      { name: "Hoc Vien Moi", email: "", phone: "0922222222", courseId: course.id },
      course,
      now,
    );

    const withLead = addLeadRecord(dataset, lead);
    const withStudent = addStudentEnrollment(withLead, enrollment.lead, enrollment.order);
    const studentLeads = getStudentLeads(withStudent.leads);

    expect(withStudent.leads).toHaveLength(3);
    expect(studentLeads.map((item) => item.id)).toContain(enrollment.lead.id);
    expect(withStudent.orders.map((item) => item.id)).toContain(enrollment.order.id);

    const afterDeleteLead = deleteRecordFromDataset(withStudent, lead.id);
    expect(afterDeleteLead.leads.map((item) => item.id)).not.toContain(lead.id);
    expect(afterDeleteLead.orders).toHaveLength(2);

    const afterDeleteStudent = deleteRecordFromDataset(afterDeleteLead, enrollment.lead.id);
    expect(afterDeleteStudent.leads.map((item) => item.id)).not.toContain(enrollment.lead.id);
    expect(afterDeleteStudent.orders.map((item) => item.id)).not.toContain(enrollment.order.id);
    expect(afterDeleteStudent.courses[0].students).toBe(course.students);
  });
});
