import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const bridgePath = join(root, "app", "app-login-bridge", "page.tsx");

test("website deploy worktree includes app login bridge route", () => {
  assert.equal(existsSync(bridgePath), true);
});

test("app login bridge redirects outside the app API fetch try/catch", () => {
  const source = readFileSync(bridgePath, "utf8");
  const redirectIndex = source.lastIndexOf("redirect(loginUrl)");
  const catchIndex = source.lastIndexOf("} catch");

  assert.match(source, /requestAppLoginLink/);
  assert.ok(redirectIndex > catchIndex, "redirect(loginUrl) must stay outside the fetch try/catch");
});

test("app login bridge skips Supabase network auth when no auth cookie exists", () => {
  const source = readFileSync(bridgePath, "utf8");
  const cookieCheckIndex = source.indexOf("hasSupabaseAuthCookie");
  const getUserIndex = source.indexOf("supabase.auth.getUser()");

  assert.ok(cookieCheckIndex > -1, "bridge should check for Supabase auth cookie before getUser");
  assert.ok(getUserIndex > cookieCheckIndex, "cookie check should run before Supabase getUser");
  assert.match(source, /if \(!\(await hasSupabaseAuthCookie\(\)\)\) \{\s*redirect\(nextAfterLogin\);\s*\}/s);
});
