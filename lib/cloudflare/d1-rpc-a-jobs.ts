// D1 ports of Supabase A lease/queue RPCs (claim_* / finish_*). Each claim or
// finish is ONE statement, so D1's serialized writes give the same mutual
// exclusion as FOR UPDATE / advisory locks in the Postgres originals.
import {pgTimestamp,ShimFailure,type ShimRpc,type ShimRow} from './d1-postgrest';

const T=(table:string)=>`"a_public__${table}"`;
const iso=(ms:number)=>pgTimestamp(new Date(ms).toISOString())!;
const invalid=(name:string)=>new ShimFailure(name,'22023');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ts=(v:unknown)=>{if(v===null||v===undefined||v==='')return null;try{return pgTimestamp(v);}catch{return null;}};
const ms=(v:string|null)=>v===null?NaN:Date.parse(v);

// Next 08:30 Asia/Ho_Chi_Minh strictly after the instant (public.next_payment_reminder_morning).
export function nextReminderMorning(after:number){
 const vn=new Date(after+7*3600_000),minutes=vn.getUTCHours()*60+vn.getUTCMinutes()+vn.getUTCSeconds()/60;
 return iso(Date.UTC(vn.getUTCFullYear(),vn.getUTCMonth(),vn.getUTCDate()+(minutes<510?0:1),8,30)-7*3600_000);
}
export function isReminderMorning(at:number){const vn=new Date(at+7*3600_000),m=vn.getUTCHours()*60+vn.getUTCMinutes();return m>=510&&m<540;}

const claimReportRun=(table:string,keyColumn:string,kind:string):ShimRpc=>async(args,{client,now})=>{
 const t=now(),lease=crypto.randomUUID(),stamp=iso(t),leaseUntil=iso(t+10*60_000);
 const key=table==='telegram_business_report_runs'?args.p_run_key:args.p_report_date;
 const start=ts(args.p_window_start),end=ts(args.p_window_end);
 if(typeof key!=='string'||!start||!end||ms(end)<=ms(start))throw invalid(`invalid_${kind}_claim`);
 if(table==='telegram_business_report_runs'&&(key.length<20||key.length>180||!['morning','full-day'].includes(String(args.p_slot))))throw invalid(`invalid_${kind}_claim`);
 if(table==='accounting_daily_report_runs'&&(!/^\d{4}-\d{2}-\d{2}$/.test(key)||ms(end)-ms(start)!==86400000))throw invalid(`invalid_${kind}_claim`);
 const slotCols=table==='telegram_business_report_runs'?',slot':'',slotVals=table==='telegram_business_report_runs'?',?7':'';
 const existing=(await client.query(`SELECT * FROM ${T(table)} WHERE ${keyColumn}=?`,[key]))[0];
 if(existing){
  const sameWindow=ms(String(existing.window_start))===ms(start)&&ms(String(existing.window_end))===ms(end)&&(table!=='telegram_business_report_runs'||existing.slot===args.p_slot);
  if(!sameWindow)throw invalid(`${kind}_window_mismatch`);
 }
 // Raw insert: supply the Postgres column defaults (id, created_at, counters).
 const extra=table==='accounting_daily_report_runs'?',order_count,total_amount':'',extraVals=table==='accounting_daily_report_runs'?',0,0':'';
 const rows=await client.query(`INSERT INTO ${T(table)} AS r (id,created_at,${keyColumn},window_start,window_end,state,attempt_count,lease_token,lease_expires_at,started_at,updated_at${slotCols}${extra})
  VALUES('${crypto.randomUUID()}',?6,?1,?2,?3,'processing',1,?4,?5,?6,?6${slotVals}${extraVals})
  ON CONFLICT(${keyColumn}) DO UPDATE SET state='processing',attempt_count=r.attempt_count+1,lease_token=?4,lease_expires_at=?5,last_error=NULL,started_at=?6,updated_at=?6
  WHERE NOT (r.state='sent' OR (r.state='processing' AND r.lease_expires_at>?6))
  RETURNING lease_token`,table==='telegram_business_report_runs'?[key,start,end,lease,leaseUntil,stamp,args.p_slot as string]:[key,start,end,lease,leaseUntil,stamp]);
 return rows[0]?.lease_token===lease?{claimed:true,lease_token:lease}:{claimed:false};
};

