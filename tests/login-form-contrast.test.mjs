import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../components/auth/login-form.tsx", import.meta.url),
  "utf8",
);
const globalStyles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("login fields use a readable light surface and visible focus state", () => {
  const emailClasses = source.match(/<input\s+className="([^"]+)"\s+name="email"/)?.[1];
  const passwordClasses = source.match(/<input\s+className="([^"]+)"\s+name="password"/)?.[1];

  assert.ok(emailClasses, "email field classes must be discoverable");
  assert.ok(passwordClasses, "password field classes must be discoverable");
  assert.ok(emailClasses.split(" ").includes("login-readable-input"));
  assert.ok(passwordClasses.split(" ").includes("login-readable-input"));

  for (const className of [
    "bg-white",
    "text-slate-950",
    "placeholder:text-slate-500",
    "focus:border-sky-400",
    "focus:ring-4",
    "focus:ring-sky-400/20",
  ]) {
    assert.ok(emailClasses.split(" ").includes(className), `email field must include ${className}`);
    assert.ok(passwordClasses.split(" ").includes(className), `password field must include ${className}`);
  }

  assert.match(source, /text-sm font-bold text-slate-900">Email/);
  assert.match(source, /text-sm font-bold text-slate-900">Mật khẩu/);
  assert.match(source, /text-slate-700[^>]*>\s*<input[\s\S]*?name="rememberLogin"/);
  assert.match(
    globalStyles,
    /\.ai-panel input\.login-readable-input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)/,
  );
  assert.match(globalStyles, /background-color:\s*#ffffff\s*!important/);
  assert.match(globalStyles, /color:\s*#0f172a\s*!important/);
  assert.match(globalStyles, /\.login-readable-input::placeholder/);
});

test("login password can be shown or hidden with an accessible eye button", () => {
  assert.match(source, /const \[showPassword, setShowPassword\] = useState\(false\)/);
  assert.match(source, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(source, /aria-label=\{showPassword \? "Ẩn mật khẩu" : "Hiện mật khẩu"\}/);
  assert.match(source, /onClick=\{\(\) => setShowPassword\(\(visible\) => !visible\)\}/);
  assert.match(source, /showPassword \? <EyeOff/);
  assert.match(source, /: <Eye/);
});

test("login supporting copy stays visible on the public light card", () => {
  assert.match(source, /tracking-\[0\.12em\] text-slate-500/);
  assert.match(source, /text-xs font-bold text-sky-700 hover:text-sky-800/);
  assert.match(source, /border-slate-200 bg-slate-50[^>]*text-slate-700/);
  assert.match(source, /bg-slate-50[^>]*text-slate-600/);
});

test("login behavior and recovery controls remain intact", () => {
  for (const behavior of [
    "handleGoogleLogin",
    'href="/quen-mat-khau"',
    "rememberLogin",
    "signInWithPassword",
  ]) {
    assert.ok(source.includes(behavior), `login form must preserve ${behavior}`);
  }
});
