import * as cryptoModule from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {NextResponse} from 'next/server.js';

// Actual Source route; provider/Auth boundaries are fixtures, no network or DB.
function harness({alreadyPaid=true,accountFails=false,portalFails=false,emailFails=false,kind='course'}={}){
 const flags={accountFails,portalFails,emailFails,existingAccount:false,loseEmailResponse:false,loseAcceptedWriteResponse:false,portalDelayMs:0,accountDelayMs:0,hangAux:false};
 let now=Date.now();
 const calls={account:0,portal:0,email:0,accounting:0,booking:0};
 const order={orderCode:'TAMCFQARECOVERY',status:'paid',email:'qa@example.invalid',studentName:'QA',phone:'',courseSlug:kind==='support'?'support':'facebook-ads-2026',orderItems:[],paymentEmailSentAt:null,accountingEmailSentAt:'2026-01-01T00:00:00Z',purchaseEventSent:true};
 const storeRow={payment_email_last_error:'{"protocol":"sepay-fulfillment-v1"}',payment_email_sent_at:null};
 const deliveries=new Map();
 const store={read:async()=>({...storeRow}),replace:async(code,previous,next,sentAt,expectedSentAt=null)=>{if(storeRow.payment_email_sent_at!==expectedSentAt||storeRow.payment_email_last_error!==previous)return false;storeRow.payment_email_last_error=next;if(flags.loseAcceptedWriteResponse&&next&&JSON.parse(next).accepted){flags.loseAcceptedWriteResponse=false;throw Error('synthetic-write-response-loss');}if(sentAt){storeRow.payment_email_sent_at=sentAt;order.paymentEmailSentAt=sentAt;}return true;}};
 const mocks={
  'next/server':{NextResponse},
  '@/lib/notifications/payment-success-email':{shouldSendPaymentSuccessEmail:o=>o.status==='paid'&&!o.paymentEmailSentAt,buildPaymentSuccessEmailPayload:(o,options)=>({subject:'fixture',account:options.account}),buildPreorderDepositEmailPayload:()=>({subject:'deposit-fixture'}),sendPaymentSuccessEmail:async(o,options)=>{calls.email++;if(flags.emailFails)return{ok:false,skipped:false};const body=JSON.stringify(options.account);if(deliveries.has(options.idempotencyKey)){assert.equal(deliveries.get(options.idempotencyKey),body);}else{deliveries.set(options.idempotencyKey,body);}if(flags.loseEmailResponse){flags.loseEmailResponse=false;throw Error('synthetic-provider-response-loss');}return{ok:true,skipped:false,resendEmailId:'fixture-message-id'};}},
  '@/lib/notifications/google-sheets-order-sync':{syncOrderToGoogleSheetWithActivity:async()=>({ok:true})},
  '@/lib/notifications/telegram':{sendTelegramOrderNotification:async()=>({ok:true}),sendTelegramSupportBookingNotification:async()=>({ok:true})},
  '@/lib/support-booking/constants':{SUPPORT_PRODUCT_SLUG:'support'},
  '@/lib/consultation/constants':{isConsultationOrder:()=>kind==='consultation'},
  '@/lib/notifications/consultation-payment-email':{buildConsultationPaymentEmailPayload:()=>({subject:'consult-fixture'}),sendConsultationPaymentEmail:async()=>{calls.email++;return{ok:!flags.emailFails,skipped:false,resendEmailId:'fixture-message-id'};}},
  '@/lib/meta/purchase-outbox':{dispatchMetaPurchaseOrders:async()=>({sent:0,claimed:0})},
  '@/lib/payments/sepay':{verifySepayApiKey:()=>true},
  '@/lib/security/audit-log':{logSecurityEvent:()=>{}},
  '@/lib/security/rate-limit':{checkRateLimit:()=>({ok:true}),rateLimitKey:()=>'',rateLimitResponse:()=>Response.json({},{status:429})},
  '@/services/adminDataService':{invalidateAdminModules:()=>{}},
  '@/services/accountingNotificationService':{notifyAccountingForPaidOrder:async()=>{calls.accounting++;if(flags.hangAux)throw Error('synthetic-auxiliary-outage');return{ok:true,skipped:true};}},
  '@/services/activityLogService':{logStudentActivity:async()=>{}},
  '@/services/orderService':{confirmOrderFromSepay:async()=>({order,wasAlreadyPaid:alreadyPaid}),markPaymentEmailError:async()=>({ok:true}),markPaymentEmailSent:async()=>{order.paymentEmailSentAt='2026-01-01T00:00:00Z';return{ok:true};}},
  '@/services/studentAccountService':{ensureStudentAccountForPaidOrder:async(o,options)=>{assert.equal(options.preserveExistingAuth,true);assert.equal(options.provisioningOperationId,'sepay:'+order.orderCode);calls.account++;now+=flags.accountDelayMs;return flags.accountFails?{ok:false,reason:'auth-unavailable'}:{ok:true,userId:'qa-user',email:order.email,temporaryPassword:flags.existingAccount?null:'fixture-only',created:true};}},
  '@/services/studentPortalProvisioningService':{notifyStudentPortalProvisioning:async()=>{calls.portal++;now+=flags.portalDelayMs;return{ok:!flags.portalFails,skipped:false,resendEmailId:'fixture-message-id'};}},
  '@/data/site':{siteConfig:{url:'https://example.invalid'}},
  '@/lib/agent-kit-preorder':{isAgentKitPreorderDepositOrder:()=>kind==='preorder'},
  '@/services/supportBookingService':{confirmSupportBookingForPaidOrder:async()=>{calls.booking++;return{id:'qa-booking',status:'confirmed'};},markSupportBookingTelegram:async()=>{}},
 };
 const serviceSource=ts.transpileModule(fs.readFileSync('services/sourcePaidFulfillmentService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const service={exports:{}};new Function('exports','require','module',serviceSource)(service.exports,id=>{if(id==='node:crypto')return cryptoModule;if(id==='@/lib/supabase/admin')return{createSupabaseAdminClient:()=>{throw Error('No live database in route fixture');}};if(id in mocks)return mocks[id];throw Error('Unexpected fixture dependency: '+id);},service);
 mocks['@/services/sourcePaidFulfillmentService']={...service.exports,fulfillSourcePaidOrder:(o,unused,mode)=>service.exports.fulfillSourcePaidOrder(o,{store,account:mocks['@/services/studentAccountService'].ensureStudentAccountForPaidOrder,portal:mocks['@/services/studentPortalProvisioningService'].notifyStudentPortalProvisioning,send:mocks['@/lib/notifications/payment-success-email'].sendPaymentSuccessEmail,build:mocks['@/lib/notifications/payment-success-email'].buildPaymentSuccessEmailPayload,now:()=>now},mode)};
 const source=ts.transpileModule(fs.readFileSync('app/api/sepay/webhook/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const box={exports:{}};new Function('exports','require','module',source)(box.exports,id=>{if(id in mocks)return mocks[id];throw Error('Unexpected fixture dependency: '+id);},box);
 return{calls,order,storeRow,flags,deliveries,advance:ms=>{now+=ms;},post:()=>box.exports.POST(new Request('https://example.invalid/api/sepay/webhook',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'qa-recovery',code:order.orderCode})}))};
}
test('retry after settlement but before fulfillment resumes missing account and email',async()=>{
 const h=harness();const r=await h.post();assert.equal(r.status,200);assert.equal(h.calls.account,1);assert.equal(h.calls.portal,1);assert.equal(h.calls.email,1);
});
test('successful completed fulfillment is not repeated on further retry',async()=>{
 const h=harness();h.order.paymentEmailSentAt='2026-01-01T00:00:00Z';h.storeRow.payment_email_sent_at=h.order.paymentEmailSentAt;const r=await h.post();assert.equal(r.status,200);assert.equal(h.calls.email,0);assert.equal(h.calls.account,0);
});
test('incomplete mandatory fulfillment does not acknowledge final success',async()=>{
 const h=harness({alreadyPaid:false,accountFails:true});const r=await h.post();assert.equal(r.status,503);assert.equal(h.calls.email,0);
});

test('App B outage never blocks A login email and retry resumes only B',async()=>{const h=harness({portalFails:true});assert.equal((await h.post()).status,503);assert.equal(h.calls.email,1);assert.ok(h.storeRow.payment_email_sent_at);h.flags.portalFails=false;assert.equal((await h.post()).status,200);assert.equal(h.calls.email,1);assert.equal(h.calls.account,1);assert.equal(h.calls.portal,2);});
test('provider failure returns retryable status and retains first attempt/hash',async()=>{const h=harness({emailFails:true});assert.equal((await h.post()).status,503);const receipt=JSON.parse(h.storeRow.payment_email_last_error);assert.equal(typeof receipt.hash,'string');assert.equal(typeof receipt.started,'number');assert.equal(receipt.until,0);});
test('concurrent duplicates only execute one account/email workflow',async()=>{const h=harness();const r=await Promise.all([h.post(),h.post()]);assert(r.some(x=>x.status===200));assert.equal(h.calls.account,1);assert.equal(h.calls.email,1);});
test('legacy paid order without a protocol receipt requires reconciliation before sending',async()=>{const h=harness();h.storeRow.payment_email_last_error=null;assert.equal((await h.post()).status,503);assert.equal(h.calls.email,0);assert.equal(h.calls.account,0);});

test('transient Auth outage resumes on the next bank retry without resetting password',async()=>{const h=harness({accountFails:true});assert.equal((await h.post()).status,503);h.flags.accountFails=false;assert.equal((await h.post()).status,200);assert.equal(h.calls.email,1);});
test('existing student retains their login method and receives login instructions',async()=>{const h=harness();h.flags.existingAccount=true;assert.equal((await h.post()).status,200);assert.equal(h.calls.email,1);});
test('ambiguous email retry uses receipt and provider deduplication window',async()=>{const h=harness({emailFails:true});assert.equal((await h.post()).status,503);const first=JSON.parse(h.storeRow.payment_email_last_error);h.flags.emailFails=false;assert.equal((await h.post()).status,200);assert.equal(h.calls.email,2);assert.equal(first.hash.length,64);});
test('ambiguous attempt older than provider retention window is not blindly resent',async()=>{const h=harness({emailFails:true});await h.post();h.advance(24*60*60_000);h.flags.emailFails=false;assert.equal((await h.post()).status,503);assert.equal(h.calls.email,1);});
test('accepted provider receipt reconciles marker without another account or send',async()=>{const h=harness();h.storeRow.payment_email_last_error=JSON.stringify({protocol:'sepay-fulfillment-v1',accepted:true,providerId:'fixture-message-id',until:0});assert.equal((await h.post()).status,200);assert.equal(h.calls.email,0);assert.equal(h.calls.account,0);assert.ok(h.storeRow.payment_email_sent_at);});

for(const kind of ['preorder','consultation']) {
 test(kind+' retries email without creating a course account',async()=>{const h=harness({kind,emailFails:true});assert.equal((await h.post()).status,503);h.flags.emailFails=false;assert.equal((await h.post()).status,200);assert.equal(h.calls.account,0);assert.equal(h.calls.portal,0);assert.equal(h.calls.email,2);});
}

test('support-booking retry resumes database confirmation without creating a course login',async()=>{const h=harness({kind:'support'});assert.equal((await h.post()).status,200);assert.equal(h.calls.booking,1);assert.equal(h.calls.account,0);assert.equal(h.calls.email,0);});

test('response lost after provider acceptance retries the same payload/key with one delivery',async()=>{const h=harness();h.flags.loseEmailResponse=true;assert.equal((await h.post()).status,503);assert.equal((await h.post()).status,200);assert.equal(h.calls.email,2);assert.equal(h.deliveries.size,1);});
test('changed email payload after an ambiguous attempt requires review rather than another send',async()=>{const h=harness();h.flags.loseEmailResponse=true;assert.equal((await h.post()).status,503);h.flags.existingAccount=true;assert.equal((await h.post()).status,503);assert.equal(h.calls.email,1);assert.equal(h.deliveries.size,1);});
test('lost database response after accepted receipt reconciles without another provider request',async()=>{const h=harness();h.flags.loseAcceptedWriteResponse=true;assert.equal((await h.post()).status,503);h.advance(121_000);assert.equal((await h.post()).status,200);assert.equal(h.calls.email,1);assert.equal(h.deliveries.size,1);});

test('provider expiry is checked again after a slow provisioning step',async()=>{const h=harness({emailFails:true});await h.post();h.advance(22.99*60*60_000);h.flags.accountDelayMs=1.02*60*60_000;h.flags.emailFails=false;assert.equal((await h.post()).status,503);assert.equal(h.calls.email,1);});
test('mandatory access/email finishes before an auxiliary notification failure',async()=>{const h=harness();h.flags.hangAux=true;await h.post();assert.equal(h.calls.email,1);assert.ok(h.storeRow.payment_email_sent_at);});
