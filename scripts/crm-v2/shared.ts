import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { maskEmail, maskPhone, normalizeEmail, normalizePhone } from "../../lib/crm-v2/normalize";

export type ScriptOptions = {
  apply: boolean;
  requireLive: boolean;
  strict: boolean;
  runLabel: string;
};

export function parseScriptOptions(argv = process.argv.slice(2)): ScriptOptions {
  const getValue = (name: string, fallback: string) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] ?? fallback : fallback;
  };

  return {
    apply: argv.includes("--apply"),
    requireLive: argv.includes("--require-live"),
    strict: argv.includes("--strict"),
    runLabel: getValue("--run-label", `crm-v2-${new Date().toISOString()}`),
  };
}

export function getSupabaseAdminClient(options: Pick<ScriptOptions, "requireLive">): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    if (options.requireLive) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function countRows(client: SupabaseClient, schema: string, table: string) {
  const { count, error } = await client.schema(schema).from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${schema}.${table}: ${error.message}`);
  return count ?? 0;
}

export async function fetchPaged(client: SupabaseClient, schema: string, table: string, columns = "*", pageSize = 500) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await client.schema(schema).from(table).select(columns).range(from, to);
    if (error) throw new Error(`${schema}.${table}: ${error.message}`);
    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export function maskLead(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? row.order_code ?? row.code ?? "unknown"),
    name: row.name ? `${String(row.name).slice(0, 2)}***` : null,
    email: maskEmail(typeof row.email === "string" ? row.email : null),
    phone: maskPhone(typeof row.phone === "string" ? row.phone : null),
    normalized_email: normalizeEmail(typeof row.email === "string" ? row.email : null),
    normalized_phone: normalizePhone(typeof row.phone === "string" ? row.phone : null),
  };
}

export function printJson(payload: unknown) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
