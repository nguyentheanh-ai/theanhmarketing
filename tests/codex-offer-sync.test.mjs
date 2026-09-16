import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(path, 'utf8');
const offerModule = { exports: {} };
vm.runInNewContext(ts.transpile(read('app/academy/codex-x10-hieu-suat/offer.ts'), { module: ts.ModuleKind.CommonJS }), { exports: offerModule.exports });
const offer = offerModule.exports.CODEX_AGENT_KIT_OFFER;
const loader = read('app/khoa-hoc/bo-kit-agent-doanh-nghiep/agent-kit-bundle.tsx');
const bundle = read('public' + loader.match(/bundleSource = "([^"]+)"/)[1]);
test('Codex uses the current enterprise Kit offer and the server charges that amount', () => {
  const money = value => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
  assert.ok(bundle.includes(money(offer.price)));
  assert.ok(bundle.includes(money(offer.originalPrice)));
  assert.ok(bundle.includes(offer.paymentPlan));
  const source = read('services/orderService.ts');
  const context = vm.createContext({
    VIETNAM_THANG_THAI_LAN_PROMOTION_PLAN: 'promotion', isVietnamThangThaiLanPromotionActive: () => false,
    AGENT_KIT_SLUG: 'agent-kit', AGENT_KIT_PREORDER_PAYMENT_PLAN: 'preorder',
    AGENT_KIT_PREORDER_PRICE_VND: 799000, AGENT_KIT_PREORDER_REMAINING_VND: 400000,
    AGENT_KIT_PREORDER_DEPOSIT_VND: 399000, AGENT_KIT_OFFICIAL_PAYMENT_PLAN: 'official',
    AGENT_KIT_OFFICIAL_PRICE_VND: 999000, formatVnd: String,
  });
  vm.runInContext(ts.transpile(source.slice(source.indexOf('const coursePaymentPlans:'), source.indexOf('export async function createPaymentOrder'))), context);
  const result = context.buildOrderPackage([{slug:'agent-kit', title:'Đội ngũ nhân sự AI'}], offer.paymentPlan);
  assert.equal(result.amount, offer.price);
  assert.equal(result.orderItems[0].price, offer.price);
});
