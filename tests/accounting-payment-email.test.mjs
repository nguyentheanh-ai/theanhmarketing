import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(relativePath, "utf8");

test("orders persist dedicated accounting email delivery state", () => {
  const migration = read("supabase/migrations/20260803090000_add_accounting_email_markers.sql");
  const orderService = read("services/orderService.ts");

  for (const field of ["accounting_email_sent_at", "accounting_email_last_error"]) {
    assert.match(migration, new RegExp(field));
    assert.match(orderService, new RegExp(field));
  }

  assert.match(orderService, /accountingEmailSentAt/);
  assert.match(orderService, /accountingEmailLastError/);
  assert.match(orderService, /markAccountingEmailSent/);
  assert.match(orderService, /markAccountingEmailError/);
});
