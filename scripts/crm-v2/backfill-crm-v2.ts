import type { SupabaseClient } from "@supabase/supabase-js";
import { countRows, fetchPaged, getSupabaseAdminClient, maskLead, parseScriptOptions, printJson } from "./shared";
import { normalizeEmail, normalizePhone } from "../../lib/crm-v2/normalize";

type LegacyRow = Record<string, unknown>;

type BackfillCounters = {
  contactsUpserted: number;
  leadsUpserted: number;
  orderLeadsUpserted: number;
  ordersUpserted: number;
  paymentsUpserted: number;
  enrollmentsUpserted: number;
  emailSendsUpserted: number;
  emailEventsUpserted: number;
  notesUpserted: number;
  leadActivityEventsUpserted: number;
  activityLogEventsUpserted: number;
  leadNoteEventsUpserted: number;
  crmEventsUpserted: number;
};

type SourceCounts = {
  leads: number;
  orders: number;
  lead_activities: number;
  activity_logs: number;
  lead_notes: number;
  email_logs: number;
  lead_email_logs: number;
};

const leadSelect = "id,name,email,phone,source,status,sale_status,message,created_at,updated_at";
const orderSelect =
  "id,lead_id,order_code,student_name,email,phone,course_slug,course_title,amount,currency,status,payment_status,payment_method,paid_at,expires_at,created_at,updated_at,sepay_reference_code,sepay_transaction_id,order_items,utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,fbc,fbp,landing_page";
const orderFallbackSelect =
  "id,lead_id,order_code,student_name,email,phone,course_slug,course_title,amount,currency,status,payment_method,paid_at,expires_at,created_at,updated_at,sepay_reference_code";
const emailLogSelect =
  "id,lead_id,email,subject,template_key,resend_email_id,status,error_message,sent_at,delivered_at,opened_at,clicked_at,created_at,updated_at";
const leadEmailLogSelect = "id,lead_id,order_code,email,template,status,error_message,created_at";
const leadActivitySelect =
  "id,lead_id,actor_email,actor_name,activity_type,title,description,old_value,new_value,metadata,created_at";
const leadNoteSelect = "id,lead_id,content,note_type,created_by_email,updated_by_email,created_at,updated_at";
const activityLogSelect =
  "id,student_id,lead_id,user_id,student_email,student_phone,event_type,event_title,event_description,status,actor_type,actor_id,actor_email,actor_name,metadata,ip_address,user_agent,created_at";

