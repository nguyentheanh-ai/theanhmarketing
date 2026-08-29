import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loginSource = await readFile(
  new URL("../components/auth/login-form.tsx", import.meta.url),
  "utf8",
);
const registerSource = await readFile(
  new URL("../components/auth/register-form.tsx", import.meta.url),
  "utf8",
);
const trialModalSource = await readFile(
  new URL("../components/course/ai-marketing-sales-page.tsx", import.meta.url),
  "utf8",
);

test("customer auth surfaces do not offer Google OAuth", () => {
  for (const [name, source] of [
    ["login form", loginSource],
    ["registration form", registerSource],
    ["trial modal", trialModalSource],
  ]) {
    assert.doesNotMatch(source, /signInWithOAuth/, `${name} must not call Google OAuth`);
    assert.doesNotMatch(source, /handleGoogleLogin/, `${name} must not keep a Google handler`);
    assert.doesNotMatch(
      source,
      /(Đăng nhập với Google|Đăng ký \/ đăng nhập với Google|Tiếp tục với Google)/,
      `${name} must not show a Google auth label`,
    );
  }
});

test("login form links registered customers to the login guide", () => {
  assert.match(loginSource, /Bạn đã đăng ký\?/);
  assert.match(loginSource, /href="\/huong-dan"/);
  assert.match(loginSource, />\s*Xem hướng dẫn đăng nhập\s*</);
});

test("email and password account flows remain available", () => {
  assert.match(loginSource, /signInWithPassword/);
  assert.match(loginSource, /href="\/quen-mat-khau"/);
  assert.match(loginSource, /name="rememberLogin"/);
  assert.match(registerSource, /router\.push\(`\/thanh-toan\/\$\{orderData\.order\.orderCode\}`\)/);
  assert.match(registerSource, /CompleteRegistration/);
  assert.match(trialModalSource, /signInWithPassword/);
  assert.match(trialModalSource, /signUp/);
});
