import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const requiredEnv = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_SHEETS_WEBHOOK_URL"];
const envFileIndex = process.argv.indexOf("--dotenv-file");
const envFilePath = process.env.BACKFILL_ENV_FILE || (envFileIndex >= 0 ? process.argv[envFileIndex + 1] : "");
const debugEnv = process.argv.includes("--debug-env");

if (envFilePath) {
  const loadedKeys = loadEnvFile(envFilePath);
  if (debugEnv) {
    console.log(JSON.stringify({ envFilePath: true, loadedKeys, hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) }));
  }
} else if (debugEnv) {
  console.log(JSON.stringify({ envFilePath: false, loadedKeys: 0, hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) }));
}

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env ${key}`);
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const webhookUrl = new URL(process.env.GOOGLE_SHEETS_WEBHOOK_URL);
const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || "https://theanhmarketing.com");
const batchSize = Number.parseInt(process.env.GOOGLE_SHEETS_BACKFILL_BATCH_SIZE || "500", 10);
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const resetMonthly = process.argv.includes("--reset-monthly");
const startIndexArg = process.argv.indexOf("--start-index");
const startIndex =
  startIndexArg >= 0 ? Math.max(0, Number.parseInt(process.argv[startIndexArg + 1] || "0", 10) || 0) : 0;
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg >= 0 ? Math.max(0, Number.parseInt(process.argv[limitArg + 1] || "0", 10) || 0) : 0;

if (webhookUrl.hostname !== "script.google.com" || !webhookUrl.pathname.endsWith("/exec")) {
  throw new Error("GOOGLE_SHEETS_WEBHOOK_URL must be an Apps Script /exec URL.");
}

function loadEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  let loadedKeys = 0;

  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#") || !line.includes("=")) continue;

    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && !process.env[key]) {
      process.env[key] = value;
      loadedKeys += 1;
    }
  }

  return loadedKeys;
}

function normalizeSiteUrl(value) {
  try {
    const url = new URL(value);
    url.protocol = "https:";
    if (url.hostname === "www.theanhmarketing.com") {
      url.hostname = "theanhmarketing.com";
    }
    return url.origin;
  } catch {
    return "https://theanhmarketing.com";
  }
}

function formatVietnamDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function toNumber(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatSheetPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  return `="${digits}"`;
}

function getOrderCodeFromMetadata(value) {
  const orderCode = value && typeof value === "object" ? value.orderCode : "";
  return typeof orderCode === "string" ? orderCode.trim().toUpperCase() : "";
}

function buildPayload(row) {
  const amount = toNumber(row.amount);
  const orderCode = row.order_code || row.id;
  const createdAt = row.created_at || new Date().toISOString();
  const date = formatVietnamDateTime(createdAt);
  const paidAt = row.paid_at ? formatVietnamDateTime(row.paid_at) : "";
  const expiresAt = row.expires_at ? formatVietnamDateTime(row.expires_at) : "";
  const paymentUrl = `${siteUrl}/thanh-toan/${encodeURIComponent(orderCode)}`;

  return {
    entityType: "order",
    dedupeKey: orderCode,
    date,
    orderCode,
    name: row.student_name || row.customer_name || "",
    email: row.email || "",
    phone: formatSheetPhone(row.phone),
    courseSlug: row.course_slug || "",
    courseTitle: row.course_title || row.product_name || "",
    amount,
    status: row.status || row.payment_status || "pending",
    paymentMethod: row.payment_method || "sepay",
    paymentUrl,
    paidAt,
    expiresAt,
    sepayReferenceCode: row.sepay_reference_code || "",
  };
}

async function fetchAllOrders() {
  const rows = [];

  for (let from = 0; ; from += batchSize) {
    const to = from + batchSize - 1;
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,order_code,student_name,customer_name,email,phone,course_slug,course_title,product_name,amount,currency,status,payment_status,payment_method,paid_at,expires_at,created_at,sepay_reference_code,order_items,utm_source,utm_medium,utm_campaign,utm_content,utm_id,utm_term,campaign_id,campaign_name,adset_id,ad_id,ad_name,fbclid,fbc,fbp",
      )
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < batchSize) break;
  }

  return rows;
}

async function fetchSyncedOrderCodes() {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("metadata")
    .eq("event_type", "sheet_sync_success")
    .limit(10000);

  if (error) throw error;
  return new Set((data || []).map((row) => getOrderCodeFromMetadata(row.metadata)).filter(Boolean));
}

async function logSuccess(order, status) {
  const { error } = await supabase.from("activity_logs").insert({
    lead_id: order.lead_id || null,
    student_email: order.email || null,
    student_phone: order.phone || null,
    event_type: "sheet_sync_success",
    event_title: "Da backup Google Sheet",
    event_description: "Order da duoc backup sang Google Sheet tu script van hanh.",
    status: "success",
    actor_type: "system",
    metadata: {
      orderCode: order.order_code || order.id,
      source: "production-order-backfill-script",
      status,
      webhookHost: webhookUrl.hostname,
    },
  });

  if (error) throw error;
}

async function postOrder(order) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(buildPayload(order)),
  });
  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 160)}`);
  }

  if (responseText.trim()) {
    const parsed = JSON.parse(responseText);
    if (parsed.ok === false || parsed.success === false || parsed.error) {
      throw new Error(String(parsed.error || parsed.message || "Apps Script returned failure"));
    }
  }

  return response.status;
}

async function resetMonthlyOrders(ordersToReset) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      action: "reset",
      clearLegacyOrders: true,
      records: ordersToReset.map(buildPayload),
    }),
  });
  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 160)}`);
  }

  const parsed = responseText.trim() ? JSON.parse(responseText) : {};

  if (parsed.ok === false || parsed.success === false || parsed.error) {
    throw new Error(String(parsed.error || parsed.message || "Apps Script returned failure"));
  }

  return parsed;
}

const orders = await fetchAllOrders();
if (resetMonthly) {
  const payload = orders.map(buildPayload);
  console.log(
    JSON.stringify({
      dryRun,
      resetMonthly,
      scanned: orders.length,
      toReset: payload.length,
      firstOrder: payload[0]?.orderCode || null,
      lastOrder: payload[payload.length - 1]?.orderCode || null,
    }),
  );

  if (!dryRun) {
    const result = await resetMonthlyOrders(orders);
    console.log(JSON.stringify({ done: true, resetMonthly: true, result }));
  }

  process.exit(0);
}

const syncedOrderCodes = await fetchSyncedOrderCodes();
const candidateOrders = force ? orders : orders.filter((order) => !syncedOrderCodes.has(String(order.order_code || order.id).toUpperCase()));
const remainingOrders = candidateOrders.slice(startIndex);
const missingOrders = limit > 0 ? remainingOrders.slice(0, limit) : remainingOrders;
let synced = 0;
let failed = 0;

console.log(
  JSON.stringify({
    dryRun,
    force,
    startIndex,
    limit,
    scanned: orders.length,
    alreadySynced: orders.length - candidateOrders.length,
    toSync: missingOrders.length,
  }),
);

if (!dryRun) {
  for (const order of missingOrders) {
    try {
      const status = await postOrder(order);
      await logSuccess(order, status);
      synced += 1;
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({ orderCode: order.order_code || order.id, error: error.message }));
    }
  }
}

console.log(JSON.stringify({ ok: failed === 0, synced, failed }));

if (failed > 0) {
  process.exitCode = 1;
}
