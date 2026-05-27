import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const csvPath = "E:\\300_khach_hang_khoa_hoc_gmail_random.csv";
const batchSource = "course-gmail-batch-20260527";
const outputDir = path.join(repoRoot, "docs", "demo-imports");
const manifestPath = path.join(outputDir, `${batchSource}.json`);

function parseEnv(text) {
  const env = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }

  return env;
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim())) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim())) {
      rows.push(row);
    }
  }

  const [header, ...body] = rows;
  if (!header) {
    return [];
  }

  return body.map((cells) =>
    Object.fromEntries(header.map((name, index) => [name.trim().replace(/^\uFEFF/, ""), (cells[index] ?? "").trim()])),
  );
}

function toLead(row, index) {
  return {
    name: row["Tên"] || "Chưa có tên",
    phone: row.SDT || "",
    email: row.Gmail || "",
    message: `Nguồn nhập: danh sách khách khóa học Gmail random. Batch: ${batchSource}. Dòng CSV: ${index + 2}.`,
    source: batchSource,
    created_at: new Date().toISOString(),
  };
}

async function getSupabase() {
  const env = parseEnv(await readFile(path.join(repoRoot, ".env.local"), "utf8"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function importLeads({ apply }) {
  const supabase = await getSupabase();
  const rows = parseCsv(await readFile(csvPath, "utf8"));
  const leads = rows.map(toLead);

  const { count: existingCount, error: existingError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("source", batchSource);

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingCount) {
    throw new Error(`Batch source already exists with ${existingCount} row(s): ${batchSource}`);
  }

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", csvPath, batchSource, rows: rows.length, sample: leads.slice(0, 3) }, null, 2));
    return;
  }

  const { data, error } = await supabase.from("leads").insert(leads).select("id,name,phone,email,source,created_at");
  if (error) {
    throw new Error(error.message);
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        batchSource,
        csvPath,
        importedAt: new Date().toISOString(),
        importedCount: data.length,
        deleteSql: `delete from public.leads where source = '${batchSource}';`,
        note: "Customer rows are intentionally not stored in git. Delete this batch by source marker.",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(JSON.stringify({ mode: "applied", batchSource, importedCount: data.length, manifestPath }, null, 2));
}

async function deleteLeads({ apply }) {
  const supabase = await getSupabase();
  const manifest = JSON.parse((await readFile(manifestPath, "utf8")).replace(/^\uFEFF/, ""));
  const { count, error: countError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("source", manifest.batchSource);

  if (countError) {
    throw new Error(countError.message);
  }

  if (!apply) {
    console.log(JSON.stringify({ mode: "delete-dry-run", batchSource: manifest.batchSource, rowsMatched: count ?? 0 }, null, 2));
    return;
  }

  const { error } = await supabase.from("leads").delete().eq("source", manifest.batchSource);
  if (error) {
    throw new Error(error.message);
  }

  console.log(JSON.stringify({ mode: "deleted", batchSource: manifest.batchSource, rowsMatchedBeforeDelete: count ?? 0 }, null, 2));
}

const args = new Set(process.argv.slice(2));

if (args.has("--delete")) {
  await deleteLeads({ apply: args.has("--apply") });
} else {
  await importLeads({ apply: args.has("--apply") });
}
