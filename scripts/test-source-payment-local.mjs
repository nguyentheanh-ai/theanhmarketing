// Real source settlement service + official PostgREST + restored PostgreSQL.
// The Python driver exposes only a filtered QA view over disposable DB clone.
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {writeFileSync} from 'node:fs';

const upstream=process.env.TAM_QA_POSTGREST_ORIGIN;
assert.equal(upstream,'http://127.0.0.1:55449');
const prefix=process.env.TAM_QA_ORDER_PREFIX;
assert.match(prefix??'',/^TAMCFQA[A-F0-9]{12}$/);
const proxy=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://127.0.0.1');
  if(url.pathname!=='/rest/v1/orders') {response.writeHead(403);response.end();return;}
  const headers={...request.headers,host:'127.0.0.1:55449','accept-profile':'qa_transport','content-profile':'qa_transport'};
  const remote=http.request(new URL('/orders'+url.search,upstream),{method:request.method,headers},r=>{response.writeHead(r.statusCode,r.headers);r.pipe(response)});
  remote.on('error',()=>{response.writeHead(503);response.end()});request.pipe(remote);
});
proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
const origin=`http://127.0.0.1:${proxy.address().port}`;
process.env.NEXT_PUBLIC_SUPABASE_URL=origin;
process.env.SUPABASE_SERVICE_ROLE_KEY=process.env.TAM_QA_API_JWT;
process.env.SEPAY_BANK_ACCOUNT_NUMBER='9999000001';
const actualFetch=globalThis.fetch;
let loseCommittedResponseFor=null,lostResponses=0,outsideAttempts=0;
globalThis.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  if(url.origin!==origin||url.pathname!=='/rest/v1/orders') {outsideAttempts++;throw new Error('External transport blocked by local fixture harness');}
  const response=await actualFetch(input,init);
  // A committed PATCH response is lost once. The real service must reconcile.
  if(init?.method==='PATCH'&&loseCommittedResponseFor&&url.searchParams.get('order_code')===`eq.${loseCommittedResponseFor}`&&response.ok){
    loseCommittedResponseFor=null;lostResponses++;await response.arrayBuffer();throw new TypeError('Synthetic response loss after local database commit');
  }
  return response;
};
const imported=await import('../services/orderService.ts');
const {confirmOrderFromSepay}=imported.default??imported;
const payload=(suffix,id,amount=2000)=>({id,code:prefix+suffix,transferType:'in',transferAmount:amount,accountNumber:'9999000001',referenceCode:'CFQA'+id});
const checks=[];
async function check(name,run){try{await run();checks.push({name,passed:true});}catch{checks.push({name,passed:false});}}
try {
  await check('valid receipt settles pending QA order',async()=>{const r=await confirmOrderFromSepay(payload('A','local-receipt-a'));assert.equal(r.order.status,'paid');assert.equal(r.wasAlreadyPaid,false)});
  await check('same-order replay preserves paid_at and reports already paid',async()=>{const a=await confirmOrderFromSepay(payload('A','local-receipt-a')),b=await confirmOrderFromSepay(payload('A','local-receipt-a'));assert.equal(a.wasAlreadyPaid,true);assert.equal(b.wasAlreadyPaid,true);assert.equal(a.order.paidAt,b.order.paidAt)});
  await check('concurrent same-order events have exactly one first settlement',async()=>{const r=await Promise.all([confirmOrderFromSepay(payload('B','local-receipt-b')),confirmOrderFromSepay(payload('B','local-receipt-b'))]);assert.equal(r.filter(x=>!x.wasAlreadyPaid).length,1);assert(r.every(x=>x.order.status==='paid'))});
  await check('late receipt for expired QA order is reconciled',async()=>{const r=await confirmOrderFromSepay(payload('C','local-receipt-c'));assert.equal(r.order.status,'paid')});
  await check('underpayment is rejected',async()=>{await assert.rejects(()=>confirmOrderFromSepay(payload('D','local-receipt-d',1000)))});
  await check('lost response after commit can be retried without a second settlement',async()=>{loseCommittedResponseFor=prefix+'E';const first=await confirmOrderFromSepay(payload('E','local-receipt-e'));const again=await confirmOrderFromSepay(payload('E','local-receipt-e'));assert.equal(lostResponses,1);assert.equal(first.order.status,'paid');assert.equal(again.wasAlreadyPaid,true);assert.equal(first.order.paidAt,again.order.paidAt)});
  await check('same transaction cannot settle two distinct orders concurrently',async()=>{const r=await Promise.allSettled([confirmOrderFromSepay(payload('F','local-shared-receipt')),confirmOrderFromSepay(payload('G','local-shared-receipt'))]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1)});
  const fulfillmentModule=await import('../services/sourcePaidFulfillmentService.ts');
  const {fulfillSourcePaidOrder,createSourceFulfillmentStore,initialSepayFulfillmentReceipt}=fulfillmentModule.default??fulfillmentModule;
  const calls={account:0,portal:0,email:0};
  let emailFails=false,now=Date.now();
  const deps={store:createSourceFulfillmentStore(),account:async(o,options)=>{assert.equal(options.preserveExistingAuth,true);calls.account++;return{ok:true,skipped:false,created:false,email:o.email,temporaryPassword:null,userId:'qa-local-only',reason:null};},portal:async()=>{calls.portal++;return{ok:true,skipped:false,reason:null};},send:async(o,options)=>{assert.equal(options.idempotencyKey,`tam-sepay-paid-email/${o.orderCode}`);calls.email++;return{ok:!emailFails,skipped:false,reason:null,resendEmailId:"local-fixture-message"};},build:o=>({from:'qa@example.invalid',to:o.email,subject:o.orderCode,html:'fixture',text:'fixture'}),now:()=>now};
  const settle=async(suffix)=>confirmOrderFromSepay(payload(suffix,'local-fulfill-'+suffix),{initialFulfillmentReceipt:initialSepayFulfillmentReceipt});
  await check('paid commit atomically persists recovery receipt before external calls',async()=>{const r=await settle('H');assert.equal(JSON.parse(r.order.paymentEmailLastError).protocol,'sepay-fulfillment-v1');assert.equal(calls.email,0);});
  await check('real PostgreSQL CAS recovers after commit without duplicate fulfillment',async()=>{const r=await settle('H');await fulfillSourcePaidOrder(r.order,deps);await fulfillSourcePaidOrder(r.order,deps);assert.equal(calls.email,1);});
  await check('concurrent real PostgreSQL claims yield one account and one send',async()=>{const r=await settle('I');const before=calls.email;const results=await Promise.allSettled([fulfillSourcePaidOrder(r.order,deps),fulfillSourcePaidOrder(r.order,deps)]);assert(results.some(x=>x.status==='fulfilled'));assert.equal(calls.email-before,1);});
  await check('provider failure retains hash and retries with the same provider key',async()=>{const r=await settle('J');const before=calls.email;emailFails=true;await assert.rejects(()=>fulfillSourcePaidOrder(r.order,deps));emailFails=false;await fulfillSourcePaidOrder(r.order,deps);assert.equal(calls.email-before,2);});
  await check('expired ambiguous provider attempt stops automatic resend',async()=>{const r=await settle('K');emailFails=true;await assert.rejects(()=>fulfillSourcePaidOrder(r.order,deps));emailFails=false;const before=calls.email;now+=24*60*60_000;await assert.rejects(()=>fulfillSourcePaidOrder(r.order,deps));assert.equal(calls.email,before);now=Date.now();});
  await check('legacy unmarked paid receipt requires manual reconciliation',async()=>{const r=await confirmOrderFromSepay(payload('L','local-legacy'));const before=calls.email;await assert.rejects(()=>fulfillSourcePaidOrder(r.order,deps));assert.equal(calls.email,before);});
  const report={checkedAt:new Date().toISOString(),status:checks.every(c=>c.passed)?'PASS':'FAIL',checks,lostCommittedResponses:lostResponses,outsideNetworkAttempts:outsideAttempts,productionContacted:false,scope:'Actual settlement and source fulfillment CAS via official PostgREST and restored PostgreSQL; synthetic orders and provider/Auth fixtures only, no actual provider delivery or live-bank proof'};
  writeFileSync(process.env.TAM_QA_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  process.exitCode=report.status==='PASS'?0:1;
}finally{globalThis.fetch=actualFetch;await new Promise(resolve=>proxy.close(resolve));}
