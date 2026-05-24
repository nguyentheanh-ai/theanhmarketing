import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { preservedLegacyTables } from "./legacy-contracts";

describe("additive migration guard", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase", "migrations", "20260524170500_admin_growth_os_additive.sql"),
    "utf8",
  ).toLowerCase();

  it("does not recreate existing website source-of-truth tables", () => {
    for (const table of preservedLegacyTables) {
      expect(sql).not.toMatch(new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\b`));
    }
  });

  it("does not alter legacy website tables during the admin UI cutover", () => {
    for (const table of preservedLegacyTables) {
      expect(sql).not.toMatch(new RegExp(`alter\\s+table\\s+public\\.${table}\\b`));
    }
  });
});
