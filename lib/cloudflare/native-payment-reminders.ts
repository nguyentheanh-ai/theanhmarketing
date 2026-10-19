import {isPaymentReminderMorning} from '@/lib/notifications/payment-reminder-schedule';
import {buildPaymentReminderEmailPayload} from '@/lib/notifications/payment-reminder-payload';
import {nativeAuthoritySql,type AuthorityHandoff} from './d1-data-authority';
import {nativeRowToPaymentOrder} from './native-checkout-http';
import type {NativeMailSender} from './native-paid-email';
import type {NativeOrderDatabase} from './native-order-settlement';

const LEASE_MS=10*60_000;
// Same as public.next_payment_reminder_morning (Asia/Ho_Chi_Minh, fixed UTC+7).
export function nextPaymentReminderMorning(after:number){
 const vn=new Date(after+7*3600_000),minutes=vn.getUTCHours()*60+vn.getUTCMinutes();
 const day=Date.UTC(vn.getUTCFullYear(),vn.getUTCMonth(),vn.getUTCDate()+(minutes<510?0:1),8,30)-7*3600_000;
 return new Date(day).toISOString();
}
const unpaid=`o.status IN ('pending','expired') AND coalesce(json_extract(o.row_json,'$.payment_status'),'')<>'paid' AND trim(coalesce(json_extract(o.row_json,'$.email'),''))<>''`;

// Same as POST /api/orders/expire: pending orders past expires_at become expired
// (reminders stay queued, as in Source: expired orders still get reminded).
export async function expireNativePendingOrders(db:NativeOrderDatabase,authority:AuthorityHandoff,now=Date.now()){
 const stamp=new Date(now).toISOString();
 const rows=await db.batch([{sql:`UPDATE d1_native_orders SET status='expired',row_json=json_set(row_json,'$.status','expired','$.updated_at',?1),revision=revision+1 WHERE status='pending' AND julianday(json_extract(row_json,'$.expires_at'))<julianday(?1) AND ${nativeAuthoritySql(authority,1)} RETURNING order_code`,params:[stamp]}]);
 return (rows[0]?.results??[]).map(r=>String(r.order_code));
}

type Summary={ok:boolean;claimed:number;sent:number;cancelled:number;retried:number;lostLease:number};
// Native replacement for dispatchDuePaymentReminderRuns + claim/finish/cancel
// RPCs. Leases make two overlapping cron runs safe: a run is sent at most once
// per lease and finished only by the lease holder. Only drains 08:30-09:00 VN.
export async function dispatchNativePaymentReminders(db:NativeOrderDatabase,options:{authority:AuthorityHandoff;send:NativeMailSender;now?:()=>number;maxBatches?:number}):Promise<Summary>{
 const now=options.now??Date.now,summary:Summary={ok:true,claimed:0,sent:0,cancelled:0,retried:0,lostLease:0};
 if(!isPaymentReminderMorning(new Date(now())))return summary;
 const authority=nativeAuthoritySql(options.authority,1);
 for(let batch=0;batch<(options.maxBatches??20)&&isPaymentReminderMorning(new Date(now()));batch++){
  const t=now(),stamp=new Date(t).toISOString(),lease=crypto.randomUUID();
  const claimed=await db.batch([{sql:`UPDATE d1_native_payment_remarketing_runs SET status='sending',attempt_count=attempt_count+1,next_attempt_at=NULL,lease_token=?2,lease_expires_at=?3,updated_at=?1
   WHERE id IN (SELECT r.id FROM d1_native_payment_remarketing_runs r JOIN d1_native_orders o ON o.id=r.order_id WHERE ${unpaid}
    AND julianday(r.due_at)<=julianday(?1)
    AND ((r.status IN ('queued','retry') AND julianday(coalesce(r.next_attempt_at,r.due_at))<=julianday(?1)) OR (r.status='sending' AND julianday(r.lease_expires_at)<=julianday(?1)))
    AND (r.sequence_index=1 OR (r.sequence_index=2 AND EXISTS(SELECT 1 FROM d1_native_payment_remarketing_runs p WHERE p.order_id=r.order_id AND p.sequence_index=1 AND p.status='sent')))
    ORDER BY r.due_at,r.id LIMIT 3) AND ${authority}
   RETURNING id,order_id,sequence_index`,params:[stamp,lease,new Date(t+LEASE_MS).toISOString()]}]).catch(()=>null);
  if(!claimed){summary.ok=false;break;}
  const runs=(claimed[0]?.results??[]) as {id:string;order_id:string;sequence_index:number}[];
  summary.claimed+=runs.length;if(!runs.length)break;
  for(const run of runs){
   const finish=async(sql:string,params:(string|number|null)[])=>{const r=await db.batch([{sql:`${sql} AND status='sending' AND lease_token=?2 AND julianday(lease_expires_at)>julianday(?3) RETURNING id`,params}]).catch(()=>null);return Boolean(r?.[0]?.results?.length);};
   const order=await db.first(`SELECT o.row_json FROM d1_native_orders o WHERE o.id=?1 AND ${unpaid}`,[run.order_id]).catch(()=>undefined);
   if(order===undefined){if(await finish(`UPDATE d1_native_payment_remarketing_runs SET status='retry',next_attempt_at=?4,last_error='Could not recheck order',lease_token=NULL,lease_expires_at=NULL,updated_at=?3 WHERE id=?1`,[run.id,lease,new Date(now()).toISOString(),nextPaymentReminderMorning(now())]))summary.retried++;else summary.lostLease++;continue;}
   if(!order){if(await finish(`UPDATE d1_native_payment_remarketing_runs SET status='cancelled',next_attempt_at=NULL,last_error='Order is no longer unpaid',lease_token=NULL,lease_expires_at=NULL,updated_at=?3 WHERE id=?1`,[run.id,lease,new Date(now()).toISOString()]))summary.cancelled++;else summary.lostLease++;continue;}
   const sequence=run.sequence_index===2?2:1,payment=nativeRowToPaymentOrder(JSON.parse(String(order.row_json)) as Record<string,unknown>);
   const result=await options.send(buildPaymentReminderEmailPayload(payment,sequence),`payment-reminder/${run.id}`).catch(()=>({ok:false as const,id:null}));
   const at=now(),done=new Date(at).toISOString();
   const ok=result.ok&&Boolean(result.id);
   const finished=ok
    ? await finish(`UPDATE d1_native_payment_remarketing_runs SET status='sent',resend_email_id=?4,sent_at=?3,next_attempt_at=NULL,last_error=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=?3 WHERE id=?1`,[run.id,lease,done,String(result.id).slice(0,160)])
    : await finish(`UPDATE d1_native_payment_remarketing_runs SET status='retry',next_attempt_at=?4,last_error='Resend request failed',lease_token=NULL,lease_expires_at=NULL,updated_at=?3 WHERE id=?1`,[run.id,lease,done,nextPaymentReminderMorning(at)]);
   if(!finished){summary.lostLease++;continue;}
   if(ok&&sequence===1)await db.batch([{sql:`INSERT INTO d1_native_payment_remarketing_runs(order_id,sequence_index,product_key,due_at,status) SELECT ?1,2,'pending_order',?2,'queued' WHERE EXISTS(SELECT 1 FROM d1_native_orders o WHERE o.id=?1 AND ${unpaid}) ON CONFLICT(order_id,sequence_index) DO NOTHING`,params:[run.order_id,nextPaymentReminderMorning(at)]}]).catch(()=>null);
   if(ok)summary.sent++;else summary.retried++;
  }
 }
 return summary;
}
