import type {AuthDatabase} from './d1-auth-core';
import {nativeAuthoritySql,type AuthorityHandoff} from './d1-data-authority';
import {readD1CheckoutQuote} from './d1-checkout-quote';
import {prepareNativeOrderRecord} from './native-order-settlement';
import {attributionToDbColumns,normalizeAttribution,type AttributionInput} from '@/lib/tracking/attribution';
import {cleanEmail,cleanPhone,cleanText,isValidEmail,isValidPhone} from '@/lib/security/validation';
import {emptyInvoiceDetails,type InvoiceDetails} from '@/lib/orders/invoice';

type Db=Pick<AuthDatabase,'first'|'batch'>;
type Statement={sql:string;params:(string|number|null)[]};
export type NativeCheckoutInput={
 idempotencyKey:string;studentName:string;email:string;phone:string;
 courseSlug?:string;courseSlugs?:string[];paymentPlan?:string;couponCode?:string;
 leadId?:string|null;ipAddress?:string;userAgent?:string;attribution?:AttributionInput;invoice?:InvoiceDetails;
 // Lead CRM note/source are built from the new order exactly like /api/orders.
 lead:(order:Record<string,unknown>)=>{message:string;source:string};
};
export type NativeCheckoutOptions={
 nativeAuthority:AuthorityHandoff;
 // Same values as the Source SePay env; an empty bank config yields an empty QR (Source behaviour).
 sepay:{bankCode:string;bankAccountNumber:string;bankAccountName?:string};
 now?:()=>number;createOrderCode?:()=>string;createId?:()=>string;
};
export class NativeCheckoutConflict extends Error{constructor(){super('Checkout request was already used for a different order');}}
export class NativeCheckoutUnavailable extends Error{constructor(){super('Checkout temporarily unavailable');}}
const PROJECT='vsxxgdzwtscuxcmjfckt',KEY=/^[A-Za-z0-9_-]{16,128}$/,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATALOG_FRESH_MS=300000,ORDER_TTL_MS=20*60*1000;

