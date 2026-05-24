import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("cart toast has a close button that dismisses the floating cart only", () => {
  const source = readSource("components/cart/cart-toast.tsx");

  assert.match(source, /dismissed/);
  assert.match(source, /aria-label="Tắt giỏ hàng nổi"/);
  assert.match(source, /setDismissed\(true\)/);
  assert.match(source, /action === "add"/);
  assert.doesNotMatch(source, /clearCart/);
});
