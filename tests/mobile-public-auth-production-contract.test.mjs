import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  login: await readFile(new URL("../components/auth/login-form.tsx", import.meta.url), "utf8"),
  changePassword: await readFile(
    new URL("../components/auth/change-password-form.tsx", import.meta.url),
    "utf8",
  ),
  forgotPassword: await readFile(
    new URL("../components/auth/forgot-password-form.tsx", import.meta.url),
    "utf8",
  ),
  register: await readFile(new URL("../components/auth/register-form.tsx", import.meta.url), "utf8"),
  registerPage: await readFile(new URL("../app/dang-ky/page.tsx", import.meta.url), "utf8"),
  styles: await readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
};

test("the production branch keeps the complete public auth light-card contract on mobile", () => {
  assert.match(files.login, /text-slate-700[^>]*>\s*<input[\s\S]*?name="rememberLogin"/);
  assert.match(files.login, /aria-label=\{showPassword \? "Ẩn mật khẩu" : "Hiện mật khẩu"\}/);

  for (const source of [files.changePassword, files.forgotPassword, files.register]) {
    assert.match(source, /auth-readable-input/);
    assert.doesNotMatch(source, /placeholder:text-white/);
  }

  assert.match(files.registerPage, /pt-1 font-semibold text-slate-700/);
  assert.match(files.styles, /select\.auth-readable-input/);
});
