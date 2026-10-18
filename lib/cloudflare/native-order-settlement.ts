import {getSepayOrderCode,getSepayTransactionTimestamp,resolveSepayFallbackOrderCode,type SepayWebhookPayload} from '@/lib/payments/sepay';
import {parseExactJson} from '@/lib/cloudflare/precise-json';
type Row=Record<string,unknown>;
export type NativeOrderDatabase={first:(sql:string,params:readonly(string|number|null)[])=>Promise<Row|null>;all:(sql:string,params:readonly(string|number|null)[])=>Promise<Row[]>;batch:(statements:readonly{sql:string;params:(string|number|null)[]}[])=>Promise<{results?:Row[]}[]>};
type Policy={expectedAccount:string;allowedOrderCodes:readonly string[]};
export class NativePaymentDenied extends Error{constructor(){super('Native payment requires verified reconciliation');}}
export class NativePaymentUnavailable extends Error{constructor(){super('Native payment temporarily unavailable');}}
const deny=():never=>{throw new NativePaymentDenied()},PROJECT='vsxxgdzwtscuxcmjfckt';
const ORDER=/^TAM[A-Z0-9]{1,77}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
// Mirror-only QA authority. Never turn this into a timestamp heartbeat when the
// source stops; a separately approved native-writer cutover is still required.
const ready=`EXISTS(SELECT 1 FROM d1_native_order_authority WHERE source_project_id='${PROJECT}' AND status='verified' AND julianday(snapshot_at) BETWEEN julianday('now','-5 minutes') AND julianday('now') AND julianday(verified_at) BETWEEN julianday('now','-5 minutes') AND julianday('now'))`;
function vnd(value:unknown){if(typeof value!=='number'&&(typeof value!=='string'||!/^\d+(?:\.0+)?$/.test(value)))return deny();const amount=Number(value);return Number.isSafeInteger(amount)&&amount>0?amount:deny();}
function identity(value:unknown){if(value===undefined||value===null||value==='')return null;if(typeof value==='number'&&(!Number.isSafeInteger(value)||value<0))return deny();if(typeof value!=='string'&&typeof value!=='number')return deny();const text=String(value).trim();return text&&text.length<=160&&!/[\x00-\x1f\x7f]/.test(text)?text:deny();}
function account(value:unknown){return typeof value==='string'&&/^\d{4,40}$/.test(value.trim())?value.trim():deny();}
function scope(policy:Policy){const ids=policy.allowedOrderCodes;if(!Array.isArray(ids)||!ids.length||ids.length>10||new Set(ids).size!==ids.length||ids.some(v=>typeof v!=='string'||!ORDER.test(v)))return deny();return JSON.stringify(ids);}
async function assertReady(db:NativeOrderDatabase){if((await db.first(`SELECT 1 AS ready WHERE ${ready}`,[]))?.ready!==1)throw new NativePaymentUnavailable();}
function decodeOrder(row:Row){if(typeof row.row_json!=='string'||typeof row.order_code!=='string'||!ORDER.test(row.order_code)||typeof row.id!=='string'||!UUID.test(row.id)||!Number.isSafeInteger(row.revision)||Number(row.revision)<0)return deny();const data=parseExactJson(row.row_json) as Row;if(data.id!==row.id||data.order_code!==row.order_code||data.status!==row.status||vnd(data.amount)!==row.amount_vnd||data.currency!=='VND')return deny();return data;}
// Validate a complete source row without projecting away invoice, attribution,
// product-plan, delivery markers, unknown future fields or private raw payload.
export function prepareNativeOrderRecord(raw:string){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>262144)return deny();
 let data:Row;try{data=parseExactJson(raw) as Row;}catch{return deny();}
 if(!data||typeof data!=='object'||Array.isArray(data)||!['pending','expired','failed','paid'].includes(String(data.status)))return deny();
 const row={id:data.id,order_code:data.order_code,amount_vnd:vnd(data.amount),status:data.status,row_json:raw,revision:0};decodeOrder(row);return row;
}
async function receipt(db:NativeOrderDatabase,transaction:string|null,reference:string|null){const rows=await db.all('SELECT * FROM d1_native_sepay_receipts WHERE (?1 IS NOT NULL AND transaction_id=?1) OR (?2 IS NOT NULL AND reference_code=?2)',[transaction,reference]);if(rows.length>1)return deny();return rows[0]??null;}
function sameReceipt(row:Row,code:string,amount:number,receiver:string,transaction:string|null,reference:string|null){return row.order_code===code&&row.amount_vnd===amount&&row.receiver_account===receiver&&row.transaction_id===transaction&&row.reference_code===reference;}
export async function settleNativeSepayOrder(db:NativeOrderDatabase,payload:SepayWebhookPayload,policy:Policy):Promise<{status:'settled'|'duplicate';orderCode:string}>{
 try{
  const cohort=scope(policy),expected=account(policy.expectedAccount);
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return deny();
  if(String(payload.transferType??payload.transfer_type??'').toLowerCase()!=='in')return deny();
  const receiver=account(payload.accountNumber??payload.account_number);if(receiver!==expected)return deny();
  const amount=vnd(payload.transferAmount??payload.transfer_amount),transaction=identity(payload.id),reference=identity(payload.referenceCode??payload.reference_code);if(!transaction&&!reference)return deny();
  const raw=JSON.stringify(payload);if(new TextEncoder().encode(raw).length>16384)return deny();
  await assertReady(db);
  const prior=await receipt(db,transaction,reference);let code=getSepayOrderCode(payload);
  if(!code&&prior)code=String(prior.order_code);
  // Imported paid rows also own their bank identifiers. A transaction cannot
  // pay a new order merely because its historical receipt has not been imported.
  const historical=await db.all(`SELECT order_code FROM d1_native_orders WHERE (?1 IS NOT NULL AND json_extract(row_json,'$.sepay_transaction_id')=?1) OR (?2 IS NOT NULL AND json_extract(row_json,'$.sepay_reference_code')=?2) LIMIT 2`,[transaction,reference]);
  if(historical.length>1||historical.some(r=>code&&r.order_code!==code))return deny();
  if(!code&&historical[0])code=String(historical[0].order_code);
  if(!code){const time=getSepayTransactionTimestamp(payload);if(time===null)return deny();const rows=await db.all(`SELECT order_code,amount_vnd,status,row_json FROM d1_native_orders WHERE status IN ('pending','expired') AND amount_vnd=?1 AND julianday(json_extract(row_json,'$.created_at')) BETWEEN julianday(?2) AND julianday(?3)`,[amount,new Date(time-86400000).toISOString(),new Date(time+300000).toISOString()]);code=resolveSepayFallbackOrderCode(payload,rows.map(r=>{const data=JSON.parse(String(r.row_json));return {orderCode:String(r.order_code),studentName:typeof data.student_name==='string'?data.student_name:'',amount:Number(r.amount_vnd),status:String(r.status),createdAt:typeof data.created_at==='string'?data.created_at:''};}));}
  if(!ORDER.test(code)||!policy.allowedOrderCodes.includes(code))return deny();
  const row=await db.first('SELECT * FROM d1_native_orders WHERE order_code=?1',[code]);if(!row)return deny();const source=decodeOrder(row);
  const duplicate=async()=>{const current=await db.first(`SELECT o.status FROM d1_native_orders o JOIN d1_native_order_fulfillment f ON f.order_code=o.order_code JOIN d1_native_sepay_receipts r ON r.event_key=f.receipt_key WHERE o.order_code=?1 AND r.transaction_id IS ?2 AND r.reference_code IS ?3`,[code,transaction,reference]);if(current?.status!=='paid')return deny();await assertReady(db);return {status:'duplicate' as const,orderCode:code};};
  if(prior){if(!sameReceipt(prior,code,amount,receiver,transaction,reference))return deny();return duplicate();}
  if(row.status==='paid'){
   const raced=await receipt(db,transaction,reference);
   if(raced){if(!sameReceipt(raced,code,amount,receiver,transaction,reference))return deny();return duplicate();}
   // Original paid Source rows have revision zero. Never invent a settlement
   // receipt or rerun historical delivery; require an exact retained bank proof.
   if(row.revision!==0||historical.length!==1||amount<Number(row.amount_vnd))return deny();
   const oldTransaction=identity(source.sepay_transaction_id),oldReference=identity(source.sepay_reference_code);
   if(oldTransaction&&oldTransaction!==transaction)return deny();
   if(oldReference&&oldReference!==(reference??transaction))return deny();
   if(!oldTransaction&&!oldReference)return deny();
   const original=source.sepay_payload;
   if(original&&typeof original==='object'&&!Array.isArray(original)){
    const old=original as Record<string,unknown>,received=old.transferAmount??old.transfer_amount;
    if(received!==undefined&&vnd(received)!==amount)return deny();
   }
   await assertReady(db);return {status:'duplicate',orderCode:code};
  }
  if(!['pending','expired','failed'].includes(String(row.status))||amount<Number(row.amount_vnd))return deny();
  const eventKey=transaction?'id:'+transaction:'ref:'+reference;
  const stamp=new Date().toISOString(),params:(string|number|null)[]=[code,String(row.row_json),Number(row.revision),Number(row.amount_vnd),stamp,eventKey,transaction,reference,receiver,cohort,amount,raw];
  const ownership=`NOT EXISTS(SELECT 1 FROM d1_native_orders historical WHERE historical.order_code<>?1 AND ((?7 IS NOT NULL AND json_extract(historical.row_json,'$.sepay_transaction_id')=?7) OR (?8 IS NOT NULL AND json_extract(historical.row_json,'$.sepay_reference_code')=?8)))`;
  const allowed=`${ready} AND EXISTS(SELECT 1 FROM json_each(?10) c WHERE c.value=?1) AND ${ownership}`;
  const old=`order_code=?1 AND row_json=?2 AND revision=?3 AND amount_vnd=?4 AND status IN ('pending','expired','failed') AND ${allowed}`;
  const accepted=`EXISTS(SELECT 1 FROM d1_native_sepay_receipts r WHERE r.event_key=?6 AND r.order_code=?1 AND r.transaction_id IS ?7 AND r.reference_code IS ?8 AND r.amount_vnd=?11 AND r.receiver_account=?9)`;
  const updated=`json_set(?2,'$.status','paid','$.payment_status','paid','$.paid_at',?5,'$.updated_at',?5,'$.sepay_transaction_id',?7,'$.sepay_reference_code',coalesce(?8,?7),'$.sepay_payload',json(?12))`;
  const paid=`order_code=?1 AND status='paid' AND revision=?3+1 AND amount_vnd=?4 AND row_json=${updated} AND ${allowed} AND ${accepted}`;
  try{
   const result=await db.batch([
    {sql:`INSERT INTO d1_native_sepay_receipts(event_key,transaction_id,reference_code,order_code,amount_vnd,receiver_account,accepted_at) SELECT ?6,?7,?8,?1,?11,?9,?5 FROM d1_native_orders WHERE ${old}`,params:params.slice(0,11)},
    {sql:`UPDATE d1_native_orders SET status='paid',row_json=${updated},revision=revision+1 WHERE ${old} AND ${accepted}`,params},
    {sql:`INSERT INTO d1_native_order_fulfillment(order_code,receipt_key,order_revision,order_snapshot,created_at) SELECT order_code,?6,revision,row_json,?5 FROM d1_native_orders WHERE ${paid}`,params},
    // A failing scalar forces D1 rollback; a zero-row INSERT would not.
    {sql:`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_native_orders WHERE ${paid}) AND EXISTS(SELECT 1 FROM d1_native_order_fulfillment WHERE order_code=?1 AND receipt_key=?6 AND order_revision=?3+1 AND order_snapshot=${updated} AND status='pending') THEN 1 ELSE abs(-9223372036854775808) END AS settled`,params},
   ]);
   if(result[3]?.results?.[0]?.settled!==1)throw new NativePaymentUnavailable();
  }catch{
   // Concurrent identical deliveries may race at UNIQUE. Only an independently
   // confirmed matching committed receipt qualifies as a successful retry.
   const concurrent=await receipt(db,transaction,reference);
   if(concurrent&&sameReceipt(concurrent,code,amount,receiver,transaction,reference))return duplicate();
   // No confirmed matching commit: ask the provider to retry. A database or
   // transport failure is not evidence that the payment payload is invalid.
   throw new NativePaymentUnavailable();
  }
  return {status:'settled',orderCode:code};
 }catch(error){if(error instanceof NativePaymentDenied)throw error;throw new NativePaymentUnavailable();}
}
