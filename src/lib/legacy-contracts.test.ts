import { describe, expect, it } from "vitest";

import {
  additiveAdminTables,
  legacyFacebookPixelContract,
  legacyStudentAccessContract,
  preservedLegacyTables,
} from "./legacy-contracts";

describe("legacy website data contracts", () => {
  it("keeps production source-of-truth tables out of additive admin migrations", () => {
    const preserved = new Set(preservedLegacyTables);

    for (const table of additiveAdminTables) {
      expect(preserved.has(table as (typeof preservedLegacyTables)[number])).toBe(false);
    }
  });

  it("preserves the old student access rule based on paid orders and admin-student leads", () => {
    expect(legacyStudentAccessContract.ordersTable).toBe("orders");
    expect(legacyStudentAccessContract.paidStatus).toBe("paid");
    expect(legacyStudentAccessContract.manualStudentLeadPrefix).toBe("admin-student:");
    expect(legacyStudentAccessContract.preservedFields).toContain("order_items");
  });

  it("keeps Facebook Pixel settings in the existing marketing site_settings record", () => {
    expect(legacyFacebookPixelContract.table).toBe("site_settings");
    expect(legacyFacebookPixelContract.key).toBe("marketing");
    expect(legacyFacebookPixelContract.jsonFields).toContain("facebookPixelId");
  });
});
