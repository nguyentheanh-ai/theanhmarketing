// Writes the native test Worker secrets to a temp file (mode 600, never printed).
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const [authFile, out] = process.argv.slice(2);
const auth = fs.readFileSync(authFile, "utf8").trim();
const cred = execFileSync("/usr/bin/security", ["find-generic-password", "-w", "-s", "com.theanhmarketing.cloudflare-migration.backup-secret.native-a-credential", "-a", "theanh-main-cf-staging-credential"]).toString().trim();
const r = () => crypto.randomBytes(32).toString("base64url");
fs.writeFileSync(out, JSON.stringify({
  NATIVE_DATA_AUTHORITY: auth, NATIVE_AUTH_AUTHORITY: auth, NATIVE_AUTH_CREDENTIAL_KEY: cred,
  NATIVE_AUTH_LIMITER_KEY: r(), NATIVE_AUTH_REFRESH_KEY: r(), R2_PRIVATE_URL_SECRET: r(), STUDENT_PORTAL_PROVISION_SECRET: r(),
}), { mode: 0o600 });
