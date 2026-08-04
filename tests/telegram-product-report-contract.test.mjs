import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function migrationSource() {
  const directory = path.resolve("supabase/migrations");
  const file = fs.readdirSync(directory).find((name) => name.endsWith("_telegram_meta_campaign_hourly_snapshots.sql"));
  assert.ok(file, "telegram MCP snapshot migration must exist");
  return fs.readFileSync(path.join(directory, file), "utf8");
}

test("MCP campaign-hour snapshots are private, hourly, and idempotent", () => {
  const migration = migrationSource();

  assert.match(migration, /create table public\.telegram_meta_campaign_hourly_snapshots/i);
  for (const column of [
    "ad_account_id",
    "entity_level",
    "entity_id",
    "entity_name",
    "local_start_at",
    "local_end_at",
    "spend",
    "data_status",
    "fetched_at",
  ]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`, "i"));
  }
  assert.match(migration, /unique\s*\(\s*ad_account_id\s*,\s*entity_level\s*,\s*entity_id\s*,\s*local_start_at\s*\)/i);
  assert.match(migration, /entity_level\s+in\s*\(\s*'account'\s*,\s*'campaign'\s*\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table[\s\S]+from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table[\s\S]+to service_role/i);
  assert.doesNotMatch(migration, /create policy/i);
});
