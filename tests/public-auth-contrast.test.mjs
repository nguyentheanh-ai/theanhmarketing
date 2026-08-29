import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const forgotSource = await readFile(
  new URL("../components/auth/forgot-password-form.tsx", import.meta.url),
  "utf8",
);
const registerSource = await readFile(
  new URL("../components/auth/register-form.tsx", import.meta.url),
  "utf8",
);
const registerPageSource = await readFile(
  new URL("../app/dang-ky/page.tsx", import.meta.url),
  "utf8",
);
const globalStyles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("forgot-password form is readable on the public light card", () => {
  assert.match(forgotSource, /text-sm font-bold text-slate-900">Email/);
  assert.match(forgotSource, /className="auth-readable-input [^"]*bg-white[^"]*text-slate-950/);
  assert.match(forgotSource, /placeholder:text-slate-500/);
  assert.match(forgotSource, /text-sky-700 hover:text-sky-800/);
  assert.match(forgotSource, /bg-sky-50[^"]*text-sky-900/);
});

test("registration form has no copied white-on-light field or supporting text styles", () => {
  for (const fieldName of ["name", "email", "password", "phone"]) {
    const fieldClasses = registerSource.match(
      new RegExp(`className="([^"]+)"[\\s\\S]{0,180}name="${fieldName}"`),
    )?.[1];
    assert.ok(fieldClasses, `${fieldName} field classes must be discoverable`);
    assert.ok(fieldClasses.split(" ").includes("auth-readable-input"));
    assert.ok(fieldClasses.split(" ").includes("bg-white"));
    assert.ok(fieldClasses.split(" ").includes("text-slate-950"));
  }

  assert.match(registerSource, /select\s+className="auth-readable-input/);
  assert.doesNotMatch(registerSource, /text-sm font-semibold text-white\/60/);
  assert.match(registerSource, /text-sm leading-6 text-slate-700/);
  assert.match(registerSource, /bg-slate-50[^"]*text-slate-700/);
  assert.match(registerPageSource, /pt-1 font-semibold text-slate-700/);
  assert.match(globalStyles, /select\.auth-readable-input/);
});

test("forgot-password and registration behavior remain intact", () => {
  for (const behavior of [
    'fetch("/api/auth/forgot-password"',
    "event.currentTarget.reset()",
  ]) {
    assert.ok(forgotSource.includes(behavior), `forgot-password form must preserve ${behavior}`);
  }

  for (const behavior of [
    "router.push(`/thanh-toan/${orderData.order.orderCode}`)",
    "CompleteRegistration",
  ]) {
    assert.ok(registerSource.includes(behavior), `registration form must preserve ${behavior}`);
  }
});
