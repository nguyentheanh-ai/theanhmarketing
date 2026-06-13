import { fallbackLeads } from "@/data/platform";
import { syncLeadToGoogleSheet } from "@/lib/notifications/google-sheets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { attributionToDbColumns, normalizeAttribution, type Attribution, type AttributionInput } from "@/lib/tracking/attribution";
import { logStudentActivity } from "@/services/activityLogService";
import { getPaymentOrders, type PaymentOrder } from "@/services/orderService";

export type LeadInput = {
  name: string;
  phone?: string;
  email?: string;
  message?: string;
  source?: string;
  attribution?: AttributionInput;
  syncGoogleSheet?: boolean;
};

export const leadSaleStatuses = ["Chưa liên hệ", "Đã liên hệ", "Đã liên hệ lần 2", "Đã liên hệ lần 3", "K nhu cầu"] as const;
export type LeadSaleStatus = (typeof leadSaleStatuses)[number];

export type LeadPaymentStatus = "paid" | "unpaid";

export type LeadItem = {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  need: string;
  source: string;
  status: string;
  saleStatus: LeadSaleStatus;
  createdAt?: string;
  updatedAt?: string;
  googleSheetSyncedAt?: string | null;
  googleSheetRowId?: string | null;
  googleSheetSyncError?: string | null;
  deletedAt?: string | null;
  deleteAfter?: string | null;
  deleteReason?: string | null;
  paymentStatus: LeadPaymentStatus;
  paymentMethod?: string | null;
  orderCode?: string | null;
  courseTitle?: string | null;
  amountLabel?: string | null;
  paidAt?: string | null;
  resendEmailCount: number;
  lastResendEmailAt?: string | null;
  attribution?: Attribution;
};

export type LeadEmailLog = {
  id: string;
  leadId: string | null;
  orderCode: string | null;
  email: string;
  template: string;
  status: "success" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

type DbLead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  source: string | null;
  status?: string | null;
  sale_status?: string | null;
  google_sheet_synced_at?: string | null;
  google_sheet_row_id?: string | null;
  google_sheet_sync_error?: string | null;
  deleted_at?: string | null;
  delete_after?: string | null;
  delete_reason?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_id?: string | null;
  utm_term?: string | null;
  campaign_id?: string | null;
  campaign_name?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  ad_name?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  landing_page?: string | null;
};

type DbLeadEmailLog = {
  id: string;
  lead_id: string | null;
  order_code: string | null;
  email: string | null;
  template: string | null;
  status: string | null;
  error_message: string | null;
  created_at: string | null;
};

const leadSelectFields =
  "id,name,phone,email,message,source,status,sale_status,google_sheet_synced_at,google_sheet_row_id,google_sheet_sync_error,deleted_at,delete_after,delete_reason,created_at,updated_at,utm_source,utm_medium,utm_campaign,utm_content,utm_id,utm_term,campaign_id,campaign_name,adset_id,ad_id,ad_name,fbclid,fbc,fbp,landing_page";
const fallbackLeadSelectFields = "id,name,phone,email,message,source,created_at";
const leadEmailLogSelectFields = "id,lead_id,order_code,email,template,status,error_message,created_at";
const orderOnlyLeadIdPrefix = "order:";

function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeSaleStatus(value: string | null | undefined): LeadSaleStatus {
  return leadSaleStatuses.includes(value as LeadSaleStatus) ? (value as LeadSaleStatus) : "Chưa liên hệ";
}

function getOrderOnlyLeadId(orderCode: string) {
  return `${orderOnlyLeadIdPrefix}${orderCode}`;
}

function isOrderOnlyLeadId(leadId: string) {
  return leadId.startsWith(orderOnlyLeadIdPrefix);
}

function getOrderCodeFromOrderOnlyLeadId(leadId: string) {
  return leadId.slice(orderOnlyLeadIdPrefix.length).trim();
}

function getLineValue(text: string, labels: string[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const label of labels) {
    const prefix = `${label}:`.toLowerCase();
    const line = lines.find((item) => item.toLowerCase().startsWith(prefix));

    if (line) {
      return line.slice(prefix.length).trim();
    }
  }

  return "";
}

export function getLeadOrderCodeFromNote(text: string) {
  return getLineValue(text, ["Mã đơn", "Ma don", "Order code", "Order"]);
}

function getLeadCourseTitleFromNote(text: string) {
  return getLineValue(text, ["Khóa", "Khoa", "Khóa học", "Khoa hoc", "Sản phẩm", "San pham"]);
}

