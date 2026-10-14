#!/usr/bin/env node
// Read-only E2E for a dedicated QA account entitled to the Facebook Ads Ebook.
// Never print cookies, signed URLs, credentials, or private file bytes.
import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

const base = new URL(process.env.QA_BASE_URL ?? "https://theanh-main-cf-staging.12c1thdtheanh.workers.dev");
if (base.protocol !== "https:" || !base.hostname.startsWith("theanh-main-cf-staging.")) {
  throw new Error("This smoke test only targets the main Cloudflare staging Worker.");
}
const credentialPath = process.env.QA_EBOOK_CREDENTIALS_FILE;
const accessPath = process.env.QA_ACCESS_TOKEN_FILE;
if (!credentialPath || !accessPath || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Set QA_EBOOK_CREDENTIALS_FILE, QA_ACCESS_TOKEN_FILE, and the public Supabase configuration.");
}
const credentials = JSON.parse(readFileSync(credentialPath, "utf8"));
const access = JSON.parse(readFileSync(accessPath, "utf8"));
if (!credentials.email || !credentials.password || !access.client_id || !access.client_secret) {
  throw new Error("The QA credential and Access token files are incomplete.");
}
const accessHeaders = {
  "CF-Access-Client-Id": access.client_id,
  "CF-Access-Client-Secret": access.client_secret,
};
const jar = new Map();
const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
const pdfPath = "/api/ebook/facebook-ads/pdf?accepted=1&format=json";
const pagePath = "/api/ebook/facebook-ads/page?part=1&page=1";
const request = (path, cookie = "") => fetch(new URL(path, base), {
  redirect: "manual",
  headers: { ...accessHeaders, ...(cookie ? { cookie } : {}) },
});
function assert(condition, label) {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) process.exitCode = 1;
}
function signedLocation(response) {
  const raw = response.headers.get("location");
  if (!raw) return null;
  const target = new URL(raw, base);
  return target.origin === base.origin && target.pathname === "/__cf/private-r2" ? target : null;
}

try {
  const guestPdf = await request(pdfPath);
  const guestPage = await request(pagePath);
  assert(guestPdf.status === 401 && guestPage.status === 401, "guest cannot obtain Ebook URLs");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email, password: credentials.password,
  });
  if (error || !data.session || !jar.size) throw new Error("QA Ebook account login failed.");
  const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  const pdf = await request(pdfPath, cookie);
  const pdfJson = pdf.status === 200 ? await pdf.json().catch(() => null) : null;
  const pdfUrl = pdfJson?.url ? signedLocation(new Response(null, { headers: { Location: pdfJson.url } })) : null;
  assert(pdf.status === 200 && pdfJson?.ok === true && pdfUrl, "entitled QA account receives an R2 PDF URL");

  const page = await request(pagePath, cookie);
  const pageUrl = signedLocation(page);
  assert(page.status === 302 && pageUrl, "entitled QA account receives an R2 page URL");

  if (pdfUrl) {
    const result = await fetch(pdfUrl, { headers: { ...accessHeaders, Range: "bytes=0-7" }, redirect: "manual" });
    const bytes = new Uint8Array(await result.arrayBuffer());
    assert(result.status === 206 && result.headers.get("content-range")?.startsWith("bytes 0-7/") &&
      new TextDecoder().decode(bytes.slice(0, 4)) === "%PDF" &&
      result.headers.get("content-disposition")?.includes("Facebook%20Ads%202026"),
    "PDF R2 byte range and download filename are correct");
  }
  if (pageUrl) {
    const result = await fetch(pageUrl, { headers: { ...accessHeaders, Range: "bytes=0-7" }, redirect: "manual" });
    const bytes = new Uint8Array(await result.arrayBuffer());
    const png = [137, 80, 78, 71, 13, 10, 26, 10];
    assert(result.status === 206 && bytes.length === 8 && png.every((value, index) => bytes[index] === value),
      "Ebook image R2 byte range contains a PNG header");
  }
} catch {
  console.error("FAIL Ebook R2 smoke: request or QA login failed; no credentials or signed URLs were logged.");
  process.exitCode = 1;
}
