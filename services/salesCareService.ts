import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readAllAdminRows } from "@/lib/admin/read-all-rows";
import { customerIdentity } from "@/services/adminCustomerService";
import { isSalesCareStatus, salesCareStatuses, type SalesCareEntry, type SalesCareStatus } from "@/lib/admin/sales-care";
import type { SalesCustomer } from "@/lib/admin/sales-dashboard";

const fields = "id,event_description,actor_name,actor_email,created_at,metadata";
type CareRow = { id: string; event_description: string | null; actor_name: string | null; actor_email: string | null; created_at: string; metadata: Record<string, unknown> };
function client() {
  const db = createSupabaseAdminClient();
  if (!db) throw new Error("Nguồn chăm sóc khách hàng chưa sẵn sàng.");
  return db;
}
function entry(row: CareRow): SalesCareEntry {
  if (!isSalesCareStatus(row.metadata.careStatus)) throw new Error("Dữ liệu chăm sóc không hợp lệ.");
  return { id: row.id, status: row.metadata.careStatus, note: row.event_description || "", actorName: row.actor_name || "", actorEmail: row.actor_email || "", updatedAt: row.created_at };
}
function key(row: SalesCustomer) { return customerIdentity(row.email, row.phone, row.id); }
function query() {
  return client().from("activity_logs").select(fields, { count: "exact" })
    .eq("event_type", "sale_status_updated").eq("metadata->>action", "sales_care");
}
export async function listSalesCareSummaries(records: SalesCustomer[]) {
  const summaries: Record<string, SalesCareEntry> = {};
  // Batch only the visible role's customer identities; never read another role's notes.
  for (let offset = 0; offset < records.length; offset += 100) {
    const batch = records.slice(offset, offset + 100);
    const rows = await readAllAdminRows<CareRow>((from, to) => query().in("metadata->>customerKey", batch.map(key)).order("id").range(from, to), "lịch sử chăm sóc");
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    const latest = new Map<string, CareRow>();
    for (const row of rows) {
      const identity = String(row.metadata.customerKey);
      if (!latest.has(identity)) latest.set(identity, row);
    }
    for (const record of batch) {
      const row = latest.get(key(record));
      if (row) summaries[record.id] = entry(row);
    }
  }
  return summaries;
}
export async function getSalesCareHistory(record: SalesCustomer) {
  const { data, error } = await query().eq("metadata->>customerKey", key(record))
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(30);
  if (error || !data) throw new Error("Không đọc được lịch sử chăm sóc.");
  return (data as CareRow[]).map(entry);
}
export async function saveSalesCare(record: SalesCustomer, input: { status: SalesCareStatus; note: string }, actor: { id: string; email?: string; name: string }) {
  // One append is both the saved state and its audit trail; never change payment or the original lead note.
  const { data, error } = await client().from("activity_logs").insert({
    event_type: "sale_status_updated", event_title: salesCareStatuses[input.status],
    event_description: input.note || null, status: "success", actor_type: "admin",
    actor_id: actor.id, actor_email: actor.email || null, actor_name: actor.name.slice(0, 160),
    student_email: record.email || null, student_phone: record.phone || null,
    metadata: { action: "sales_care", customerKey: key(record), careStatus: input.status },
  }).select(fields).single();
  if (error || !data) throw new Error("Chưa xác nhận được lần lưu. Hãy tải lại lịch sử trước khi thử lại.");
  return entry(data as CareRow);
}
