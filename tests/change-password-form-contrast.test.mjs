import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../components/auth/change-password-form.tsx", import.meta.url),
  "utf8",
);
const globalStyles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("first-password-change fields remain readable on the public light card", () => {
  const passwordClasses = source.match(
    /<input\s+className="([^"]+)"\s+minLength=\{8\}\s+name="password"/,
  )?.[1];
  const confirmClasses = source.match(
    /<input\s+className="([^"]+)"\s+minLength=\{8\}\s+name="confirmPassword"/,
  )?.[1];

  assert.ok(passwordClasses, "new-password field classes must be discoverable");
  assert.ok(confirmClasses, "confirm-password field classes must be discoverable");

  for (const classes of [passwordClasses, confirmClasses]) {
    assert.ok(classes.split(" ").includes("auth-readable-input"));
    assert.ok(classes.split(" ").includes("bg-white"));
    assert.ok(classes.split(" ").includes("text-slate-950"));
    assert.ok(classes.split(" ").includes("placeholder:text-slate-500"));
  }

  assert.match(source, /text-sm font-bold text-slate-900">Mật khẩu mới/);
  assert.match(source, /text-sm font-bold text-slate-900">Nhập lại mật khẩu mới/);
  assert.match(globalStyles, /input\.auth-readable-input/);
  assert.match(globalStyles, /\.auth-readable-input::placeholder/);
});

test("password update behavior remains intact", () => {
  for (const behavior of [
    "supabase.auth.updateUser",
    "must_change_password: false",
    "password_changed_at",
    "router.push(nextPath)",
  ]) {
    assert.ok(source.includes(behavior), `change-password form must preserve ${behavior}`);
  }
});
