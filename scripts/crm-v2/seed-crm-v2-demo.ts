import { getSupabaseAdminClient, parseScriptOptions, printJson } from "./shared";
import { demoContacts, demoLeads } from "../../lib/crm-v2/mock-data";
import { normalizeEmail, normalizePhone } from "../../lib/crm-v2/normalize";

async function main() {
  const options = parseScriptOptions();
  if (process.env.CRM_V2_ALLOW_DEMO_SEED !== "true") {
    printJson({ ok: true, skipped: true, message: "Set CRM_V2_ALLOW_DEMO_SEED=true to allow demo seed." });
    return;
  }

  if (!options.apply) {
    printJson({ ok: true, dryRun: true, contacts: demoContacts.length, leads: demoLeads.length, message: "Re-run with --apply to seed demo CRM v2 data." });
    return;
  }

  const client = getSupabaseAdminClient({ requireLive: true });
  if (!client) throw new Error("Missing Supabase client.");

  for (const contact of demoContacts) {
    const { data, error } = await client
      .schema("crm_v2")
      .from("contacts")
      .upsert({
        full_name: contact.fullName,
        email: contact.email,
        phone: contact.phone,
        normalized_email: normalizeEmail(contact.email),
        normalized_phone: normalizePhone(contact.phone),
        source: contact.source,
        lifecycle_stage: contact.lifecycleStage,
        lead_score: contact.leadScore,
        marketing_consent: contact.marketingConsent ?? true,
        metadata: { demo: true },
      }, { onConflict: contact.email ? "normalized_email" : "normalized_phone" })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Cannot seed contact.");
  }

  printJson({ ok: true, seeded: { contacts: demoContacts.length }, dryRun: false });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