function findMatchingOrder(lead: DbLead, orders: PaymentOrder[]) {
  const orderCode = getLeadOrderCodeFromNote(lead.message ?? "").toUpperCase();
  const email = normalizeEmail(lead.email);
  const phone = normalizePhone(lead.phone);

  if (orderCode) {
    const byCode = orders.find((order) => order.orderCode.toUpperCase() === orderCode);

    if (byCode) {
      return byCode;
    }
  }

  const byEmail = email ? orders.find((order) => normalizeEmail(order.email) === email) : undefined;

  if (byEmail) {
    return byEmail;
  }

  return phone ? orders.find((order) => normalizePhone(order.phone) === phone) : undefined;
}

function getOrderLeadSource(order: PaymentOrder) {
  const identity = `${order.courseSlug} ${order.courseTitle}`.toLowerCase();

  if (identity.includes("facebook-ads-2026")) {
    return "LDP Facebook Ads Master 2026";
  }

  if (identity.includes("ai-master-x10")) {
    return "LDP AI Master X10";
  }

  return `LDP ${order.courseTitle || "Website"}`;
}

function buildOrderLeadNote(order: PaymentOrder) {
  return [
    `Mã đơn: ${order.orderCode}`,
    `Khóa: ${order.courseTitle}`,
    `Số tiền: ${order.amountLabel}`,
    `Trạng thái: ${order.status}`,
    "Nguồn: Tự bổ sung từ order vì chưa có lead trong bảng leads.",
  ].join("\n");
}

function buildLeadFromOrder(order: PaymentOrder): LeadItem {
  return {
    id: getOrderOnlyLeadId(order.orderCode),
    name: order.studentName,
    phone: order.phone,
    email: order.email,
    need: buildOrderLeadNote(order),
    source: getOrderLeadSource(order),
    status: "new",
    saleStatus: "Chưa liên hệ",
    createdAt: order.createdAt ?? "",
    updatedAt: order.paidAt ?? order.createdAt ?? "",
    googleSheetSyncedAt: null,
    googleSheetRowId: null,
    googleSheetSyncError: null,
    deletedAt: null,
    deleteAfter: null,
    deleteReason: null,
    paymentStatus: order.status === "paid" ? "paid" : "unpaid",
    paymentMethod: order.paymentMethod,
    orderCode: order.orderCode,
    courseTitle: order.courseTitle,
    amountLabel: order.amountLabel,
    paidAt: order.paidAt,
    resendEmailCount: 0,
    lastResendEmailAt: null,
    attribution: order.attribution,
  };
}

function mapLeadAttribution(row: DbLead): Attribution {
  return normalizeAttribution({
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    utmId: row.utm_id,
    utmTerm: row.utm_term,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    adsetId: row.adset_id,
    adId: row.ad_id,
    adName: row.ad_name,
    fbclid: row.fbclid,
    fbc: row.fbc,
    fbp: row.fbp,
    landingPage: row.landing_page,
  });
}

function mapEmailLog(row: DbLeadEmailLog): LeadEmailLog {
  return {
    id: row.id,
    leadId: row.lead_id,
    orderCode: row.order_code,
    email: row.email ?? "",
    template: row.template ?? "unknown",
    status: row.status === "success" ? "success" : "failed",
    errorMessage: row.error_message,
    createdAt: row.created_at ?? "",
  };
}

function summarizeLogs(logs: LeadEmailLog[]) {
  const successLogs = logs.filter((log) => log.status === "success");
  const latest = logs[0];

  return {
    resendEmailCount: successLogs.length,
    lastResendEmailAt: latest?.createdAt ?? null,
  };
}

function mapDbLead(row: DbLead, orders: PaymentOrder[], emailLogsByLeadId: Map<string, LeadEmailLog[]>): LeadItem {
  const matchedOrder = findMatchingOrder(row, orders);
  const logs = row.id ? emailLogsByLeadId.get(row.id) ?? [] : [];
  const logSummary = summarizeLogs(logs);

  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    need: row.message ?? "",
    source: row.source ?? "Website",
    status: row.status ?? "new",
    saleStatus: normalizeSaleStatus(row.sale_status),
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
    googleSheetSyncedAt: row.google_sheet_synced_at ?? null,
    googleSheetRowId: row.google_sheet_row_id ?? null,
    googleSheetSyncError: row.google_sheet_sync_error ?? null,
    deletedAt: row.deleted_at ?? null,
    deleteAfter: row.delete_after ?? null,
    deleteReason: row.delete_reason ?? null,
    paymentStatus: matchedOrder?.status === "paid" ? "paid" : "unpaid",
    paymentMethod: matchedOrder?.paymentMethod ?? null,
    orderCode: matchedOrder?.orderCode ?? (getLeadOrderCodeFromNote(row.message ?? "") || null),
    courseTitle: matchedOrder?.courseTitle ?? (getLeadCourseTitleFromNote(row.message ?? "") || null),
    amountLabel: matchedOrder?.amountLabel ?? null,
    paidAt: matchedOrder?.paidAt ?? null,
    attribution: matchedOrder?.attribution ?? mapLeadAttribution(row),
    ...logSummary,
  };
}