async function main() {
  const options = parseScriptOptions();
  const client = getSupabaseAdminClient({ requireLive: options.requireLive || options.apply });

  if (!client) {
    printJson({
      ok: true,
      dryRun: true,
      mode: "offline",
      message: "No Supabase env found. This dry-run did not inspect production data.",
    });
    return;
  }

  const legacyLeads = await fetchPaged(client, "public", "leads", leadSelect);
  const legacyOrders = await fetchOrders(client);
  const legacyEmailLogs = await fetchOptionalPaged(client, "public", "email_logs", emailLogSelect);
  const legacyLeadEmailLogs = await fetchOptionalPaged(client, "public", "lead_email_logs", leadEmailLogSelect);
  const legacyLeadActivities = await fetchOptionalPaged(client, "public", "lead_activities", leadActivitySelect);
  const legacyActivityLogs = await fetchOptionalPaged(client, "public", "activity_logs", activityLogSelect);
  const legacyLeadNotes = await fetchOptionalPaged(client, "public", "lead_notes", leadNoteSelect);
  const sourceCounts: SourceCounts = {
    leads: await countRows(client, "public", "leads"),
    orders: await countRows(client, "public", "orders"),
    lead_activities: legacyLeadActivities.length,
    activity_logs: legacyActivityLogs.length,
    lead_notes: legacyLeadNotes.length,
    email_logs: legacyEmailLogs.length,
    lead_email_logs: legacyLeadEmailLogs.length,
  };
  const targetCountsBefore = await getTargetCounts(client);
  const preview = {
    leads: legacyLeads.slice(0, 5).map(maskLead),
    orders: legacyOrders.slice(0, 5).map(maskLead),
    lead_activities: legacyLeadActivities.slice(0, 5).map(maskLegacyTimelineRow),
    activity_logs: legacyActivityLogs.slice(0, 5).map(maskLegacyTimelineRow),
    lead_notes: legacyLeadNotes.slice(0, 5).map(maskLegacyTimelineRow),
    email_logs: legacyEmailLogs.slice(0, 5).map(maskLead),
    lead_email_logs: legacyLeadEmailLogs.slice(0, 5).map(maskLead),
  };
  const expectedEnrollmentRows = legacyOrders.filter((order) => isPaid(order) && splitCourseSlugs(text(order.course_slug)).length > 0).length;

  if (!options.apply) {
    printJson({
      ok: true,
      dryRun: true,
      sourceCounts,
      expectedEnrollmentRows,
      targetCountsBefore,
      preview,
      message: "Dry-run only. Re-run with --apply to write crm_v2 rows.",
    });
    return;
  }

  const { data: run, error: runError } = await client
    .schema("crm_v2")
    .from("migration_runs")
    .insert({
      run_label: options.runLabel,
      script_name: "backfill-crm-v2.ts",
      dry_run: false,
      status: "running",
      source_counts: { ...sourceCounts, expectedEnrollmentRows },
      target_counts_before: targetCountsBefore,
    })
    .select("id")
    .single();

  if (runError || !run) throw new Error(runError?.message ?? "Cannot create migration run.");

  const counters: BackfillCounters = {
    contactsUpserted: 0,
    leadsUpserted: 0,
    orderLeadsUpserted: 0,
    ordersUpserted: 0,
    paymentsUpserted: 0,
    enrollmentsUpserted: 0,
    emailSendsUpserted: 0,
    emailEventsUpserted: 0,
    notesUpserted: 0,
    leadActivityEventsUpserted: 0,
    activityLogEventsUpserted: 0,
    leadNoteEventsUpserted: 0,
    crmEventsUpserted: 0,
  };

  try {
    for (const lead of legacyLeads) {
      await backfillLead(client, run.id as string, lead, counters);
    }

    for (const order of legacyOrders) {
      await backfillOrder(client, run.id as string, order, counters);
    }

    for (const leadActivity of legacyLeadActivities) {
      await backfillLeadActivity(client, run.id as string, leadActivity, counters);
    }

    for (const activityLog of legacyActivityLogs) {
      await backfillActivityLog(client, run.id as string, activityLog, counters);
    }

    for (const leadNote of legacyLeadNotes) {
      await backfillLeadNote(client, run.id as string, leadNote, counters);
    }

    for (const emailLog of legacyEmailLogs) {
      await backfillEmailLog(client, run.id as string, "public.email_logs", emailLog, counters);
    }

    for (const leadEmailLog of legacyLeadEmailLogs) {
      await backfillEmailLog(client, run.id as string, "public.lead_email_logs", leadEmailLog, counters);
    }

    const targetCountsAfter = await getTargetCounts(client);
    const missingMappings = await getMissingMappings(client, sourceCounts, expectedEnrollmentRows);
    const duplicateCounts = await getDuplicateCounts(client);
    const driftDetected = Object.values(missingMappings).some((value) => value > 0) || Object.values(duplicateCounts).some((value) => value > 0);

    await client
      .schema("crm_v2")
      .from("migration_runs")
      .update({
        status: driftDetected ? "failed" : "success",
        target_counts_after: targetCountsAfter,
        duplicate_counts: duplicateCounts,
        missing_mappings: missingMappings,
        drift_detected: driftDetected,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    const result = {
      ok: !driftDetected,
      dryRun: false,
      runId: run.id,
      sourceCounts,
      expectedEnrollmentRows,
      targetCountsBefore,
      targetCountsAfter,
      duplicateCounts,
      missingMappings,
      ...counters,
    };

    printJson(result);
    if (driftDetected) process.exit(1);
  } catch (error) {
    await client
      .schema("crm_v2")
      .from("migration_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw error;
  }
}

async function fetchOrders(client: SupabaseClient) {
  try {
    return await fetchPaged(client, "public", "orders", orderSelect);
  } catch {
    return fetchPaged(client, "public", "orders", orderFallbackSelect);
  }
}

async function fetchOptionalPaged(client: SupabaseClient, schema: string, table: string, columns: string) {
  try {
    return await fetchPaged(client, schema, table, columns);
  } catch {
    return [];
  }
}

async function backfillLead(client: SupabaseClient, runId: string, lead: LegacyRow, counters: BackfillCounters) {
  const sourceId = requiredSourceId(lead);
  const contactId = await upsertContact(client, runId, "public.leads", sourceId, {
    fullName: text(lead.name),
    email: text(lead.email),
    phone: text(lead.phone),
    source: text(lead.source) || "legacy_lead",
    lifecycleStage: isLeadPaid(lead) ? "student" : "lead",
    metadata: {
      legacy_table: "public.leads",
      legacy_id: sourceId,
      message: text(lead.message) || null,
    },
  });
  counters.contactsUpserted += 1;

  const mappedLeadId = await getMappedTargetId(client, "public.leads", sourceId, "crm_v2.leads");
  const leadPayload = {
    contact_id: contactId,
    stage: mapStage(text(lead.status), text(lead.sale_status)),
    status: isLeadPaid(lead) ? "won" : "open",
    source: text(lead.source) || "legacy_lead",
    lead_score: 0,
    metadata: { legacy_table: "public.leads", legacy_id: sourceId, message: text(lead.message) || null },
    created_at: text(lead.created_at) || new Date().toISOString(),
    updated_at: text(lead.updated_at) || new Date().toISOString(),
  };

  const crmLeadId = mappedLeadId
    ? await updateMappedRow(client, "leads", mappedLeadId, leadPayload)
    : await insertMappedRow(client, "leads", leadPayload);

  await upsertLegacyMap(client, runId, "public.leads", sourceId, "crm_v2.leads", crmLeadId);
  await upsertCrmEvent(client, {
    contactId,
    leadId: crmLeadId,
    eventType: "lead_created",
    sourceTable: "public.leads",
    sourceId,
    occurredAt: text(lead.created_at) || new Date().toISOString(),
    metadata: { source: text(lead.source) || null, sale_status: text(lead.sale_status) || null },
  });
  counters.leadsUpserted += 1;
  counters.crmEventsUpserted += 1;
}

async function backfillOrder(client: SupabaseClient, runId: string, order: LegacyRow, counters: BackfillCounters) {
  const sourceId = requiredSourceId(order);
  const orderCode = text(order.order_code) || sourceId;
  const amount = numberValue(order.amount);
  const contactId = await upsertContact(client, runId, "public.orders", sourceId, {
    fullName: text(order.student_name),
    email: text(order.email),
    phone: text(order.phone),
    source: "legacy_order",
    lifecycleStage: isPaid(order) ? "student" : "lead",
    metadata: {
      legacy_table: "public.orders",
      legacy_id: sourceId,
      order_code: orderCode,
    },
  });
  counters.contactsUpserted += 1;

  const crmLeadId = await resolveOrderLead(client, runId, order, contactId, counters);
  const mappedOrderId = await getMappedTargetId(client, "public.orders", sourceId, "crm_v2.orders");
  const orderPayload = {
    contact_id: contactId,
    lead_id: crmLeadId,
    order_code: orderCode,
    product_name: text(order.course_title) || text(order.course_slug) || "Legacy order",
    amount,
    discount_amount: 0,
    net_amount: amount,
    currency: text(order.currency) || "VND",
    status: mapOrderStatus(order),
    payment_gateway: text(order.payment_method) || "unknown",
    source: text(order.utm_source) || text(order.landing_page) || "legacy_order",
    due_at: text(order.expires_at) || null,
    paid_at: text(order.paid_at) || null,
    metadata: buildOrderMetadata(order),
    created_at: text(order.created_at) || new Date().toISOString(),
    updated_at: text(order.updated_at) || new Date().toISOString(),
  };

  const crmOrderId = mappedOrderId
    ? await updateMappedRow(client, "orders", mappedOrderId, orderPayload)
    : await insertMappedRow(client, "orders", orderPayload);

  await upsertLegacyMap(client, runId, "public.orders", sourceId, "crm_v2.orders", crmOrderId);
  counters.ordersUpserted += 1;

  await upsertPayment(client, runId, order, sourceId, contactId, crmOrderId, counters);
  await upsertCrmEvent(client, {
    contactId,
    leadId: crmLeadId,
    eventType: "order_created",
    sourceTable: "public.orders",
    sourceId,
    occurredAt: text(order.created_at) || new Date().toISOString(),
    metadata: { order_code: orderCode, amount, status: mapOrderStatus(order) },
  });
  counters.crmEventsUpserted += 1;

  if (isPaid(order)) {
    await upsertCrmEvent(client, {
      contactId,
      leadId: crmLeadId,
      eventType: "payment_paid",
      sourceTable: "public.orders",
      sourceId: `${sourceId}:paid`,
      occurredAt: text(order.paid_at) || text(order.updated_at) || new Date().toISOString(),
      metadata: { order_code: orderCode, amount, gateway: text(order.payment_method) || null },
    });
    counters.crmEventsUpserted += 1;
  }

  for (const courseSlug of splitCourseSlugs(text(order.course_slug))) {
    await upsertEnrollment(client, runId, order, sourceId, contactId, crmOrderId, courseSlug, counters);
  }
}

async function resolveOrderLead(
  client: SupabaseClient,
  runId: string,
  order: LegacyRow,
  contactId: string,
  counters: BackfillCounters,
) {
  const legacyLeadId = text(order.lead_id);
  if (legacyLeadId) {
    const mappedLeadId = await getMappedTargetId(client, "public.leads", legacyLeadId, "crm_v2.leads");
    if (mappedLeadId) return mappedLeadId;
  }

  const sourceId = requiredSourceId(order);
  const mappedOrderLeadId = await getMappedTargetId(client, "public.orders", sourceId, "crm_v2.leads");
  const amount = numberValue(order.amount);
  const leadPayload = {
    contact_id: contactId,
    stage: isPaid(order) ? "paid" : mapOrderStatus(order) === "pending" ? "pending_payment" : "new",
    status: isPaid(order) ? "won" : "open",
    source: text(order.utm_source) || text(order.landing_page) || "legacy_order",
    potential_value: amount,
    currency: text(order.currency) || "VND",
    paid_at: text(order.paid_at) || null,
    metadata: {
      legacy_table: "public.orders",
      legacy_id: sourceId,
      order_code: text(order.order_code) || sourceId,
      course_slug: text(order.course_slug) || null,
      course_title: text(order.course_title) || null,
    },
    created_at: text(order.created_at) || new Date().toISOString(),
    updated_at: text(order.updated_at) || new Date().toISOString(),
  };

  const crmLeadId = mappedOrderLeadId
    ? await updateMappedRow(client, "leads", mappedOrderLeadId, leadPayload)
    : await insertMappedRow(client, "leads", leadPayload);

  await upsertLegacyMap(client, runId, "public.orders", sourceId, "crm_v2.leads", crmLeadId);
  counters.orderLeadsUpserted += 1;
  return crmLeadId;
}

async function upsertPayment(
  client: SupabaseClient,
  runId: string,
  order: LegacyRow,
  sourceId: string,
  contactId: string,
  crmOrderId: string,
  counters: BackfillCounters,
) {
  const mappedPaymentId = await getMappedTargetId(client, "public.orders", sourceId, "crm_v2.payments");
  const status = mapPaymentStatus(order);
  const paymentPayload = {
    order_id: crmOrderId,
    contact_id: contactId,
    amount: numberValue(order.amount),
    currency: text(order.currency) || "VND",
    status,
    gateway: text(order.payment_method) || "unknown",
    gateway_transaction_id: text(order.sepay_transaction_id) || text(order.sepay_reference_code) || null,
    paid_at: status === "paid" ? text(order.paid_at) || text(order.updated_at) || null : null,
    failed_at: status === "failed" ? text(order.updated_at) || null : null,
    metadata: {
      legacy_table: "public.orders",
      legacy_id: sourceId,
      order_code: text(order.order_code) || sourceId,
      payment_status: text(order.payment_status) || null,
    },
    created_at: text(order.created_at) || new Date().toISOString(),
    updated_at: text(order.updated_at) || new Date().toISOString(),
  };

  const paymentId = mappedPaymentId
    ? await updateMappedRow(client, "payments", mappedPaymentId, paymentPayload)
    : await insertMappedRow(client, "payments", paymentPayload);

  await upsertLegacyMap(client, runId, "public.orders", sourceId, "crm_v2.payments", paymentId);
  counters.paymentsUpserted += 1;
}

async function upsertEnrollment(
  client: SupabaseClient,
  runId: string,
  order: LegacyRow,
  sourceId: string,
  contactId: string,
  crmOrderId: string,
  courseSlug: string,
  counters: BackfillCounters,
) {
  if (!isPaid(order)) return;
  const enrollmentSourceId = `${sourceId}:${courseSlug}`;
  const mappedEnrollmentId = await getMappedTargetId(client, "public.orders", enrollmentSourceId, "crm_v2.enrollments");
  const enrollmentPayload = {
    contact_id: contactId,
    order_id: crmOrderId,
    status: "active",
    activated_at: text(order.paid_at) || text(order.updated_at) || text(order.created_at) || new Date().toISOString(),
    metadata: {
      legacy_table: "public.orders",
      legacy_id: sourceId,
      order_code: text(order.order_code) || sourceId,
      course_slug: courseSlug,
      course_title: text(order.course_title) || null,
    },
    created_at: text(order.paid_at) || text(order.created_at) || new Date().toISOString(),
    updated_at: text(order.updated_at) || new Date().toISOString(),
  };

  const enrollmentId = mappedEnrollmentId
    ? await updateMappedRow(client, "enrollments", mappedEnrollmentId, enrollmentPayload)
    : await insertMappedRow(client, "enrollments", enrollmentPayload);

  await upsertLegacyMap(client, runId, "public.orders", enrollmentSourceId, "crm_v2.enrollments", enrollmentId);
  counters.enrollmentsUpserted += 1;
}

async function backfillLeadActivity(client: SupabaseClient, runId: string, activity: LegacyRow, counters: BackfillCounters) {
  const sourceId = requiredSourceId(activity);
  const leadLink = await resolveLegacyLeadLink(client, text(activity.lead_id));
  const eventId = await upsertCrmEvent(client, {
    contactId: leadLink.contactId,
    leadId: leadLink.leadId,
    eventType: text(activity.activity_type) || "lead_activity",
    sourceTable: "public.lead_activities",
    sourceId,
    occurredAt: text(activity.created_at) || new Date().toISOString(),
    metadata: {
      legacy_table: "public.lead_activities",
      legacy_id: sourceId,
      title: text(activity.title) || null,
      description: text(activity.description) || null,
      old_value: text(activity.old_value) || null,
      new_value: text(activity.new_value) || null,
      actor_email: text(activity.actor_email) || null,
      actor_name: text(activity.actor_name) || null,
      metadata: sanitizeLegacyMetadata(activity.metadata),
    },
  });

  await upsertLegacyMap(client, runId, "public.lead_activities", sourceId, "crm_v2.crm_events", eventId);
  counters.leadActivityEventsUpserted += 1;
  counters.crmEventsUpserted += 1;
}

async function backfillActivityLog(client: SupabaseClient, runId: string, log: LegacyRow, counters: BackfillCounters) {
  const sourceId = requiredSourceId(log);
  const link = await resolveActivityLogLink(client, runId, log);
  const eventId = await upsertCrmEvent(client, {
    contactId: link.contactId,
    leadId: link.leadId,
    eventType: text(log.event_type) || "activity_log",
    sourceTable: "public.activity_logs",
    sourceId,
    occurredAt: text(log.created_at) || new Date().toISOString(),
    actorId: isUuid(text(log.actor_id)) ? text(log.actor_id) : null,
    metadata: {
      legacy_table: "public.activity_logs",
      legacy_id: sourceId,
      student_id: text(log.student_id) || null,
      user_id: text(log.user_id) || null,
      event_title: text(log.event_title) || null,
      event_description: text(log.event_description) || null,
      status: text(log.status) || null,
      actor_type: text(log.actor_type) || null,
      actor_email: text(log.actor_email) || null,
      actor_name: text(log.actor_name) || null,
      ip_address: text(log.ip_address) || null,
      user_agent: text(log.user_agent) || null,
      metadata: sanitizeLegacyMetadata(log.metadata),
    },
  });

  await upsertLegacyMap(client, runId, "public.activity_logs", sourceId, "crm_v2.crm_events", eventId);
  counters.activityLogEventsUpserted += 1;
  counters.crmEventsUpserted += 1;
}

async function backfillLeadNote(client: SupabaseClient, runId: string, note: LegacyRow, counters: BackfillCounters) {
  const sourceId = requiredSourceId(note);
  const leadLink = await resolveLegacyLeadLink(client, text(note.lead_id));
  const mappedNoteId = await getMappedTargetId(client, "public.lead_notes", sourceId, "crm_v2.notes");
  const notePayload = {
    contact_id: leadLink.contactId,
    lead_id: leadLink.leadId,
    body: text(note.content) || "[Legacy note without body]",
    metadata: {
      legacy_table: "public.lead_notes",
      legacy_id: sourceId,
      note_type: text(note.note_type) || "care",
      created_by_email: text(note.created_by_email) || null,
      updated_by_email: text(note.updated_by_email) || null,
    },
    created_at: text(note.created_at) || new Date().toISOString(),
    updated_at: text(note.updated_at) || text(note.created_at) || new Date().toISOString(),
  };

  const noteId = mappedNoteId ? await updateMappedRow(client, "notes", mappedNoteId, notePayload) : await insertMappedRow(client, "notes", notePayload);
  await upsertLegacyMap(client, runId, "public.lead_notes", sourceId, "crm_v2.notes", noteId);
  counters.notesUpserted += 1;

  const eventId = await upsertCrmEvent(client, {
    contactId: leadLink.contactId,
    leadId: leadLink.leadId,
    eventType: "note_added",
    sourceTable: "public.lead_notes",
    sourceId: `${sourceId}:event`,
    occurredAt: text(note.created_at) || new Date().toISOString(),
    metadata: {
      legacy_table: "public.lead_notes",
      legacy_id: sourceId,
      note_id: noteId,
      note_type: text(note.note_type) || "care",
      created_by_email: text(note.created_by_email) || null,
    },
  });

  await upsertLegacyMap(client, runId, "public.lead_notes", `${sourceId}:event`, "crm_v2.crm_events", eventId);
  counters.leadNoteEventsUpserted += 1;
  counters.crmEventsUpserted += 1;
}

async function backfillEmailLog(
  client: SupabaseClient,
  runId: string,
  sourceTable: "public.email_logs" | "public.lead_email_logs",
  log: LegacyRow,
  counters: BackfillCounters,
) {
  const sourceId = requiredSourceId(log);
  const leadLink = await resolveLegacyLeadLink(client, text(log.lead_id));
  const contactId =
    leadLink.contactId ??
    (await upsertContact(client, runId, sourceTable, sourceId, {
      fullName: "",
      email: text(log.email),
      phone: "",
      source: sourceTable,
      lifecycleStage: "lead",
      metadata: {
        legacy_table: sourceTable,
        legacy_id: sourceId,
      },
    }));

  const emailStatus = normalizeLegacyEmailStatus(text(log.status));
  const subject = text(log.subject) || text(log.template_key) || text(log.template) || "Legacy email";
  const provider = text(log.resend_email_id) ? "resend" : "legacy";
  const mappedEmailSendId = await getMappedTargetId(client, sourceTable, sourceId, "crm_v2.email_sends");
  const emailSendPayload = {
    contact_id: contactId,
    provider,
    provider_message_id: text(log.resend_email_id) || null,
    recipient_email: text(log.email) || null,
    status: emailStatus,
    subject,
    idempotency_key: `${sourceTable}:${sourceId}:email_send`,
    sent_at: text(log.sent_at) || (emailStatus === "sent" ? text(log.created_at) || new Date().toISOString() : null),
    delivered_at: text(log.delivered_at) || null,
    opened_at: text(log.opened_at) || null,
    clicked_at: text(log.clicked_at) || null,
    bounced_at: emailStatus === "bounced" ? text(log.updated_at) || text(log.created_at) || new Date().toISOString() : null,
    complained_at: emailStatus === "complained" ? text(log.updated_at) || text(log.created_at) || new Date().toISOString() : null,
    metadata: {
      legacy_table: sourceTable,
      legacy_id: sourceId,
      lead_id: text(log.lead_id) || null,
      order_code: text(log.order_code) || null,
      template_key: text(log.template_key) || text(log.template) || null,
      error_message: text(log.error_message) || null,
    },
    created_at: text(log.created_at) || new Date().toISOString(),
    updated_at: text(log.updated_at) || text(log.created_at) || new Date().toISOString(),
  };

  const emailSendId = mappedEmailSendId
    ? await updateMappedRow(client, "email_sends", mappedEmailSendId, emailSendPayload)
    : await insertMappedRow(client, "email_sends", emailSendPayload);

  await upsertLegacyMap(client, runId, sourceTable, sourceId, "crm_v2.email_sends", emailSendId);
  counters.emailSendsUpserted += 1;

  const emailEvents = getLegacyEmailEvents(log, emailStatus);
  for (const emailEvent of emailEvents) {
    const emailEventId = await upsertLegacyEmailEvent(client, runId, sourceTable, sourceId, emailEvent, emailSendId, contactId, provider, log);
    await upsertCrmEvent(client, {
      contactId,
      leadId: leadLink.leadId,
      eventType: `email_${emailEvent.type}`,
      sourceTable: "crm_v2.email_events",
      sourceId: emailEventId,
      occurredAt: emailEvent.occurredAt,
      metadata: {
        legacy_table: sourceTable,
        legacy_id: sourceId,
        email_send_id: emailSendId,
        subject,
        status: emailEvent.type,
      },
    });
    counters.emailEventsUpserted += 1;
    counters.crmEventsUpserted += 1;
  }

  await upsertLegacySuppression(client, log, contactId, emailStatus);
}

async function resolveLegacyLeadLink(client: SupabaseClient, legacyLeadId: string) {
  if (!legacyLeadId) return { leadId: null, contactId: null };
  const leadId = await getMappedTargetId(client, "public.leads", legacyLeadId, "crm_v2.leads");
  if (!leadId) return { leadId: null, contactId: null };

  const { data, error } = await client.schema("crm_v2").from("leads").select("contact_id").eq("id", leadId).maybeSingle();
  if (error) throw new Error(error.message);
  return { leadId, contactId: data?.contact_id ? String(data.contact_id) : null };
}

async function resolveActivityLogLink(client: SupabaseClient, runId: string, log: LegacyRow) {
  const leadLink = await resolveLegacyLeadLink(client, text(log.lead_id));
  if (leadLink.contactId || leadLink.leadId) return leadLink;

  if (!text(log.student_email) && !text(log.student_phone)) return { leadId: null, contactId: null };

  const contactId = await upsertContact(client, runId, "public.activity_logs", requiredSourceId(log), {
    fullName: "",
    email: text(log.student_email),
    phone: text(log.student_phone),
    source: "legacy_activity_log",
    lifecycleStage: isStudentLifecycleEvent(text(log.event_type)) ? "student" : "lead",
    metadata: {
      legacy_table: "public.activity_logs",
      legacy_id: requiredSourceId(log),
      student_id: text(log.student_id) || null,
      user_id: text(log.user_id) || null,
    },
  });

  return { leadId: null, contactId };
}

async function upsertLegacyEmailEvent(
  client: SupabaseClient,
  runId: string,
  sourceTable: string,
  sourceId: string,
  emailEvent: { type: string; occurredAt: string },
  emailSendId: string,
  contactId: string,
  provider: string,
  log: LegacyRow,
) {
  const eventSourceId = `${sourceId}:${emailEvent.type}`;
  const mappedEmailEventId = await getMappedTargetId(client, sourceTable, eventSourceId, "crm_v2.email_events");
  const payload = {
    email_send_id: emailSendId,
    contact_id: contactId,
    provider,
    provider_event_id: text(log.resend_email_id) ? `${text(log.resend_email_id)}:${emailEvent.type}` : null,
    event_type: emailEvent.type,
    occurred_at: emailEvent.occurredAt,
    metadata: {
      legacy_table: sourceTable,
      legacy_id: sourceId,
      template_key: text(log.template_key) || text(log.template) || null,
      error_message: text(log.error_message) || null,
    },
  };

  const emailEventId = mappedEmailEventId
    ? await updateMappedRow(client, "email_events", mappedEmailEventId, payload)
    : await insertMappedRow(client, "email_events", payload);

  await upsertLegacyMap(client, runId, sourceTable, eventSourceId, "crm_v2.email_events", emailEventId);
  return emailEventId;
}

async function upsertContact(
  client: SupabaseClient,
  runId: string,
  sourceTable: string,
  sourceId: string,
  input: {
    fullName: string;
    email: string;
    phone: string;
    source: string;
    lifecycleStage: string;
    metadata: Record<string, unknown>;
  },
) {
  const mappedContactId = await getMappedTargetId(client, sourceTable, sourceId, "crm_v2.contacts");
  const normalizedEmail = normalizeEmail(input.email || null);
  const normalizedPhone = normalizePhone(input.phone || null);
  const payload = {
    full_name: input.fullName || null,
    email: input.email || null,
    phone: input.phone || null,
    normalized_email: normalizedEmail,
    normalized_phone: normalizedPhone,
    source: input.source,
    lifecycle_stage: input.lifecycleStage,
    metadata: input.metadata,
  };

  const contactId = mappedContactId
    ? await updateMappedRow(client, "contacts", mappedContactId, payload)
    : await upsertContactByIdentity(client, payload, normalizedEmail, normalizedPhone);

  await upsertLegacyMap(client, runId, sourceTable, sourceId, "crm_v2.contacts", contactId);
  return contactId;
}

async function upsertContactByIdentity(
  client: SupabaseClient,
  payload: Record<string, unknown>,
  normalizedEmail: string | null,
  normalizedPhone: string | null,
) {
  if (normalizedEmail || normalizedPhone) {
    const existing = await findExistingContactByIdentity(client, normalizedEmail, normalizedPhone);
    if (existing) {
      return updateMappedRow(client, "contacts", existing, payload);
    }
  }

  const { data, error } = await client.schema("crm_v2").from("contacts").insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Cannot insert anonymous contact.");
  return String(data.id);
}

async function findExistingContactByIdentity(client: SupabaseClient, normalizedEmail: string | null, normalizedPhone: string | null) {
  if (normalizedEmail) {
    const { data, error } = await client
      .schema("crm_v2")
      .from("contacts")
      .select("id")
      .eq("normalized_email", normalizedEmail)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return String(data.id);
  }

  if (normalizedPhone) {
    const { data, error } = await client
      .schema("crm_v2")
      .from("contacts")
      .select("id")
      .eq("normalized_phone", normalizedPhone)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return String(data.id);
  }

  return null;
}

async function getMappedTargetId(client: SupabaseClient, sourceTable: string, sourceId: string, targetTable: string) {
  const { data, error } = await client
    .schema("crm_v2")
    .from("legacy_id_map")
    .select("target_id")
    .eq("source_table", sourceTable)
    .eq("source_id", sourceId)
    .eq("target_table", targetTable)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.target_id ? String(data.target_id) : null;
}

async function upsertLegacyMap(
  client: SupabaseClient,
  runId: string,
  sourceTable: string,
  sourceId: string,
  targetTable: string,
  targetId: string,
) {
  const { error } = await client.schema("crm_v2").from("legacy_id_map").upsert({
    source_table: sourceTable,
    source_id: sourceId,
    target_table: targetTable,
    target_id: targetId,
    migration_run_id: runId,
  });
  if (error) throw new Error(error.message);
}

async function insertMappedRow(client: SupabaseClient, table: string, payload: Record<string, unknown>) {
  const { data, error } = await client.schema("crm_v2").from(table).insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message ?? `Cannot insert crm_v2.${table}.`);
  return String(data.id);
}

async function updateMappedRow(client: SupabaseClient, table: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client.schema("crm_v2").from(table).update(payload).eq("id", id).select("id").single();
  if (error || !data) throw new Error(error?.message ?? `Cannot update crm_v2.${table}.`);
  return String(data.id);
}

async function upsertCrmEvent(
  client: SupabaseClient,
  input: {
    contactId: string | null;
    leadId: string | null;
    eventType: string;
    sourceTable: string;
    sourceId: string;
    occurredAt: string;
    actorId?: string | null;
    metadata: Record<string, unknown>;
  },
) {
  const idempotencyKey = `${input.sourceTable}:${input.sourceId}:${input.eventType}`;
  const { data: existing, error: existingError } = await client
    .schema("crm_v2")
    .from("crm_events")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing?.id) return String(existing.id);

  const { data, error } = await client
    .schema("crm_v2")
    .from("crm_events")
    .insert({
      contact_id: input.contactId,
      lead_id: input.leadId,
      event_type: input.eventType,
      event_source: "legacy_backfill",
      occurred_at: input.occurredAt,
      actor_id: input.actorId ?? null,
      source_table: input.sourceTable,
      source_id: input.sourceId,
      idempotency_key: idempotencyKey,
      metadata: input.metadata,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Cannot insert crm event.");
  return String(data.id);
}

async function getTargetCounts(client: SupabaseClient) {
  return {
    contacts: await countRows(client, "crm_v2", "contacts"),
    leads: await countRows(client, "crm_v2", "leads"),
    orders: await countRows(client, "crm_v2", "orders"),
    payments: await countRows(client, "crm_v2", "payments"),
    enrollments: await countRows(client, "crm_v2", "enrollments"),
    notes: await countRows(client, "crm_v2", "notes"),
    email_sends: await countRows(client, "crm_v2", "email_sends"),
    email_events: await countRows(client, "crm_v2", "email_events"),
    crm_events: await countRows(client, "crm_v2", "crm_events"),
    legacy_id_map: await countRows(client, "crm_v2", "legacy_id_map"),
  };
}

async function getMissingMappings(client: SupabaseClient, sourceCounts: SourceCounts, expectedEnrollmentRows: number) {
  const legacyMaps = await fetchPaged(client, "crm_v2", "legacy_id_map", "source_table,source_id,target_table,target_id");
  const countMaps = (sourceTable: string, targetTable: string) =>
    legacyMaps.filter((row) => row.source_table === sourceTable && row.target_table === targetTable).length;

  return {
    leads: Math.max(0, sourceCounts.leads - countMaps("public.leads", "crm_v2.leads")),
    orders: Math.max(0, sourceCounts.orders - countMaps("public.orders", "crm_v2.orders")),
    payments: Math.max(0, sourceCounts.orders - countMaps("public.orders", "crm_v2.payments")),
    enrollments: Math.max(0, expectedEnrollmentRows - countMaps("public.orders", "crm_v2.enrollments")),
    leadActivityEvents: Math.max(0, sourceCounts.lead_activities - countMaps("public.lead_activities", "crm_v2.crm_events")),
    activityLogEvents: Math.max(0, sourceCounts.activity_logs - countMaps("public.activity_logs", "crm_v2.crm_events")),
    leadNotes: Math.max(0, sourceCounts.lead_notes - countMaps("public.lead_notes", "crm_v2.notes")),
    leadNoteEvents: Math.max(0, sourceCounts.lead_notes - countMaps("public.lead_notes", "crm_v2.crm_events")),
  };
}

async function getDuplicateCounts(client: SupabaseClient) {
  const contactRows = await fetchPaged(client, "crm_v2", "contacts", "normalized_email,normalized_phone");
  return {
    normalized_email: countDuplicates(contactRows.map((row) => row.normalized_email).filter(Boolean).map(String)),
    normalized_phone: countDuplicates(contactRows.map((row) => row.normalized_phone).filter(Boolean).map(String)),
  };
}

function countDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return duplicates.size;
}

function maskLegacyTimelineRow(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? "unknown"),
    lead_id: row.lead_id ? String(row.lead_id) : null,
    event_type: text(row.event_type) || text(row.activity_type) || text(row.note_type) || null,
    title: text(row.event_title) || text(row.title) || null,
    actor_email: maskEmailForPreview(text(row.actor_email) || text(row.created_by_email) || null),
    student_email: maskEmailForPreview(text(row.student_email) || null),
    student_phone: maskPhoneForPreview(text(row.student_phone) || null),
    created_at: text(row.created_at) || null,
  };
}

function sanitizeLegacyMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const blockedKeys = ["authorization", "apiKey", "accessToken", "refreshToken", "sessionToken", "secret", "password", "temporaryPassword", "resetToken"];
  const output: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.replace(/[-_\s]/g, "").toLowerCase();
    if (blockedKeys.some((blockedKey) => blockedKey.replace(/[-_\s]/g, "").toLowerCase() === normalizedKey)) continue;

    if (rawValue === null || ["string", "number", "boolean"].includes(typeof rawValue)) {
      output[key] = typeof rawValue === "string" ? rawValue.slice(0, 1000) : rawValue;
      continue;
    }

    if (Array.isArray(rawValue)) {
      output[key] = rawValue
        .filter((item) => item === null || ["string", "number", "boolean"].includes(typeof item))
        .slice(0, 20)
        .map((item) => (typeof item === "string" ? item.slice(0, 300) : item));
    }
  }

  return output;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isStudentLifecycleEvent(eventType: string) {
  const normalized = eventType.toLowerCase();
  return normalized.includes("student") || normalized.includes("course") || normalized.includes("learning") || normalized.includes("access");
}

function maskEmailForPreview(value: string | null) {
  const normalized = normalizeEmail(value);
  if (!normalized) return null;
  const [local, domain] = normalized.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhoneForPreview(value: string | null) {
  const normalized = normalizePhone(value);
  if (!normalized) return null;
  return `${normalized.slice(0, 3)}***${normalized.slice(-2)}`;
}

function requiredSourceId(row: LegacyRow) {
  const id = text(row.id) || text(row.order_code);
  if (!id) throw new Error("Legacy row is missing id/order_code.");
  return id;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isLeadPaid(lead: LegacyRow) {
  const joined = `${text(lead.status)} ${text(lead.sale_status)} ${text(lead.payment_status)}`.toLowerCase();
  return joined.includes("paid") || joined.includes("thanh");
}

function isPaid(order: LegacyRow) {
  const joined = `${text(order.status)} ${text(order.payment_status)}`.toLowerCase();
  return joined.includes("paid") || joined.includes("thanh");
}

function mapOrderStatus(order: LegacyRow) {
  const joined = `${text(order.status)} ${text(order.payment_status)}`.toLowerCase();
  if (joined.includes("paid") || joined.includes("thanh")) return "paid";
  if (joined.includes("failed") || joined.includes("fail")) return "failed";
  if (joined.includes("expired")) return "expired";
  if (joined.includes("refund")) return "refunded";
  return "pending";
}

function mapPaymentStatus(order: LegacyRow) {
  const status = mapOrderStatus(order);
  if (status === "paid") return "paid";
  if (status === "failed" || status === "expired") return "failed";
  if (status === "refunded") return "refunded";
  return "pending";
}

function normalizeLegacyEmailStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "success") return "sent";
  if (normalized.includes("deliver")) return "delivered";
  if (normalized.includes("open")) return "opened";
  if (normalized.includes("click")) return "clicked";
  if (normalized.includes("bounce")) return "bounced";
  if (normalized.includes("complain")) return "complained";
  if (normalized.includes("fail")) return "failed";
  if (normalized.includes("queue")) return "queued";
  if (normalized.includes("sent")) return "sent";
  return normalized || "unknown";
}

