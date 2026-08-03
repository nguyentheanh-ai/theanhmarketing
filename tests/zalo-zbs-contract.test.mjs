import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contract = JSON.parse(
  fs.readFileSync("tests/fixtures/zalo-zbs-contract.json", "utf8"),
);
const serialized = JSON.stringify(contract);

test("ZBS contract is verified and contains no credentials", () => {
  assert.equal(contract.verified_at, "2026-08-03");
  assert.match(
    contract.official_documentation_url,
    /^https:\/\/developers\.zalo\.me\//,
  );
  assert.equal(contract.send.method, "POST");
  assert.equal(
    contract.send.url,
    "https://business.openapi.zalo.me/message/template",
  );
  assert.equal(contract.send.access_token_header, "access_token");
  assert.deepEqual(contract.send.request_fields, [
    "phone",
    "template_id",
    "template_data",
    "tracking_id",
  ]);
  assert.ok(contract.send.success_fields.includes("data.msg_id"));
  assert.ok(contract.send.error_fields.includes("error"));
  assert.equal(
    contract.oauth_refresh.url,
    "https://oauth.zaloapp.com/v4/oa/access_token",
  );
  assert.equal(
    contract.oauth_refresh.content_type,
    "application/x-www-form-urlencoded",
  );
  assert.equal(contract.oauth_refresh.secret_header, "secret_key");
  assert.equal(contract.oauth_refresh.refresh_token_rotates, true);
  assert.deepEqual(contract.template_variables, [
    "customer_name",
    "product_name",
    "order_code",
    "amount",
    "transfer_content",
    "status",
  ]);
  assert.doesNotMatch(
    serialized,
    /access[_-]?token["']?\s*:\s*["'][A-Za-z0-9_-]{16,}|refresh[_-]?token["']?\s*:\s*["'][A-Za-z0-9_-]{16,}/i,
  );
});