export const jobRpcs:Record<string,ShimRpc>={
 claim_telegram_business_report:claimReportRun('telegram_business_report_runs','run_key','telegram_business_report'),
 claim_accounting_daily_report:claimReportRun('accounting_daily_report_runs','report_date','accounting_daily_report'),
 finish_telegram_business_report:async(a,{client,now})=>{
  if(!['sent','failed'].includes(String(a.p_outcome))||typeof a.p_lease_token!=='string')throw invalid('invalid_telegram_business_report_finish');
  const stamp=iso(now()),sent=a.p_outcome==='sent';
  const r=await client.query(`UPDATE ${T('telegram_business_report_runs')} SET state=?3,sent_at=CASE WHEN ?4 THEN ?5 ELSE sent_at END,last_error=CASE WHEN ?4 THEN NULL ELSE substr(coalesce(?6,'Unknown delivery failure'),1,800) END,lease_token=NULL,lease_expires_at=NULL,updated_at=?5 WHERE run_key=?1 AND state='processing' AND lease_token=?2 RETURNING run_key`,[a.p_run_key as string,a.p_lease_token,a.p_outcome as string,sent?1:0,stamp,(a.p_error as string)??null]);
  return r.length===1;
 },
 finish_accounting_daily_report:async(a,{client,now})=>{
  const count=Number(a.p_order_count),total=Number(a.p_total_amount);
  if(typeof a.p_report_date!=='string'||typeof a.p_lease_token!=='string'||!['sent','failed'].includes(String(a.p_outcome))||!Number.isInteger(count)||count<0||!Number.isInteger(total)||total<0)throw invalid('invalid_accounting_daily_report_finish');
  const stamp=iso(now()),sent=a.p_outcome==='sent';
  const r=await client.query(`UPDATE ${T('accounting_daily_report_runs')} SET state=?3,sent_at=CASE WHEN ?4 THEN ?5 ELSE sent_at END,last_error=CASE WHEN ?4 THEN NULL ELSE substr(coalesce(?6,'Unknown delivery failure'),1,800) END,order_count=?7,total_amount=?8,resend_email_id=CASE WHEN ?4 THEN substr(coalesce(?9,''),1,200) ELSE resend_email_id END,lease_token=NULL,lease_expires_at=NULL,updated_at=?5 WHERE report_date=?1 AND state='processing' AND lease_token=?2 RETURNING report_date`,[a.p_report_date,a.p_lease_token,a.p_outcome as string,sent?1:0,stamp,(a.p_error as string)??null,count,total,(a.p_resend_email_id as string)??null]);
  return r.length===1;
 },
 claim_meta_purchase_orders:async(a,{client,now})=>{
  const limit=Number(a.p_limit),code=a.p_order_code==null?null:String(a.p_order_code).toUpperCase();
  if(!Number.isInteger(limit)||limit<1||limit>25||(code!==null&&(code.length>120||!/^TAM[A-Z0-9]+$/.test(code))))throw invalid('invalid_meta_purchase_claim');
  const t=now(),stamp=iso(t),week=iso(t-7*86400000),lease=iso(t+5*60_000);
  // One UPDATE claims each row atomically; every claimed row gets its own token.
  const rows=await client.query(`UPDATE ${T('orders')} SET meta_purchase_state='sending',meta_purchase_attempt_count=coalesce(meta_purchase_attempt_count,0)+1,meta_purchase_last_attempt_at=?1,meta_purchase_next_attempt_at=NULL,
   meta_purchase_lease_token=lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',1+(abs(random())%4),1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))),
   meta_purchase_lease_expires_at=?2,updated_at=?1
   WHERE id IN (SELECT o.id FROM ${T('orders')} o WHERE o.status='paid' AND coalesce(o.purchase_event_sent,0)=0 AND o.paid_at>=?3 AND (?4 IS NULL OR o.order_code=?4)
    AND (o.meta_purchase_state IS NULL OR (o.meta_purchase_state IN ('pending','retry') AND coalesce(o.meta_purchase_next_attempt_at,?1)<=?1) OR (o.meta_purchase_state='sending' AND o.meta_purchase_lease_expires_at<=?1))
    ORDER BY o.paid_at ASC LIMIT ?5)
   RETURNING id,order_code,student_name,email,phone,course_slug,course_title,amount,currency,status,paid_at,order_items,utm_source,utm_medium,utm_campaign,utm_content,utm_id,utm_term,campaign_id,campaign_name,adset_id,ad_id,ad_name,fbclid,fbc,fbp,landing_page,ip_address,user_agent,meta_purchase_attempt_count,meta_purchase_lease_token`,[stamp,lease,week,code,limit]);
  return rows.map(r=>({...r,amount:r.amount===null?null:Number(r.amount),order_items:typeof r.order_items==='string'?JSON.parse(r.order_items):r.order_items}));
 },
 finish_meta_purchase_order:async(a,{client,now})=>{
  const t=now(),code=String(a.p_order_code??'').toUpperCase(),ok=a.p_succeeded,next=ts(a.p_next_attempt_at);
  if(!/^TAM[A-Z0-9]+$/.test(code)||typeof a.p_lease_token!=='string'||typeof ok!=='boolean'||(!ok&&(!next||ms(next)<=t))||String(a.p_error??'').length>800||String(a.p_fbtrace_id??'').length>160)throw invalid('invalid_meta_purchase_finish');
  const stamp=iso(t);
  const r=await client.query(`UPDATE ${T('orders')} SET purchase_event_sent=?3,meta_purchase_state=CASE WHEN ?3 THEN 'sent' ELSE 'retry' END,meta_purchase_next_attempt_at=CASE WHEN ?3 THEN NULL ELSE ?4 END,
   meta_purchase_last_error=CASE WHEN ?3 THEN NULL ELSE nullif(trim(?5),'') END,meta_purchase_sent_at=CASE WHEN ?3 THEN ?6 ELSE meta_purchase_sent_at END,
   meta_purchase_fbtrace_id=CASE WHEN ?3 THEN nullif(trim(?7),'') ELSE meta_purchase_fbtrace_id END,meta_purchase_lease_token=NULL,meta_purchase_lease_expires_at=NULL,updated_at=?6
   WHERE order_code=?1 AND meta_purchase_state='sending' AND meta_purchase_lease_token=?2 AND meta_purchase_lease_expires_at IS NOT NULL AND meta_purchase_lease_expires_at>?6 RETURNING id`,[code,a.p_lease_token,ok?1:0,next,(a.p_error as string)??null,stamp,(a.p_fbtrace_id as string)??null]);
  return {finish_state:r.length?(ok?'sent':'retry'):'lost_lease'};
 },
 claim_due_payment_remarketing_runs:async(a,{client,now})=>{
  const limit=Number(a.p_limit??10),t=now();
  if(!Number.isInteger(limit)||limit<1||limit>25)throw invalid('invalid_payment_remarketing_claim');
  if(!isReminderMorning(t))return [];
  const stamp=iso(t),lease=iso(t+10*60_000);
  const rows=await client.query(`UPDATE ${T('payment_remarketing_runs')} SET status='sending',attempt_count=attempt_count+1,next_attempt_at=NULL,
   lease_token=lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',1+(abs(random())%4),1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))),lease_expires_at=?2,updated_at=?1
   WHERE id IN (SELECT r.id FROM ${T('payment_remarketing_runs')} r JOIN ${T('orders')} o ON o.id=r.order_id
    WHERE o.status IN ('pending','expired') AND coalesce(o.payment_status,'')<>'paid' AND trim(coalesce(o.email,''))<>'' AND r.due_at<=?1
    AND ((r.status IN ('queued','retry') AND coalesce(r.next_attempt_at,r.due_at)<=?1) OR (r.status='sending' AND r.lease_expires_at<=?1))
    AND (r.sequence_index=1 OR (r.sequence_index=2 AND EXISTS(SELECT 1 FROM ${T('payment_remarketing_runs')} p WHERE p.order_id=r.order_id AND p.sequence_index=1 AND p.status='sent')))
    ORDER BY r.due_at ASC,r.id ASC LIMIT ?3)
   RETURNING id,order_id,sequence_index,lease_token,due_at`,[stamp,lease,limit]);
  const codes=new Map<string,string>();
  if(rows.length)for(const o of await client.query(`SELECT id,order_code FROM ${T('orders')} WHERE id IN (SELECT value FROM json_each(?))`,[JSON.stringify(rows.map(r=>r.order_id))]))codes.set(String(o.id),String(o.order_code));
  return rows.sort((x,y)=>String(x.due_at).localeCompare(String(y.due_at))||String(x.id).localeCompare(String(y.id))).map((r:ShimRow)=>({run_id:r.id,order_id:r.order_id,order_code:codes.get(String(r.order_id))??null,sequence_index:Number(r.sequence_index),lease_token:r.lease_token}));
 },
 finish_payment_remarketing_run:async(a,{client,now})=>{
  if(!UUID.test(String(a.p_run_id))||!UUID.test(String(a.p_lease_token))||typeof a.p_succeeded!=='boolean'||String(a.p_resend_email_id??'').length>160||String(a.p_error??'').length>800)throw invalid('invalid_payment_remarketing_finish');
  const t=now(),stamp=iso(t),ok=a.p_succeeded;
  const r=await client.query(`UPDATE ${T('payment_remarketing_runs')} SET status=CASE WHEN ?3 THEN 'sent' ELSE 'retry' END,resend_email_id=CASE WHEN ?3 THEN nullif(trim(?4),'') ELSE resend_email_id END,sent_at=CASE WHEN ?3 THEN ?5 ELSE sent_at END,
   next_attempt_at=CASE WHEN ?3 THEN NULL ELSE ?6 END,last_error=CASE WHEN ?3 THEN NULL ELSE nullif(trim(?7),'') END,lease_token=NULL,lease_expires_at=NULL,updated_at=?5
   WHERE id=?1 AND status='sending' AND lease_token=?2 AND lease_expires_at IS NOT NULL AND lease_expires_at>?5 RETURNING order_id,sequence_index`,[a.p_run_id as string,a.p_lease_token as string,ok?1:0,(a.p_resend_email_id as string)??null,stamp,nextReminderMorning(t),(a.p_error as string)??null]);
  if(!r.length)return {finish_state:'lost_lease'};
  if(ok&&Number(r[0].sequence_index)===1)await client.query(`INSERT INTO ${T('payment_remarketing_runs')}(id,order_id,sequence_index,product_key,due_at,status,attempt_count,created_at,updated_at)
   SELECT ?1,?2,2,'pending_order',?3,'queued',0,?4,?4 WHERE EXISTS(SELECT 1 FROM ${T('orders')} o WHERE o.id=?2 AND o.status IN ('pending','expired') AND coalesce(o.payment_status,'')<>'paid')
   ON CONFLICT(order_id,sequence_index) DO NOTHING`,[crypto.randomUUID(),r[0].order_id as string,nextReminderMorning(t),stamp]);
  return {finish_state:ok?'sent':'retry'};
 },
 cancel_payment_remarketing_run:async(a,{client,now})=>{
  if(!UUID.test(String(a.p_run_id))||!UUID.test(String(a.p_lease_token))||String(a.p_reason??'').length>800)throw invalid('invalid_payment_remarketing_cancel');
  const r=await client.query(`UPDATE ${T('payment_remarketing_runs')} SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,next_attempt_at=NULL,last_error=nullif(trim(?3),''),updated_at=?4 WHERE id=?1 AND status='sending' AND lease_token=?2 RETURNING id`,[a.p_run_id as string,a.p_lease_token as string,(a.p_reason as string)??null,iso(now())]);
  return {finish_state:r.length?'cancelled':'lost_lease'};
 },
};
