import { countRows, getSupabaseAdminClient, parseScriptOptions, printJson } from "./shared";

const sourceTables = [
  "leads",
  "orders",
  "activity_logs",
  "lead_activities",
  "lead_notes",
  "email_logs",
  "lead_email_logs",
  "admin_deleted_students",
  "courses",
  "course_modules",
  "lessons",
];

async function main() {
  const options = parseScriptOptions();
  const client = getSupabaseAdminClient(options);

  if (!client) {
    printJson({
      ok: true,
      mode: "offline",
      message: "No Supabase env found. Re-run with --require-live in a secure environment for production counts.",
      sourceTables,
    });
    return;
  }

  const counts: Record<string, number | string> = {};
  for (const table of sourceTables) {
    try {
      counts[table] = await countRows(client, "public", table);
    } catch (error) {
      counts[table] = error instanceof Error ? `missing_or_inaccessible: ${error.message}` : "missing_or_inaccessible";
    }
  }

  printJson({
    ok: true,
    mode: "live",
    masked: true,
    countedAt: new Date().toISOString(),
    counts,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
