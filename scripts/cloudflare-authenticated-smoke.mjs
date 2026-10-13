#!/usr/bin/env node
// Read-only SSR smoke using a dedicated QA account. Never print credentials or tokens.
import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

const baseUrl = process.env.QA_BASE_URL;
const credentialsFile = process.env.QA_CREDENTIALS_FILE;
if (!baseUrl || !credentialsFile) {
  console.error("Set QA_BASE_URL and QA_CREDENTIALS_FILE.");
  process.exit(2);
}

const credentials = JSON.parse(readFileSync(credentialsFile, "utf8"));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey || !credentials.email || !credentials.password) {
  console.error("Missing Supabase public config or QA credentials.");
  process.exit(2);
}

const jar = new Map();
const client = createServerClient(supabaseUrl, anonKey, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (items) => {
      for (const { name, value } of items) {
        if (value) jar.set(name, value);
        else jar.delete(name);
      }
    },
  },
});

const lesson = "/learn/facebook-ads-2026/47da65a2-c6c6-4a21-a109-c1feb1d64c8f";
const accessHeaders = {};
if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
  accessHeaders["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID;
  accessHeaders["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET;
}

async function check(path, cookie, expectedStatus, expectedRedirectPrefix) {
  const response = await fetch(new URL(path, baseUrl), {
    headers: { ...accessHeaders, ...(cookie ? { cookie } : {}) },
    redirect: "manual",
  });
  const location = response.headers.get("location") ?? "";
  const redirectPath = location ? new URL(location, baseUrl).pathname : "";
  const passed = response.status === expectedStatus &&
    (!expectedRedirectPrefix || redirectPath.startsWith(expectedRedirectPrefix));
  console.log(`${passed ? "PASS" : "FAIL"} ${path}: HTTP ${response.status}${redirectPath ? ` -> ${redirectPath}` : ""}`);
  return passed;
}

try {
  const { data, error } = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  if (error || !data.session || !jar.size) {
    throw new Error("QA Supabase Auth login failed or SSR cookie was not set.");
  }
  console.log("PASS QA Supabase Auth session and SSR cookie");
  const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  const results = [];
  results.push(await check(lesson, "", 307, "/dang-nhap"));
  results.push(await check("/dashboard", cookie, 200));
  results.push(await check(lesson, cookie, 200));
  results.push(await check(lesson, cookie, 200)); // repeat request at the HTTP/SSR boundary
  if (results.some((passed) => !passed)) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "QA smoke failed.");
  process.exitCode = 1;
}
