import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function supportMigration() {
  const directory = path.resolve("supabase/migrations");
  const file = fs.readdirSync(directory).find((name) => name.endsWith("_support_booking.sql"));
  assert.ok(file, "support booking migration must exist");
  return fs.readFileSync(path.join(directory, file), "utf8");
}

test("support booking migration is additive, private, indexed, and atomic", () => {
  const sql = supportMigration();

  assert.match(sql, /create table if not exists public\.support_bookings/i);
  assert.match(sql, /create table if not exists public\.support_busy_dates/i);
  assert.match(sql, /appointment_date date not null/i);
  assert.match(sql, /starts_at timestamptz not null/i);
  assert.match(sql, /amount bigint not null default 500000/i);
  assert.match(sql, /status text not null default 'held'/i);
  assert.match(sql, /check \(status in \('held', 'confirmed', 'needs_review', 'cancelled'\)\)/i);
  assert.match(sql, /references public\.orders\(id\)/i);
  assert.match(sql, /create index if not exists support_bookings_order_id_idx/i);
  assert.match(sql, /create index if not exists support_bookings_status_starts_at_idx/i);
  assert.match(sql, /where status in \('held', 'confirmed'\)/i);
  assert.match(sql, /alter table public\.support_bookings enable row level security/i);
  assert.match(sql, /alter table public\.support_busy_dates enable row level security/i);
  assert.match(sql, /revoke all on table public\.support_bookings from anon, authenticated/i);
  assert.match(sql, /revoke all on table public\.support_busy_dates from anon, authenticated/i);
  assert.match(sql, /create or replace function public\.reserve_support_booking/i);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /revoke all on function public\.reserve_support_booking/i);
  assert.match(sql, /grant execute on function public\.reserve_support_booking[^;]+to service_role/is);
});
