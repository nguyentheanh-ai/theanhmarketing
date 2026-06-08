import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

const notificationFiles = [
  "lib/notifications/pending-payment-email.ts",
  "lib/notifications/payment-success-email.ts",
  "lib/notifications/student-access-email.ts",
  "lib/notifications/registration-email.ts",
];

test("notification emails use a Vietnamese-safe UI font stack instead of bare Arial", () => {
  for (const file of notificationFiles) {
    const source = read(file);

    assert.match(
      source,
      /'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif/,
      `${file} should use the shared readable email font stack`,
    );
    assert.doesNotMatch(source, /const emailFontFamily = `"/, `${file} should not inject double quotes into style attributes`);
    assert.doesNotMatch(source, /font-family:Arial(?:,|;)/, `${file} should not use bare Arial as the primary font`);
    assert.doesNotMatch(
      source,
      /<h1[^>]*letter-spacing:0\.08em;text-transform:uppercase;font-weight:900/,
      `${file} should not render main headings as heavily spaced uppercase text`,
    );
  }
});
