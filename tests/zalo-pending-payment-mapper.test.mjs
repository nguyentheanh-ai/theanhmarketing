import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function loadTsModule(relativePath) {
  const source = fs.readFileSync(path.resolve(relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", "require", compiled);
  runner(cjsModule.exports, cjsModule, (specifier) => {
    if (specifier === "@/lib/payments/sepay") {
      return {
        formatVnd(value) {
          return `${new Intl.NumberFormat("vi-VN").format(Number(value))}đ`;
        },
      };
    }
    if (specifier === "@/tests/fixtures/zalo-zbs-contract.json") {
      return JSON.parse(
        fs.readFileSync("tests/fixtures/zalo-zbs-contract.json", "utf8"),
      );
    }
    throw new Error(`Unsupported test import: ${specifier}`);
  });
  return cjsModule.exports;
}

const mapper = loadTsModule("lib/zalo/pending-payment.ts");

const baseOrder = {
  orderCode: "TAMABC123",
  studentName: "Nguyễn Minh Anh",
  phone: "0901234567",
  courseSlug: "facebook-ads-2026",
  courseTitle: "Quảng cáo Facebook Master 2026",
  amount: 399000,
  currency: "VND",
  status: "pending",
  sepayReferenceCode: null,
  orderItems: [],
};

test("only exact approved course sets are eligible", () => {
  assert.equal(
    mapper.isPendingPaymentZnsEligible({ courseSlug: "facebook-ads-2026" }),
    true,
  );
  assert.equal(
    mapper.isPendingPaymentZnsEligible({ courseSlug: "ebook-facebook-ads-2026" }),
    true,
  );
  assert.equal(
    mapper.isPendingPaymentZnsEligible({
      courseSlug: "facebook-ads-2026,ebook-facebook-ads-2026",
    }),
    true,
  );

  for (const courseSlug of [
    "facebook-ads-2026-copy",
    "support-booking",
    "ai-master-x10",
    "bo-agent-kit-x10-hieu-suat-cong-viec",
    "facebook-ads-2026,another-course",
    "",
  ]) {
    assert.equal(
      mapper.isPendingPaymentZnsEligible({ courseSlug }),
      false,
      courseSlug,
    );
  }

  assert.equal(
    mapper.isPendingPaymentZnsEligible({
      courseSlug: "facebook-ads-2026",
      orderItems: [{ slug: "another-course" }],
    }),
    false,
  );
});

test("Vietnamese mobile phones normalize to digits-only country code", () => {
  assert.deepEqual(mapper.normalizeVietnamMobileForZalo("0901234567"), {
    ok: true,
    phone: "84901234567",
  });
  assert.deepEqual(mapper.normalizeVietnamMobileForZalo("+84 901 234 567"), {
    ok: true,
    phone: "84901234567",
  });
  assert.deepEqual(mapper.normalizeVietnamMobileForZalo(""), {
    ok: false,
    reason: "missing_phone",
  });
  for (const phone of ["0281234567", "123", "+12025550123", "090123456x"]) {
    assert.deepEqual(mapper.normalizeVietnamMobileForZalo(phone), {
      ok: false,
      reason: "invalid_phone",
    });
  }
});

test("payment URL is fixed and rejects an invalid order code", () => {
  assert.equal(
    mapper.buildPendingPaymentUrl("tamabc123"),
    "https://www.theanhmarketing.com/thanh-toan/TAMABC123?openBank=1",
  );
  assert.throws(
    () => mapper.buildPendingPaymentUrl("TAMABC123?amount=1"),
    /invalid_order_code/,
  );
});

test("ZBS payload is course-first, authoritative, and contract exact", () => {
  const payload = mapper.buildPendingPaymentZbsPayload(baseOrder);

  assert.equal(payload.phone, "84901234567");
  assert.equal(payload.trackingId, "PPTAMABC123");
  assert.equal(payload.paymentUrl, "https://www.theanhmarketing.com/thanh-toan/TAMABC123?openBank=1");
  assert.deepEqual(Object.keys(payload.templateData), [
    "customer_name",
    "product_name",
    "order_code",
    "amount",
    "transfer_content",
    "status",
  ]);
  assert.deepEqual(payload.templateData, {
    customer_name: "Nguyễn Minh Anh",
    product_name: "Quảng cáo Facebook Master 2026",
    order_code: "TAMABC123",
    amount: "399.000đ",
    transfer_content: "TAMABC123",
    status: "Chờ thanh toán",
  });
  assert.doesNotMatch(JSON.stringify(payload), /đơn hàng/i);
});

test("bundle title and transfer reference stay server-derived", () => {
  const payload = mapper.buildPendingPaymentZbsPayload({
    ...baseOrder,
    courseSlug: "facebook-ads-2026,ebook-facebook-ads-2026",
    courseTitle: "Facebook Ads Master 2026 + Ebook Facebook Ads 2026",
    amount: 1098000,
    sepayReferenceCode: "tamtransfer456",
    orderItems: [
      { slug: "facebook-ads-2026", title: "Facebook Ads Master 2026" },
      { slug: "ebook-facebook-ads-2026", title: "Ebook Facebook Ads 2026" },
    ],
  });

  assert.equal(payload.templateData.amount, "1.098.000đ");
  assert.equal(payload.templateData.transfer_content, "TAMTRANSFER456");
  assert.equal(
    payload.templateData.product_name,
    "Facebook Ads Master 2026 + Ebook Facebook Ads 2026",
  );
});
