import type { SupabaseClient } from "@supabase/supabase-js";
import { countRows, fetchPaged, getSupabaseAdminClient, parseScriptOptions, printJson } from "./shared";

async function main() {
  const options = parseScriptOptions();
  const client = getSupabaseAdminClient({ requireLive: options.requireLive || options.strict });

  if (!client) {
    printJson({ ok: true, mode: "offline", strict: false, message: "No Supabase env found. Live verify skipped." });
    return;
  }

  const sourceLeadCount = await countRows(client, "public", "leads");
  const sourceOrderCount = await countRows(client, "public", "orders");
  const sourceLeadActivityCount = await countOptionalRows(client, "public", "lead_activities");
  const sourceActivityLogCount = await countOptionalRows(client, "public", "activity_logs");
  const sourceLeadNoteCount = await countOptionalRows(client, "public", "lead_notes");
  const expectedEnrollmentRows = await countExpectedEnrollments(client);
  const crmCounts = {
    contacts: await countRows(client, "crm_v2", "contacts"),
    leads: await countRows(client, "crm_v2", "leads"),
    orders: await countRows(client, "crm_v2", "orders"),
    payments: await countRows(client, "crm_v2", "payments"),
    enrollments: await countRows(client, "crm_v2", "enrollments"),
    notes: await countRows(client, "crm_v2", "notes"),
    crm_events: await countRows(client, "crm_v2", "crm_events"),
    legacy_id_map: await countRows(client, "crm_v2", "legacy_id_map"),
  };

  const legacyMaps = await fetchPaged(client, "crm_v2", "legacy_id_map", "source_table,source_id,target_table,target_id");
  const contactRows = await fetchPaged(client, "crm_v2", "contacts", "normalized_email,normalized_phone");
  const duplicateCounts = {
    normalized_email: countDuplicates(contactRows.map((row) => row.normalized_email).filter(Boolean).map(String)),
    normalized_phone: countDuplicates(contactRows.map((row) => row.normalized_phone).filter(Boolean).map(String)),
  };
  const missingMappings = {
    leads: Math.max(0, sourceLeadCount - countMaps(legacyMaps, "public.leads", "crm_v2.leads")),
    orders: Math.max(0, sourceOrderCount - countMaps(legacyMaps, "public.orders", "crm_v2.orders")),
    payments: Math.max(0, sourceOrderCount - countMaps(legacyMaps, "public.orders", "crm_v2.payments")),
    enrollments: Math.max(0, expectedEnrollmentRows - countMaps(legacyMaps, "public.orders", "crm_v2.enrollments")),
    leadActivityEvents: Math.max(0, sourceLeadActivityCount - countMaps(legacyMaps, "public.lead_activities", "crm_v2.crm_events")),
    activityLogEvents: Math.max(0, sourceActivityLogCount - countMaps(legacyMaps, "public.activity_logs", "crm_v2.crm_events")),
    leadNotes: Math.max(0, sourceLeadNoteCount - countMaps(legacyMaps, "public.lead_notes", "crm_v2.notes")),
    leadNoteEvents: Math.max(0, sourceLeadNoteCount - countMaps(legacyMaps, "public.lead_notes", "crm_v2.crm_events")),
  };
  const abnormalDrift = {
    ordersWithoutPayments: Math.max(0, crmCounts.orders - crmCounts.payments),
    paidEnrollmentsMissing: missingMappings.enrollments,
  };
  const driftDetected =
    Object.values(missingMappings).some((value) => value > 0) ||
    Object.values(duplicateCounts).some((value) => value > 0) ||
    Object.values(abnormalDrift).some((value) => value > 0);

  const result = {
    ok: !options.strict || !driftDetected,
    strict: options.strict,
    sourceCounts: {
      leads: sourceLeadCount,
      orders: sourceOrderCount,
      lead_activities: sourceLeadActivityCount,
      activity_logs: sourceActivityLogCount,
      lead_notes: sourceLeadNoteCount,
      expectedEnrollmentRows,
    },
    crmCounts,
    mapCounts: {
      leadMappings: countMaps(legacyMaps, "public.leads", "crm_v2.leads"),
      orderMappings: countMaps(legacyMaps, "public.orders", "crm_v2.orders"),
      paymentMappings: countMaps(legacyMaps, "public.orders", "crm_v2.payments"),
      enrollmentMappings: countMaps(legacyMaps, "public.orders", "crm_v2.enrollments"),
      leadActivityEventMappings: countMaps(legacyMaps, "public.lead_activities", "crm_v2.crm_events"),
      activityLogEventMappings: countMaps(legacyMaps, "public.activity_logs", "crm_v2.crm_events"),
      leadNoteMappings: countMaps(legacyMaps, "public.lead_notes", "crm_v2.notes"),
      leadNoteEventMappings: countMaps(legacyMaps, "public.lead_notes", "crm_v2.crm_events"),
    },
    missingMappings,
    duplicateCounts,
    abnormalDrift,
    driftDetected,
  };

  printJson(result);
  if (!result.ok) process.exit(1);
}

async function countExpectedEnrollments(client: SupabaseClient) {
  const rows = await fetchOrdersForEnrollment(client);
  return rows.filter((row) => isPaid(row) && splitCourseSlugs(text(row.course_slug)).length > 0).length;
}

async function fetchOrdersForEnrollment(client: SupabaseClient) {
  try {
    return await fetchPaged(client, "public", "orders", "id,course_slug,status,payment_status");
  } catch {
    return fetchPaged(client, "public", "orders", "id,course_slug,status");
  }
}

async function countOptionalRows(client: SupabaseClient, schema: string, table: string) {
  try {
    return await countRows(client, schema, table);
  } catch {
    return 0;
  }
}

function countMaps(rows: Record<string, unknown>[], sourceTable: string, targetTable: string) {
  return rows.filter((row) => row.source_table === sourceTable && row.target_table === targetTable).length;
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

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function isPaid(order: Record<string, unknown>) {
  const joined = `${text(order.status)} ${text(order.payment_status)}`.toLowerCase();
  return joined.includes("paid") || joined.includes("thanh");
}

function splitCourseSlugs(value: string) {
  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
