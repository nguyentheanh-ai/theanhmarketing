import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const pageSource = readFileSync("app/page.tsx", "utf8");

test("homepage no longer renders the A.G.S framework section", () => {
  assert.doesNotMatch(pageSource, /A\.G\.S Framework/);
  assert.doesNotMatch(pageSource, /Attract, Grow, Scale/);
  assert.doesNotMatch(pageSource, /EcosystemMapExact/);
  assert.doesNotMatch(pageSource, /EcosystemFeatureGrid/);
});
