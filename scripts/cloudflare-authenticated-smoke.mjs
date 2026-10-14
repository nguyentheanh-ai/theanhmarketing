#!/usr/bin/env node
// Read-only by default. Optional progress write uses only the dedicated QA account.
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
const accessToken = process.env.QA_ACCESS_TOKEN_FILE
  ? JSON.parse(readFileSync(process.env.QA_ACCESS_TOKEN_FILE, "utf8"))
  : { client_id: process.env.CF_ACCESS_CLIENT_ID, client_secret: process.env.CF_ACCESS_CLIENT_SECRET };
if (accessToken.client_id && accessToken.client_secret) {
  accessHeaders["CF-Access-Client-Id"] = accessToken.client_id;
  accessHeaders["CF-Access-Client-Secret"] = accessToken.client_secret;
}

async function check(path, cookie, expectedStatus, expectedRedirectPrefix) {
  const response = await fetch(new URL(path, baseUrl), {
    headers: { ...accessHeaders, ...(cookie ? { cookie } : {}) },
    redirect: "manual",
  });
  const location = response.headers.get("location") ?? "";
  const redirectPath = location ? new URL(location, baseUrl).pathname : "";
  const html = response.status === 200 ? await response.text() : "";
  const idMatches = html.includes("47da65a2-c6c6-4a21-a109-c1feb1d64c8f");
  const playerMatches = html.includes('id="lesson-player"');
  const lessonListMatches = html.includes("Danh sách bài học");
  const errorBoundary = html.includes("Chưa tải được bài học");
  const lessonContentMatches = path !== lesson || !cookie || response.status !== 200 ||
    (idMatches && playerMatches && lessonListMatches && !errorBoundary);
  const passed = response.status === expectedStatus && lessonContentMatches &&
    (!expectedRedirectPrefix || redirectPath.startsWith(expectedRedirectPrefix));
  console.log(`${passed ? "PASS" : "FAIL"} ${path}: HTTP ${response.status}${redirectPath ? ` -> ${redirectPath}` : ""}${path === lesson && cookie && response.status === 200 ? `, lesson content ${lessonContentMatches ? "matched" : "missing"}, error boundary ${errorBoundary}` : ""}`);
  return passed;
}

async function verifyQaProgress(cookie) {
  if (process.env.QA_PROGRESS_WRITE !== "dedicated-qa-account") return true;
  const before = await fetch(new URL(lesson, baseUrl), { headers: { ...accessHeaders, cookie } });
  const beforeHtml = await before.text();
  if (before.status !== 200 || beforeHtml.includes("Chưa tải được bài học")) {
    console.log("FAIL QA progress: lesson unavailable before write");
    return false;
  }
  const wasCompleted = beforeHtml.includes("✓ Đã hoàn thành");
  const postProgress = async (completed) => {
    const response = await fetch(new URL("/api/student/progress", baseUrl), {
      method: "POST",
      headers: { ...accessHeaders, cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ courseSlug: "facebook-ads-2026", lessonId: "47da65a2-c6c6-4a21-a109-c1feb1d64c8f", completed }),
    });
    const result = await response.json().catch(() => null);
    return response.status === 200 && result?.ok === true &&
      Array.isArray(result.completedLessonIds) &&
      result.completedLessonIds.includes("47da65a2-c6c6-4a21-a109-c1feb1d64c8f") === completed;
  };
  let completed = false;
  let refreshed = false;
  let restored = wasCompleted;
  try {
    completed = await postProgress(true);
    if (completed) {
      const after = await fetch(new URL(lesson, baseUrl), { headers: { ...accessHeaders, cookie } });
      const afterHtml = await after.text();
      refreshed = after.status === 200 && afterHtml.includes("✓ Đã hoàn thành");
    }
  } finally {
    if (!wasCompleted) restored = await postProgress(false).catch(() => false);
  }
  console.log(`${completed && refreshed && restored ? "PASS" : "FAIL"} QA progress: write, refresh, restore previous state`);
  return completed && refreshed && restored;
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
  const videoPath = "/doi-ngu-nhan-su-ai/media/proof/editor-ai-jun-08-2026.mp4";
  const video = await fetch(new URL(videoPath, baseUrl), {
    headers: { ...accessHeaders, Range: "bytes=0-15" }, redirect: "manual",
  });
  const videoBytes = new Uint8Array(await video.arrayBuffer());
  const videoOk = video.status === 206 && videoBytes.length === 16 &&
    video.headers.get("content-range")?.startsWith("bytes 0-15/") &&
    new TextDecoder().decode(videoBytes.slice(4, 8)) === "ftyp";
  console.log(`${videoOk ? "PASS" : "FAIL"} public R2 video: HTTP ${video.status}, 16-byte MP4 range ${videoOk ? "matched" : "missing"}`);
  results.push(videoOk);
  const ebookPdfPath = "/api/ebook/facebook-ads/pdf?accepted=1&format=json";
  const ebookPagePath = "/api/ebook/facebook-ads/page?part=1&page=1";
  const guestPdf = await fetch(new URL(ebookPdfPath, baseUrl), { headers: accessHeaders, redirect: "manual" });
  const guestPage = await fetch(new URL(ebookPagePath, baseUrl), { headers: accessHeaders, redirect: "manual" });
  const deniedPdf = await fetch(new URL(ebookPdfPath, baseUrl), { headers: { ...accessHeaders, cookie }, redirect: "manual" });
  const deniedPage = await fetch(new URL(ebookPagePath, baseUrl), { headers: { ...accessHeaders, cookie }, redirect: "manual" });
  const ebookDenied = guestPdf.status === 401 && guestPage.status === 401 &&
    deniedPdf.status === 403 && deniedPage.status === 403;
  console.log(`${ebookDenied ? "PASS" : "FAIL"} Ebook authorization: guest ${guestPdf.status}/${guestPage.status}, QA without Ebook ${deniedPdf.status}/${deniedPage.status}`);
  results.push(ebookDenied);
  results.push(await verifyQaProgress(cookie));
  if (results.some((passed) => !passed)) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "QA smoke failed.");
  process.exitCode = 1;
}