async function getEmailLogsByLeadId() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return new Map<string, LeadEmailLog[]>();
  }

  const { data, error } = await supabase
    .from("lead_email_logs")
    .select(leadEmailLogSelectFields)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return new Map<string, LeadEmailLog[]>();
  }

  const logsByLeadId = new Map<string, LeadEmailLog[]>();

  for (const log of (data as DbLeadEmailLog[]).map(mapEmailLog)) {
    if (!log.leadId) continue;
    logsByLeadId.set(log.leadId, [...(logsByLeadId.get(log.leadId) ?? []), log]);
  }

  return logsByLeadId;
}

async function updateLeadSheetState(
  leadId: string | undefined,
  patch: { googleSheetSyncedAt?: string | null; googleSheetSyncError?: string | null },
) {
  if (!leadId) {
    return;
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const dbPatch: Record<string, string | null> = {};

  if ("googleSheetSyncedAt" in patch) {
    dbPatch.google_sheet_synced_at = patch.googleSheetSyncedAt ?? null;
  }

  if ("googleSheetSyncError" in patch) {
    dbPatch.google_sheet_sync_error = patch.googleSheetSyncError ?? null;
  }

  if (Object.keys(dbPatch).length === 0) {
    return;
  }

  await supabase.from("leads").update(dbPatch).eq("id", leadId);
}

export async function createLead(input: LeadInput) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false, fallback: true, error: "Supabase env is missing" };
  }

  const attribution = normalizeAttribution(input.attribution);
  const { error } = await supabase.from("leads").insert({
    name: input.name,
    phone: input.phone ?? "",
    email: input.email ?? "",
    message: input.message ?? "",
    source: input.source ?? attribution.source,
    ...attributionToDbColumns(attribution),
  });

  if (error) {
    return { ok: false, fallback: true, error: error.message };
  }

  return { ok: true, fallback: false, error: null };
}

export async function createLeadAdmin(input: LeadInput) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, fallback: true, error: "Supabase env is missing" };
  }

  const attribution = normalizeAttribution(input.attribution);
  const insertPayload = {
    name: input.name,
    full_name: input.name,
    phone: input.phone ?? "",
    email: input.email ?? "",
    message: input.message ?? "",
    source: input.source ?? attribution.source,
    status: "new",
    sale_status: "Chưa liên hệ",
  };

  Object.assign(insertPayload, {
    lead_status: "new",
    payment_status: "unpaid",
    ...attributionToDbColumns(attribution),
  });

  let insert = await supabase.from("leads").insert(insertPayload).select(leadSelectFields).single();

  if (insert.error || !insert.data) {
    insert = await supabase
      .from("leads")
      .insert({
        name: input.name,
        phone: input.phone ?? "",
        email: input.email ?? "",
        message: input.message ?? "",
        source: input.source ?? attribution.source,
      })
      .select(fallbackLeadSelectFields)
      .single();
  }

  if (insert.error || !insert.data) {
    return { ok: false, fallback: true, error: insert.error?.message ?? "Could not insert lead" };
  }

  const lead = mapDbLead(insert.data as DbLead, [], new Map());
  if (input.syncGoogleSheet === false) {
    return {
      ok: true,
      fallback: false,
      error: null,
      lead,
      sheetSync: { ok: true, skipped: true, reason: "scheduled_after_response" },
    };
  }

  const sheetSync = await syncLeadToGoogleSheet(lead, { source: lead.source });

  if (sheetSync.ok && !sheetSync.skipped) {
    await updateLeadSheetState(lead.id, { googleSheetSyncedAt: new Date().toISOString(), googleSheetSyncError: null });
    await logStudentActivity({
      leadId: lead.id ?? null,
      studentEmail: lead.email,
      studentPhone: lead.phone,
      eventType: "sheet_sync_success",
      eventTitle: "Đã đồng bộ Google Sheet",
      eventDescription: "Lead mới đã được gửi sang Google Sheet.",
      status: "success",
      actorType: "system",
      metadata: { source: lead.source, dedupeKey: lead.id },
    });
  } else if (!sheetSync.ok) {
    await updateLeadSheetState(lead.id, { googleSheetSyncError: sheetSync.reason ?? "Google Sheet sync failed" });
    await logStudentActivity({
      leadId: lead.id ?? null,
      studentEmail: lead.email,
      studentPhone: lead.phone,
      eventType: "sheet_sync_failed",
      eventTitle: "Đồng bộ Google Sheet thất bại",
      eventDescription: sheetSync.reason ?? "Google Sheet sync failed",
      status: "failed",
      actorType: "system",
      metadata: { source: lead.source, status: sheetSync.status ?? null },
    });
  }

  return { ok: true, fallback: false, error: null, lead, sheetSync };
}