function getLegacyEmailEvents(log: LegacyRow, status: string) {
  const events: Array<{ type: string; occurredAt: string }> = [];
  const add = (type: string, timestamp: string) => {
    if (!timestamp) return;
    if (events.some((event) => event.type === type && event.occurredAt === timestamp)) return;
    events.push({ type, occurredAt: timestamp });
  };

  add("sent", text(log.sent_at) || (status === "sent" ? text(log.created_at) : ""));
  add("delivered", text(log.delivered_at));
  add("opened", text(log.opened_at));
  add("clicked", text(log.clicked_at));

  if (["failed", "bounced", "complained", "unsubscribed"].includes(status)) {
    add(status, text(log.updated_at) || text(log.created_at) || new Date().toISOString());
  }

  if (events.length === 0) {
    add(status === "unknown" ? "received" : status, text(log.created_at) || new Date().toISOString());
  }

  return events;
}

async function upsertLegacySuppression(client: SupabaseClient, log: LegacyRow, contactId: string, status: string) {
  const reason = status === "bounced" ? "hard_bounce" : status === "complained" ? "complained" : status === "unsubscribed" ? "unsubscribed" : "";
  if (!reason) return;
  const normalizedEmail = normalizeEmail(text(log.email) || null);
  if (!normalizedEmail) return;

  const suppressedAt = text(log.updated_at) || text(log.created_at) || new Date().toISOString();
  const { error: suppressionError } = await client.schema("crm_v2").from("email_suppression_list").upsert({
    contact_id: contactId,
    email: text(log.email) || null,
    normalized_email: normalizedEmail,
    reason,
    provider: text(log.resend_email_id) ? "resend" : "legacy",
    suppressed_at: suppressedAt,
    metadata: {
      legacy_id: requiredSourceId(log),
      legacy_status: text(log.status) || null,
    },
  });
  if (suppressionError) throw new Error(suppressionError.message);

  const contactPatch =
    reason === "unsubscribed"
      ? { unsubscribed_at: suppressedAt, marketing_consent: false }
      : reason === "complained"
        ? { complained_at: suppressedAt, marketing_consent: false }
        : { bounce_status: "hard_bounce", marketing_consent: false };
  const { error: contactError } = await client.schema("crm_v2").from("contacts").update(contactPatch).eq("id", contactId);
  if (contactError) throw new Error(contactError.message);
}

function mapStage(status: string, saleStatus: string) {
  const joined = `${status} ${saleStatus}`.toLowerCase();
  if (joined.includes("paid") || joined.includes("thanh")) return "paid";
  if (joined.includes("pending")) return "pending_payment";
  if (joined.includes("lien")) return "consulting";
  if (joined.includes("lost") || joined.includes("khong")) return "disqualified";
  return "new";
}

function splitCourseSlugs(value: string) {
  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildOrderMetadata(order: LegacyRow) {
  return {
    legacy_table: "public.orders",
    legacy_id: requiredSourceId(order),
    lead_id: text(order.lead_id) || null,
    course_slug: text(order.course_slug) || null,
    course_title: text(order.course_title) || null,
    order_items: order.order_items ?? null,
    sepay_reference_code: text(order.sepay_reference_code) || null,
    utm_source: text(order.utm_source) || null,
    utm_medium: text(order.utm_medium) || null,
    utm_campaign: text(order.utm_campaign) || null,
    utm_content: text(order.utm_content) || null,
    utm_term: text(order.utm_term) || null,
    fbclid: text(order.fbclid) || null,
    fbc: text(order.fbc) || null,
    fbp: text(order.fbp) || null,
    landing_page: text(order.landing_page) || null,
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
