import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const component = readFileSync("components/site/agent-kit-workflow.tsx", "utf8");
const page = readFileSync("app/page.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

test("homepage renders the Agent Kit workflow section instead of the old proof hub", () => {
  assert.match(page, /<AgentKitWorkflow \/>/);
  assert.doesNotMatch(page, /AI Growth Knowledge Hub/);
  assert.doesNotMatch(page, /Content pillar/);
});

test("Agent Kit workflow contains the requested headline and five jobs", () => {
  for (const text of [
    "Bộ Agent kit hỗ trợ",
    "90%",
    "công việc chuyên gia đang làm",
    "Edit video thương hiệu cá nhân",
    "Nghiên cứu lên kế hoạch",
    "Lên outline khóa học",
    "Tự động tạo ảnh - đăng bài",
    "Lên quảng cáo tự động ngay",
  ]) {
    assert.match(component, new RegExp(text));
  }
});

test("Agent Kit workflow has animated connection lines flowing into the center", () => {
  assert.match(component, /agent-kit-wire/);
  assert.match(css, /@keyframes agent-kit-flow/);
  assert.match(css, /animation: agent-kit-flow/);
});