export async function updateLeadAdmin(
  leadId: string,
  patch: Partial<Pick<LeadInput, "name" | "phone" | "email" | "message" | "source">> & {
    saleStatus?: LeadSaleStatus;
    status?: string;
    attribution?: AttributionInput;
  },
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, error: "Missing Supabase admin client" };
  }

  const dbPatch: Record<string, string | null> = {};

  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone ?? "";
  if (patch.email !== undefined) dbPatch.email = patch.email ?? "";
  if (patch.message !== undefined) dbPatch.message = patch.message ?? "";
  if (patch.source !== undefined) dbPatch.source = patch.source ?? "Website";
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.saleStatus !== undefined) dbPatch.sale_status = patch.saleStatus;
  if (patch.attribution !== undefined) {
    Object.assign(dbPatch, attributionToDbColumns(normalizeAttribution(patch.attribution)));
  }

  const previous = await supabase.from("leads").select(leadSelectFields).eq("id", leadId).maybeSingle();
  const { data, error } = await supabase.from("leads").update(dbPatch).eq("id", leadId).select(leadSelectFields).single();

  return error
    ? { ok: false, error: error.message }
    : {
        ok: true,
        error: null,
        lead: data ? mapDbLead(data as DbLead, [], new Map()) : undefined,
        previousSaleStatus: previous.data ? normalizeSaleStatus((previous.data as DbLead).sale_status) : null,
      };
}

export async function updateLeadSaleStatus(leadId: string, saleStatus: LeadSaleStatus) {
  if (isOrderOnlyLeadId(leadId)) {
    return createLeadFromOrderSaleStatus(getOrderCodeFromOrderOnlyLeadId(leadId), saleStatus);
  }

  return updateLeadAdmin(leadId, { saleStatus });
}

async function createLeadFromOrderSaleStatus(orderCode: string, saleStatus: LeadSaleStatus) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, error: "Missing Supabase admin client" };
  }

  const orders = await getPaymentOrders({ includeFallback: false });
  const order = orders.find((item) => item.orderCode.toUpperCase() === orderCode.toUpperCase());

  if (!order) {
    return { ok: false, error: "Khong tim thay don hang de tao lead sale." };
  }

  const insert = await supabase
    .from("leads")
    .insert({
      name: order.studentName,
      phone: order.phone ?? "",
      email: order.email ?? "",
      message: buildOrderLeadNote(order),
      source: getOrderLeadSource(order),
      status: "new",
      sale_status: saleStatus,
    })
    .select(leadSelectFields)
    .single();

  if (insert.error || !insert.data) {
    return { ok: false, error: insert.error?.message ?? "Khong tao duoc lead tu don hang." };
  }

  return {
    ok: true,
    error: null,
    lead: mapDbLead(insert.data as DbLead, [order], new Map()),
    previousSaleStatus: "Chưa liên hệ" as LeadSaleStatus,
  };
}

export async function getLeads(options: { includeFallback?: boolean } = {}): Promise<LeadItem[]> {
  const includeFallback = options.includeFallback ?? false;
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return includeFallback
      ? fallbackLeads.map((lead) => ({
          ...lead,
          saleStatus: "Chưa liên hệ",
          paymentStatus: "unpaid",
          resendEmailCount: 0,
        }))
      : [];
  }

  const primaryRead = await supabase
    .from("leads")
    .select(leadSelectFields)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  let data: DbLead[] | null = primaryRead.data as DbLead[] | null;
  let error = primaryRead.error;

  if (error) {
    const fallback = await supabase
      .from("leads")
      .select(fallbackLeadSelectFields)
      .order("created_at", { ascending: false });
    data = fallback.data as DbLead[] | null;
    error = fallback.error;
  }

  if (error || !data || data.length === 0) {
    if (!includeFallback) {
      return [];
    }

    return fallbackLeads.map((lead) => ({
      ...lead,
      saleStatus: "Chưa liên hệ",
      paymentStatus: "unpaid",
      resendEmailCount: 0,
    }));
  }

  const [orders, emailLogsByLeadId] = await Promise.all([
    getPaymentOrders({ includeFallback: false }),
    getEmailLogsByLeadId(),
  ]);

  const mappedLeads = (data as DbLead[]).map((lead) => mapDbLead(lead, orders, emailLogsByLeadId));
  const matchedOrderCodes = new Set(mappedLeads.map((lead) => lead.orderCode).filter(Boolean));
  const orderOnlyLeads = orders
    .filter((order) => !matchedOrderCodes.has(order.orderCode))
    .map(buildLeadFromOrder);

  return [...mappedLeads, ...orderOnlyLeads].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getLeadById(leadId: string) {
  const leads = await getLeads({ includeFallback: false });
  return leads.find((lead) => lead.id === leadId) ?? null;
}

