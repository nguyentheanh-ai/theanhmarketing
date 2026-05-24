import { NextResponse } from "next/server";

import { getLeadRecordKey } from "@/lib/admin-records";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import type { Lead, Order } from "@/lib/types";

type AdminRecordRequest =
  | { action: "create-lead"; lead: Lead }
  | { action: "create-student"; lead: Lead; order: Order }
  | { action: "delete-record"; leadId: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function writeAuditLog(action: string, targetTable: string, targetId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("activity_logs").insert({
    actor_name: "Admin",
    module: targetTable === "orders" ? "LMS" : "CRM",
    action,
    target_table: targetTable,
    target_id: isUuid(targetId) ? targetId : undefined,
    ip_address: undefined,
  });

  if (error) {
    console.warn(`[admin-records] Audit log skipped: ${error.message}`);
  }
}

async function createLead(lead: Lead) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("leads").insert({
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    message: lead.notes,
    source: lead.utmSource || lead.tags[0] || "admin-crm",
    created_at: lead.registeredAt || new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog("create_lead", "leads", getLeadRecordKey(lead.id));
}

async function createStudent(lead: Lead, order: Order) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("orders").insert({
    order_code: lead.orderCode || order.transactionId,
    student_name: lead.name,
    email: lead.email,
    phone: lead.phone,
    course_slug: lead.courseId,
    course_title: lead.courseName,
    amount: order.amount || lead.price,
    status: "paid",
    payment_method: "manual-admin",
    created_at: lead.registeredAt || new Date().toISOString(),
    paid_at: lead.paidAt || new Date().toISOString(),
    order_items: [
      {
        slug: lead.courseId,
        title: lead.courseName,
        price: lead.price,
      },
    ],
  });

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog("create_student_and_grant_course_access", "orders", getLeadRecordKey(lead.id));
}

async function deleteRecord(leadId: string) {
  const supabase = getSupabaseAdminClient();
  const targetTable = leadId.startsWith("order:") ? "orders" : "leads";
  const targetId = getLeadRecordKey(leadId);
  const { error } = await supabase.from(targetTable).delete().eq("id", targetId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog(targetTable === "orders" ? "delete_student_access" : "delete_lead", targetTable, targetId);
}

export async function POST(request: Request) {
  const body = (await request.json()) as AdminRecordRequest;

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    if (body.action === "create-lead") {
      await createLead(body.lead);
    } else if (body.action === "create-student") {
      await createStudent(body.lead, body.order);
    } else if (body.action === "delete-record") {
      await deleteRecord(body.leadId);
    } else {
      return NextResponse.json({ ok: false, message: "Unsupported action." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unknown admin record error." },
      { status: 500 },
    );
  }
}
