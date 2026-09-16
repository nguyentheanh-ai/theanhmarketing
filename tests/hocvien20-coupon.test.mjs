import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const coupon = {exports:{}};
vm.runInNewContext(ts.transpile(readFileSync('lib/orders/coupon.ts','utf8'),{module:ts.ModuleKind.CommonJS}),coupon);
const {applyOrderCoupon} = coupon.exports;
const base = {amount:990000,courseSlug:'bo-agent-kit-x10-hieu-suat-cong-viec',courseTitle:'Đội ngũ nhân sự AI',orderItems:[{slug:'bo-agent-kit-x10-hieu-suat-cong-viec',title:'Đội ngũ nhân sự AI',price:990000}]};
test('HOCVIEN20 gives 792000, matching item price and preserving entitlement',()=>{
 for(const code of ['HOCVIEN20','hocvien20',' HOCVIEN20 ']) {
  const order=applyOrderCoupon(base,'agent-kit-offer-990',code);
  assert.equal(order.amount,792000);assert.equal(order.orderItems[0].price,792000);
  assert.equal(order.orderItems[0].slug,base.courseSlug);assert.match(order.courseTitle,/HOCVIEN20/);
 }
 assert.equal(base.amount,990000);assert.equal(base.orderItems[0].price,990000);
});
test('blank coupon preserves the existing package exactly',()=>{
 for(const code of [undefined,'','  ']) assert.equal(applyOrderCoupon(base,'agent-kit-offer-990',code),base);
});
test('reject invalid codes, alternate products, deposits, installments, mixed carts and repeated discounts',()=>{
 assert.throws(()=>applyOrderCoupon(base,'agent-kit-offer-990','BAD'),/không hợp lệ/);
 for(const plan of [undefined,'agent-kit-preorder-deposit-399','agent-kit-preorder-remaining-400','agent-kit-standard-999']) assert.throws(()=>applyOrderCoupon(base,plan,'HOCVIEN20'),/chỉ áp dụng/);
 for(const order of [{...base,courseSlug:'facebook-ads-2026'},{...base,amount:792000},{...base,orderItems:[...base.orderItems,...base.orderItems]}]) assert.throws(()=>applyOrderCoupon(order,'agent-kit-offer-990','HOCVIEN20'),/chỉ áp dụng/);
});
test('real order creation passes discounted amount into storage and QR before side effects',async()=>{
 const service=readFileSync('services/orderService.ts','utf8');
 const source=service.slice(service.indexOf('export async function createPaymentOrder('),service.indexOf('export type AgentKitRemainingPaymentSummary'));
 const inserted=[];let qr;
 const context={exports:{},applyOrderCoupon,createSupabaseAdminClient:()=>({from:()=>({insert:row=>{inserted.push(row);return {select:()=>({single:async()=>({data:row,error:null})})}}})}),getFixedPaymentPackage:()=>null,resolveCourses:async()=>[{}],AGENT_KIT_SLUG:base.courseSlug,assertAgentKitPaymentPlanAvailable:()=>{},buildOrderPackage:()=>base,createOrderCode:()=> 'TAMLOCALTEST',isSepayConfigured:()=>true,createSepayQrUrl:value=>{qr=value;return 'mock-qr'},normalizeAttribution:()=>({}),emptyInvoiceDetails:{requested:false},attributionToDbColumns:()=>({}),orderSelectFields:'',mapDbOrder:row=>row};
 vm.runInNewContext(ts.transpile(source,{module:ts.ModuleKind.CommonJS}),context);
 const order=await context.exports.createPaymentOrder({courseSlug:base.courseSlug,paymentPlan:'agent-kit-offer-990',couponCode:'hocvien20',amount:1});
 assert.equal(order.amount,792000);assert.equal(qr.amount,792000);assert.equal(inserted[0].order_items[0].price,792000);assert.equal(order.payment_plan,'agent-kit-offer-990');
 await assert.rejects(()=>context.exports.createPaymentOrder({courseSlug:base.courseSlug,paymentPlan:'agent-kit-offer-990',couponCode:'BAD'}),/không hợp lệ/);
 assert.equal(inserted.length,1);
});