async function sha256(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}
function canonical(v:unknown):string{if(v===null||typeof v!=='object')return JSON.stringify(v??null);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v as object).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}';}
// Same format as lib/payments/sepay.ts createOrderCode (TAM + time36 + 5 random).
function defaultOrderCode(now:number){const r=crypto.getRandomValues(new Uint8Array(5));return 'TAM'+now.toString(36).toUpperCase()+Array.from(r,b=>'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[b%36]).join('');}
// Same URL as lib/payments/sepay.ts createSepayQrUrl, from explicit config.
function qrUrl(sepay:NativeCheckoutOptions['sepay'],amount:number,orderCode:string){
 if(!sepay.bankCode||!sepay.bankAccountNumber)return '';
 const params=new URLSearchParams({bank:sepay.bankCode,acc:sepay.bankAccountNumber,amount:String(amount),des:orderCode});
 return `https://qr.sepay.vn/img?${params.toString()}`;
}

// Candidate native checkout (not mounted): price from the verified D1 catalogue,
// then lead + order + reminder seed + idempotency record in ONE D1 batch, which
// re-checks native authority and the same fresh catalogue snapshot before commit.
// Provider side effects (Meta, Sheets, Telegram) stay with the caller, after commit.
export async function createNativeCheckoutOrder(db:Db,input:NativeCheckoutInput,options:NativeCheckoutOptions){
 const now=(options.now??Date.now)();if(!Number.isFinite(now))throw new NativeCheckoutUnavailable();
 if(options.nativeAuthority?.projectId!==PROJECT)throw new NativeCheckoutUnavailable();
 const key=typeof input.idempotencyKey==='string'?input.idempotencyKey:'';
 const studentName=cleanText(input.studentName,120),email=cleanEmail(input.email),phone=cleanPhone(input.phone);
 if(!KEY.test(key)||!studentName||!email||!phone||!isValidEmail(email)||!isValidPhone(phone))throw new RangeError('Invalid checkout');
 const leadId=input.leadId&&UUID.test(input.leadId)?input.leadId:null;
 const selection={...(input.courseSlug?{courseSlug:input.courseSlug}:{}),...(input.courseSlugs?.length?{courseSlugs:input.courseSlugs}:{}),...(input.paymentPlan?{paymentPlan:input.paymentPlan}:{}),...(input.couponCode?{couponCode:input.couponCode}:{})};
 const invoice=input.invoice??emptyInvoiceDetails,attribution=normalizeAttribution(input.attribution);
 const digest=await sha256(canonical({studentName,email,phone,selection,leadId,invoice,attribution:attributionToDbColumns(attribution)}));

 // Retry of the same checkout attempt returns the original order unchanged.
 const prior=await db.first('SELECT r.request_digest,o.row_json FROM d1_native_checkout_requests r JOIN d1_native_orders o ON o.order_code=r.order_code WHERE r.idempotency_key=?1',[key]);
 if(prior){if(prior.request_digest!==digest)throw new NativeCheckoutConflict();return {status:'existing' as const,order:JSON.parse(String(prior.row_json)) as Record<string,unknown>};}

 const snapshot=await db.first('SELECT snapshot_id FROM d1_student_catalog_current WHERE source_project_id=?1',[PROJECT]);
 if(typeof snapshot?.snapshot_id!=='string')throw new NativeCheckoutUnavailable();
 const quote=await readD1CheckoutQuote(db,selection,{now});
 const stamp=new Date(now).toISOString(),orderCode=(options.createOrderCode??(()=>defaultOrderCode(now)))(),orderId=(options.createId??(()=>crypto.randomUUID()))();
 const row:Record<string,unknown>={
  id:orderId,lead_id:leadId,order_code:orderCode,student_name:studentName,email,phone,
  course_slug:quote.courseSlug,course_title:quote.courseTitle,amount:quote.amount,currency:'VND',
  status:'pending',payment_status:'pending',payment_method:'sepay',payment_qr_url:qrUrl(options.sepay,quote.amount,orderCode),
  expires_at:new Date(now+ORDER_TTL_MS).toISOString(),order_items:quote.orderItems,
  ip_address:input.ipAddress||null,user_agent:input.userAgent||null,purchase_event_sent:false,
  payment_plan:input.paymentPlan||null,parent_order_code:null,
  invoice_requested:invoice.requested,invoice_tax_code:invoice.requested?invoice.taxCode:null,invoice_company_name:invoice.requested?invoice.companyName:null,
  invoice_company_address:invoice.requested?invoice.companyAddress:null,invoice_email:invoice.requested?invoice.email:null,
  ...attributionToDbColumns(attribution),
  paid_at:null,sepay_transaction_id:null,sepay_reference_code:null,payment_email_sent_at:null,created_at:stamp,updated_at:stamp,
 };
 const record=prepareNativeOrderRecord(JSON.stringify(row));
 const authority=nativeAuthoritySql(options.nativeAuthority,2);
 const fresh=`EXISTS(SELECT 1 FROM d1_student_catalog_current c JOIN d1_student_catalog_snapshots s ON s.snapshot_id=c.snapshot_id WHERE c.source_project_id='${PROJECT}' AND c.snapshot_id=?3 AND s.status='verified' AND julianday(s.last_verified_at)>=julianday(?2)-${CATALOG_FRESH_MS}/86400000.0)`;
 const guard=`${authority} AND ${fresh} AND NOT EXISTS(SELECT 1 FROM d1_native_checkout_requests WHERE idempotency_key=?1)`;
 const note=input.lead(row);const leadPatch={name:studentName,email,phone,message:String(note.message??'').slice(0,8000),source:cleanText(note.source,200)||'Website',...attributionToDbColumns(attribution)};
 const newLeadId=leadId??(options.createId??(()=>crypto.randomUUID()))();
 const newLead={id:newLeadId,full_name:studentName,status:'new',sale_status:'Chưa liên hệ',lead_status:'new',payment_status:'unpaid',provisioning_operation_id:null,created_at:stamp,updated_at:stamp,deleted_at:null,...leadPatch};
 const p:(string|number|null)[]=[key,stamp,String(snapshot.snapshot_id),String(record.id),String(record.order_code),Number(record.amount_vnd),String(record.row_json),digest,newLeadId,JSON.stringify(newLead),JSON.stringify({...leadPatch,updated_at:stamp})];
 const statements:Statement[]=[
  // Existing lead: update the same fields as updateLeadAdmin; new: createLeadAdmin shape.
  {sql:leadId
   ?`UPDATE d1_native_leads SET row_json=json_patch(row_json,?11),revision=revision+1 WHERE id=?9 AND ${guard}`
   :`INSERT INTO d1_native_leads(id,row_json,revision) SELECT ?9,?10,0 WHERE ${guard}`,params:p},
  {sql:`INSERT INTO d1_native_orders(id,order_code,amount_vnd,status,row_json,revision) SELECT ?4,?5,?6,'pending',?7,0 WHERE ${guard}`,params:p},
  {sql:`INSERT INTO d1_native_checkout_requests(idempotency_key,request_digest,order_code,lead_id,created_at) SELECT ?1,?8,?5,?9,?2 WHERE ${authority} AND ${fresh} AND EXISTS(SELECT 1 FROM d1_native_orders WHERE order_code=?5 AND row_json=?7) AND EXISTS(SELECT 1 FROM d1_native_leads WHERE id=?9)`,params:p},
  {sql:`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_native_checkout_requests WHERE idempotency_key=?1 AND order_code=?5 AND request_digest=?8) THEN 1 ELSE abs(-9223372036854775808) END AS ok`,params:p},
 ];
 const bind=(s:Statement)=>({sql:s.sql,params:s.params.slice(0,Math.max(0,...Array.from(s.sql.matchAll(/\?(\d+)/g),m=>Number(m[1]))))});
 try{
  const result=await db.batch(statements.map(bind));
  if(result.at(-1)?.results?.[0]?.ok!==1)throw new NativeCheckoutUnavailable();
 }catch{
  // A concurrent retry with the same key may have won; return it if identical.
  const again=await db.first('SELECT r.request_digest,o.row_json FROM d1_native_checkout_requests r JOIN d1_native_orders o ON o.order_code=r.order_code WHERE r.idempotency_key=?1',[key]).catch(()=>null);
  if(again){if(again.request_digest!==digest)throw new NativeCheckoutConflict();return {status:'existing' as const,order:JSON.parse(String(again.row_json)) as Record<string,unknown>};}
  throw new NativeCheckoutUnavailable();
 }
 return {status:'created' as const,order:row,leadId:newLeadId};
}