export async function getLeadEmailLogs(leadId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("lead_email_logs")
    .select(leadEmailLogSelectFields)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as DbLeadEmailLog[]).map(mapEmailLog);
}

export async function recordLeadEmailLog(input: {
  leadId?: string | null;
  orderCode?: string | null;
  email: string;
  template: string;
  status: "success" | "failed";
  errorMessage?: string | null;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, error: "Missing Supabase admin client" };
  }

  const { error } = await supabase.from("lead_email_logs").insert({
    lead_id: input.leadId ?? null,
    order_code: input.orderCode ?? null,
    email: input.email,
    template: input.template,
    status: input.status,
    error_message: input.errorMessage ?? null,
  });

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}

export async function resyncUnsyncedLeadsToGoogleSheet() {
  const leads = await getLeads({ includeFallback: false });
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ leadId?: string; error: string }> = [];

  for (const lead of leads) {
    if (lead.googleSheetSyncedAt && !lead.googleSheetSyncError) {
      skipped += 1;
      continue;
    }

    const result = await syncLeadToGoogleSheet(lead, { source: lead.source });

    if (result.ok && !result.skipped) {
      synced += 1;
      await updateLeadSheetState(lead.id, { googleSheetSyncedAt: new Date().toISOString(), googleSheetSyncError: null });
      await logStudentActivity({
        leadId: lead.id ?? null,
        studentEmail: lead.email,
        studentPhone: lead.phone,
        eventType: "sheet_sync_success",
        eventTitle: "Đã đồng bộ lại Google Sheet",
        eventDescription: "Lead đã được sync lại từ Admin.",
        status: "success",
        actorType: "system",
        metadata: { source: lead.source, manualBackfill: true },
      });
    } else if (result.skipped) {
      skipped += 1;
    } else {
      failed += 1;
      const error = result.reason ?? "Google Sheet sync failed";
      errors.push({ leadId: lead.id, error });
      await updateLeadSheetState(lead.id, { googleSheetSyncError: error });
      await logStudentActivity({
        leadId: lead.id ?? null,
        studentEmail: lead.email,
        studentPhone: lead.phone,
        eventType: "sheet_sync_failed",
        eventTitle: "Đồng bộ lại Google Sheet thất bại",
        eventDescription: error,
        status: "failed",
        actorType: "system",
        metadata: { source: lead.source, manualBackfill: true },
      });
    }
  }

  return { synced, skipped, failed, errors };
}

export async function syncLeadByIdToGoogleSheet(leadId: string) {
  const lead = await getLeadById(leadId);

  if (!lead) {
    return { ok: false, skipped: false, reason: "Lead not found" };
  }

  const result = await syncLeadToGoogleSheet(lead, { source: lead.source });

  if (result.ok && !result.skipped) {
    await updateLeadSheetState(lead.id, { googleSheetSyncedAt: new Date().toISOString(), googleSheetSyncError: null });
    await logStudentActivity({
      leadId: lead.id ?? null,
      studentEmail: lead.email,
      studentPhone: lead.phone,
      eventType: "sheet_sync_success",
      eventTitle: "Đã đồng bộ Google Sheet",
      eventDescription: "Lead đã được gửi sang Google Sheet.",
      status: "success",
      actorType: "system",
      metadata: { source: lead.source, dedupeKey: lead.id },
    });
  } else if (!result.ok) {
    await updateLeadSheetState(lead.id, { googleSheetSyncError: result.reason ?? "Google Sheet sync failed" });
    await logStudentActivity({
      leadId: lead.id ?? null,
      studentEmail: lead.email,
      studentPhone: lead.phone,
      eventType: "sheet_sync_failed",
      eventTitle: "Đồng bộ Google Sheet thất bại",
      eventDescription: result.reason ?? "Google Sheet sync failed",
      status: "failed",
      actorType: "system",
      metadata: { source: lead.source, status: result.status ?? null },
    });
  }

  return result;
}
