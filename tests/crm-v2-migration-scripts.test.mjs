import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

function runScript(relativePath, args = []) {
  return spawnSync(process.execPath, [tsxCli, relativePath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  });
}

function parseJson(stdout) {
  return JSON.parse(stdout.trim());
}

test("CRM v2 migration scripts default to offline dry-run without Supabase env", () => {
  for (const script of [
    "scripts/crm-v2/audit-current-data.ts",
    "scripts/crm-v2/backfill-crm-v2.ts",
    "scripts/crm-v2/verify-migration.ts",
  ]) {
    const result = runScript(script);
    assert.equal(result.status, 0, `${script}\n${result.stdout}\n${result.stderr}`);
    assert.equal(parseJson(result.stdout).ok, true, `${script} should report ok in offline mode`);
  }
});

test("CRM v2 live-required scripts fail closed when Supabase env is missing", () => {
  for (const [script, args] of [
    ["scripts/crm-v2/audit-current-data.ts", ["--require-live"]],
    ["scripts/crm-v2/backfill-crm-v2.ts", ["--apply"]],
    ["scripts/crm-v2/verify-migration.ts", ["--strict"]],
  ]) {
    const result = runScript(script, args);
    assert.notEqual(result.status, 0, `${script} must fail when live access is required but env is missing`);
    assert.match(result.stderr, /Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/);
  }
});
