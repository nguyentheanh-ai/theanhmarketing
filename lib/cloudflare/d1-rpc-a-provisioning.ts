// D1 ports of the admin student provisioning RPCs. Lease ownership is checked
// inside each UPDATE's WHERE clause, so a lost lease never writes.
import {pgTimestamp,ShimFailure,type D1PostgrestClient,type ShimRow,type ShimRpc} from './d1-postgrest';
import {normalizeVnPhone} from './d1-rpc-a-lms';

const OPS='"a_public__admin_student_provisioning_operations"',C=(t:string)=>`"a_crm_v2__${t}"`;
const iso=(ms:number)=>pgTimestamp(new Date(ms).toISOString())!;
const s=(v:unknown)=>v===null||v===undefined?'':String(v);
const bad=(m:string)=>new ShimFailure(m,'22023');
const OP_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]+$/,ORDER=/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STEPS=['validate','resolve_student','create_order','ensure_account','grant_access','send_email','complete'];
const validOpId=(v:unknown)=>typeof v==='string'&&v.length>=8&&v.length<=128&&OP_ID.test(v);
const isObj=(v:unknown):v is ShimRow=>!!v&&typeof v==='object'&&!Array.isArray(v);
const state=(r:ShimRow,k:string)=>isObj(r[k])?s((r[k] as ShimRow).state):'';
export function completedResultIsValid(r:unknown){
 if(!isObj(r))return false;
 return isObj(r.student)&&isObj(r.order)&&isObj(r.access)&&isObj(r.email)&&Array.isArray(r.nextActions)&&r.nextActions.length===0&&!('errorCode' in r)
  &&['created','existing','skipped','not_applicable'].includes(state(r,'student'))&&['created','existing','skipped','not_applicable'].includes(state(r,'order'))
  &&['existing','granted','skipped','not_applicable'].includes(state(r,'access'))&&['sent','skipped','not_applicable'].includes(state(r,'email'));
}
async function op(client:D1PostgrestClient,id:string){const r=await client.from('admin_student_provisioning_operations').select('*').eq('operation_id',id).maybeSingle();if(r.error)throw new ShimFailure(r.error.message,r.error.code);return r.data as ShimRow|null;}
const safe=(o:ShimRow)=>{const {lease_token:_a,lease_expires_at:_b,...rest}=o;void _a;void _b;return rest;};
const publicOp=(o:ShimRow)=>({id:o.id,operation_id:o.operation_id,request_fingerprint:o.request_fingerprint,mode:o.mode,status:o.status,current_step:o.current_step,order_code:o.order_code,safe_result:o.safe_result,actor_id:o.actor_id,created_at:o.created_at,updated_at:o.updated_at});
const leaseLive=(o:ShimRow|null,token:unknown,t:number)=>!!o&&o.lease_token===token&&o.lease_expires_at!=null&&Date.parse(s(o.lease_expires_at))>t;
const leaseWhere=`operation_id=?1 AND lease_token=?2 AND lease_expires_at IS NOT NULL AND lease_expires_at>?3`;
async function activity(client:D1PostgrestClient,row:ShimRow){const r=await client.from('activity_logs').insert(row);if(r.error)throw new ShimFailure(r.error.message,r.error.code);}

export const provisioningRpcs:Record<string,ShimRpc>={
 claim_admin_student_provisioning_operation:async(a,{client,now})=>{
  const secs=Number(a.p_lease_seconds);
  if(!validOpId(a.p_operation_id)||!/^[a-f0-9]{64}$/.test(s(a.p_request_fingerprint))||!['paid','free','trial'].includes(s(a.p_mode))||!UUID.test(s(a.p_lease_token))||!Number.isInteger(secs)||secs<1||secs>600)throw bad('invalid_provisioning_claim');
  const t=now(),stamp=iso(t),until=iso(t+secs*1000);
  const created=await client.from('admin_student_provisioning_operations').upsert({operation_id:a.p_operation_id,request_fingerprint:a.p_request_fingerprint,mode:a.p_mode,status:'running',current_step:'validate',actor_id:a.p_actor_id??null,lease_token:a.p_lease_token,lease_expires_at:until,updated_at:stamp},{onConflict:'operation_id',ignoreDuplicates:true}).select('*');
  if(created.error)throw new ShimFailure(created.error.message,created.error.code);
  const row=await op(client,String(a.p_operation_id));if(!row)throw new ShimFailure('provisioning_operation_missing','P0001');
  // DO NOTHING returns no row on conflict, so a returned row means this call created it.
  if(Array.isArray(created.data)&&created.data.length)return {claim_state:'new',operation:safe(row)};
  if(row.request_fingerprint!==a.p_request_fingerprint||row.mode!==a.p_mode)return {claim_state:'conflict'};
  if(row.status==='completed'){if(row.current_step!=='complete'||!completedResultIsValid(row.safe_result))throw new ShimFailure('invalid_completed_provisioning_operation','P0001');return {claim_state:'complete',operation:safe(row)};}
  if(row.lease_token!=null&&Date.parse(s(row.lease_expires_at))>t)return {claim_state:'busy'};
  // Take over only if nobody renewed the lease in between.
  const r=await client.query(`UPDATE ${OPS} SET lease_token=?2,lease_expires_at=?3,status='running',updated_at=?4 WHERE operation_id=?1 AND status<>'completed' AND (lease_token IS NULL OR lease_expires_at<=?4) RETURNING operation_id`,[String(a.p_operation_id),String(a.p_lease_token),until,stamp]);
  if(!r.length)return {claim_state:'busy'};
  return {claim_state:'resume',operation:safe((await op(client,String(a.p_operation_id)))!)};
 },
 get_admin_student_provisioning_operation:async(a,{client})=>{if(!validOpId(a.p_operation_id))throw bad('invalid_provisioning_operation_id');const o=await op(client,String(a.p_operation_id));return o?publicOp(o):null;},
 save_admin_student_provisioning_outcome:async(a,{client,now})=>{
  const secs=Number(a.p_lease_seconds),status=s(a.p_status),step=s(a.p_current_step);
  if(!validOpId(a.p_operation_id)||!UUID.test(s(a.p_lease_token))||!['running','partial','completed','failed'].includes(status)||!STEPS.includes(step)||(a.p_order_code!=null&&(s(a.p_order_code).length>120||!ORDER.test(s(a.p_order_code))))||!isObj(a.p_safe_result)||!Number.isInteger(secs)||secs<1||secs>600)throw bad('invalid_provisioning_outcome');
  if(status==='completed'&&(step!=='complete'||!completedResultIsValid(a.p_safe_result)))throw bad('invalid_completed_provisioning_outcome');
  const t=now(),stamp=iso(t),running=status==='running';
  const r=await client.query(`UPDATE ${OPS} SET status=?4,current_step=?5,order_code=?6,safe_result=?7,lease_token=?8,lease_expires_at=?9,updated_at=?3 WHERE ${leaseWhere} RETURNING operation_id`,
   [String(a.p_operation_id),String(a.p_lease_token),stamp,status,step,(a.p_order_code as string)??null,JSON.stringify(a.p_safe_result),running?String(a.p_lease_token):null,running?iso(t+secs*1000):null]);
  if(!r.length)return {save_state:'lost_lease'};
  return {save_state:'saved',operation:safe((await op(client,String(a.p_operation_id)))!)};
 },
 begin_admin_student_provisioning_email_dispatch:async(a,{client,now})=>{
  const t=now(),stamp=iso(t),o=await op(client,s(a.p_operation_id));
  if(!leaseLive(o,a.p_lease_token,t))return {dispatch_state:'lost_lease'};
  const st=o!.email_dispatch_state;
  if(st==='sent')return {dispatch_state:'sent',provider_message_id:o!.email_provider_message_id};
  if(st==='manual_review')return {dispatch_state:'manual_review'};
  if(st==='started'){await client.query(`UPDATE ${OPS} SET email_dispatch_state='manual_review',updated_at=?3 WHERE ${leaseWhere} AND email_dispatch_state='started'`,[s(a.p_operation_id),s(a.p_lease_token),stamp]);return {dispatch_state:'manual_review'};}
  if(st!=null&&st!=='retry_authorized')return {dispatch_state:'manual_review'};
  const attempt=Number(o!.email_dispatch_attempt??0)+1,key=`student-provisioning/${s(a.p_operation_id)}/email/${attempt}`;
  const r=await client.query(`UPDATE ${OPS} SET email_dispatch_state='started',email_dispatch_attempt=?4,email_dispatch_idempotency_key=?5,email_provider_message_id=NULL,email_dispatch_started_at=?3,email_dispatch_finished_at=NULL,updated_at=?3 WHERE ${leaseWhere} AND email_dispatch_state IS ?6 AND email_dispatch_attempt=?7 RETURNING operation_id`,
   [s(a.p_operation_id),s(a.p_lease_token),stamp,attempt,key,(st as string)??null,attempt-1]);
  if(!r.length)return {dispatch_state:'manual_review'};
  return {dispatch_state:'send',idempotency_key:key,attempt};
 },
 finish_admin_student_provisioning_email_dispatch:async(a,{client,now})=>{
  const st=s(a.p_state),msg=a.p_provider_message_id==null?null:s(a.p_provider_message_id);
  if(!['sent','manual_review','retryable'].includes(st)||(msg!==null&&(msg.length>160||!/^[A-Za-z0-9._:-]+$/.test(msg))))throw bad('invalid_email_dispatch_finish');
  const t=now(),stamp=iso(t),o=await op(client,s(a.p_operation_id));
  if(!leaseLive(o,a.p_lease_token,t))return {dispatch_state:'lost_lease'};
  const r=await client.query(`UPDATE ${OPS} SET email_dispatch_state=?4,email_provider_message_id=?5,email_dispatch_finished_at=?3,updated_at=?3 WHERE ${leaseWhere} AND email_dispatch_state='started' RETURNING operation_id`,
   [s(a.p_operation_id),s(a.p_lease_token),stamp,st==='retryable'?'retry_authorized':st,st==='sent'?msg:null]);
  if(!r.length)return {dispatch_state:'manual_review'};
  return {dispatch_state:st};
 },
 finalize_admin_student_provisioning_operation:async(a,{client,now})=>{
  const status=s(a.p_status),step=s(a.p_current_step),slugs=a.p_course_slugs,r0=a.p_safe_result;
  if(!validOpId(a.p_operation_id)||!UUID.test(s(a.p_lease_token))||!['partial','completed','failed'].includes(status)||!STEPS.includes(step)||(a.p_order_code!=null&&(s(a.p_order_code).length<1||s(a.p_order_code).length>120||!ORDER.test(s(a.p_order_code))))||!isObj(r0)
   ||!Array.isArray(slugs)||slugs.length<1||slugs.length>50||slugs.some(x=>typeof x!=='string'||!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(x)))throw bad('invalid_provisioning_finalization');
  if(status==='completed'&&(step!=='complete'||!completedResultIsValid(r0)))throw bad('invalid_completed_provisioning_outcome');
  const t=now(),stamp=iso(t),o=await op(client,s(a.p_operation_id));
  if(!leaseLive(o,a.p_lease_token,t))return {finalize_state:'lost_lease'};
  const existing=await client.query(`SELECT 1 FROM "a_public__activity_logs" WHERE event_type=?1 AND json_extract(metadata,'$.operationId')=?2 AND json_extract(metadata,'$.outcomeStatus')=?3 LIMIT 1`,['student_provisioning_'+status,s(a.p_operation_id),status]);
  if(!existing.length)await activity(client,{event_type:'student_provisioning_'+status,event_title:'Student provisioning outcome',status:status==='completed'?'success':status==='failed'?'failed':'pending',actor_type:o!.actor_id==null?'system':'admin',actor_id:o!.actor_id??null,
   metadata:{operationId:a.p_operation_id,outcomeStatus:status,errorCode:(r0 as ShimRow).errorCode??null,mode:o!.mode,courseSlugs:slugs},created_at:stamp});
  const r=await client.query(`UPDATE ${OPS} SET status=?4,current_step=?5,order_code=?6,safe_result=?7,lease_token=NULL,lease_expires_at=NULL,updated_at=?3 WHERE ${leaseWhere} RETURNING operation_id`,[s(a.p_operation_id),s(a.p_lease_token),stamp,status,step,(a.p_order_code as string)??null,JSON.stringify(r0)]);
  if(!r.length)return {finalize_state:'lost_lease'};
  return {finalize_state:'finalized',operation:publicOp((await op(client,s(a.p_operation_id)))!)};
 },
 resolve_admin_student_provisioning_email_review:async(a,{client,now})=>{
  const res=s(a.p_resolution);if(!a.p_owner_id||!['confirm_delivered','confirm_not_delivered'].includes(res))throw bad('invalid_email_review_resolution');
  const t=now(),stamp=iso(t),o=await op(client,s(a.p_operation_id)),sr=o?.safe_result as ShimRow|undefined;
  if(!o||o.email_dispatch_state!=='manual_review'||o.status!=='partial'||o.current_step!=='send_email'||o.lease_token!=null||o.lease_expires_at!=null||!isObj(sr)||state(sr,'email')!=='failed'||!Array.isArray(sr.nextActions)||!sr.nextActions.includes('review_email'))return {resolution_state:'not_reviewable'};
  const actions=(sr.nextActions as unknown[]).map(String);
  const next=Array.from(new Set(res==='confirm_delivered'?actions.filter(x=>x!=='review_email'):actions.map(x=>x==='review_email'?'retry_email':x))).sort();
  const result:ShimRow={...sr,...(res==='confirm_delivered'?{email:{state:'sent'}}:{}),nextActions:next};
  if(next.includes('retry_access'))result.errorCode='ACCESS_GRANT_FAILED';else if(next.includes('retry_email'))result.errorCode='EMAIL_SEND_FAILED';else delete result.errorCode;
  let status='partial',step=s(o.current_step);
  if(res==='confirm_delivered'&&next.length===0&&completedResultIsValid(result)){status='completed';step='complete';}
  const r=await client.query(`UPDATE ${OPS} SET email_dispatch_state=?2,email_dispatch_finished_at=?3,safe_result=?4,status=?5,current_step=?6,lease_token=NULL,lease_expires_at=NULL,updated_at=?7 WHERE operation_id=?1 AND email_dispatch_state='manual_review' AND status='partial' AND lease_token IS NULL RETURNING operation_id`,
   [s(a.p_operation_id),res==='confirm_delivered'?'sent':'retry_authorized',res==='confirm_delivered'?stamp:null,JSON.stringify(result),status,step,stamp]);
  if(!r.length)return {resolution_state:'not_reviewable'};
  const access=isObj(result.access)?(result.access as ShimRow).courseSlugs:null;
  await activity(client,{event_type:'student_provisioning_'+status,event_title:'Student provisioning email review',status:status==='completed'?'success':'pending',actor_type:'admin',actor_id:a.p_owner_id,
   metadata:{operationId:a.p_operation_id,outcomeStatus:status,errorCode:result.errorCode??null,mode:o.mode,courseSlugs:Array.isArray(access)?access:[],resolution:res},created_at:stamp});
  return {resolution_state:res==='confirm_delivered'?'sent':'retry_authorized'};
 },
 provision_admin_student_enrollment:async(a,{client,now})=>{
  const email=s(a.p_email).trim().toLowerCase()||null,digits=s(a.p_phone).replace(/\D/g,'')||null,normalized=normalizeVnPhone(a.p_phone),mode=s(a.p_mode);
  if(!validOpId(a.p_operation_id)||!UUID.test(s(a.p_lease_token))||!a.p_course_id||!s(a.p_course_slug).trim()||!['free','trial'].includes(mode)||(!email&&!digits)||(mode==='trial'&&!a.p_expires_at)||(mode==='free'&&a.p_expires_at))throw bad('invalid_atomic_provisioning_enrollment');
  const t=now(),stamp=iso(t),o=await op(client,s(a.p_operation_id));
  if(!leaseLive(o,a.p_lease_token,t)||o!.mode!==mode)return {outcome:'lost_lease'};
  const expires=a.p_expires_at?pgTimestamp(a.p_expires_at):null;
  if(mode==='trial'&&Date.parse(expires!)<=t)throw bad('trial_expiry_elapsed_during_provisioning');
  const byEmail=email?(await client.query(`SELECT id FROM ${C('contacts')} WHERE normalized_email=?1 ORDER BY updated_at DESC LIMIT 1`,[email]))[0]:undefined;
  const phones=normalized?(await client.query(`SELECT id,normalized_phone,phone FROM ${C('contacts')} WHERE normalized_phone=?1 OR phone LIKE ?2 OR normalized_phone LIKE ?2 ORDER BY updated_at DESC`,[normalized,'%'+(digits??'').slice(-6)+'%'])):[];
  const byPhone=phones.find(c=>c.normalized_phone===normalized||s(c.normalized_phone??c.phone).replace(/\D/g,'')===digits);
  if(byEmail&&byPhone&&byEmail.id!==byPhone.id)throw new ShimFailure('provisioning_identity_conflict','23505');
  let contactId=s((byEmail??byPhone)?.id);
  if(!contactId){
   contactId=crypto.randomUUID();
   const r=await client.schema('crm_v2').from('contacts').insert({id:contactId,full_name:s(a.p_student_name).trim()||email||digits||'Hoc vien',email,phone:s(a.p_phone).trim()||null,normalized_email:email,normalized_phone:normalized,lifecycle_stage:'student',source:'admin-provisioning',metadata:{source:'admin-provisioning'},updated_at:stamp});
   if(r.error)throw new ShimFailure(r.error.message,r.error.code);
  }
  const er=await client.schema('crm_v2').from('enrollments').select('*').eq('contact_id',contactId).eq('course_slug',s(a.p_course_slug)).limit(1).maybeSingle();
  if(er.error)throw new ShimFailure(er.error.message,er.error.code);
  const e=er.data as ShimRow|null,meta=isObj(e?.metadata)?e!.metadata as ShimRow:{};
  const opId=s(a.p_operation_id),uid=(a.p_user_id as string)??null;
  const update=async(set:string,params:unknown[],patch:ShimRow)=>{await client.query(`UPDATE ${C('enrollments')} SET ${set},metadata=?2,updated_at=?3 WHERE id=?1`,[s(e!.id),JSON.stringify({...meta,...patch}),stamp,...params] as (string|number|null)[]);};
  let outcome:string,kind:string;
  if(!e){
   const r=await client.schema('crm_v2').from('enrollments').insert({contact_id:contactId,user_id:uid,course_id:a.p_course_id,status:'active',activated_at:stamp,expires_at:mode==='free'?null:expires,course_slug:a.p_course_slug,metadata:{source:'admin-provisioning',course_title:a.p_course_title??null,provisioning_operation_id:opId,access_kind:mode},updated_at:stamp});
   if(r.error)throw new ShimFailure(r.error.message,r.error.code);outcome='granted';kind=mode;
  }else if(e.order_id!=null||meta.access_kind==='paid'){
   await update(`user_id=coalesce(?4,user_id),course_id=coalesce(course_id,?5)`,[uid,s(a.p_course_id)],{provisioning_operation_id:opId,access_kind:'paid',requested_access_kind:mode});outcome='already_paid';kind='paid';
  }else if(mode==='trial'&&['active','completed'].includes(s(e.status))&&e.expires_at==null){
   kind=meta.access_kind==='paid'||meta.access_kind==='free'?String(meta.access_kind):'free';
   await update(`user_id=coalesce(?4,user_id),course_id=?5`,[uid,s(a.p_course_id)],{provisioning_operation_id:opId,access_kind:kind,requested_access_kind:'trial'});outcome='already_unlimited';
  }else if(mode==='free'){
   await update(`user_id=coalesce(?4,user_id),course_id=?5,status='active',activated_at=coalesce(activated_at,?3),expires_at=NULL`,[uid,s(a.p_course_id)],{provisioning_operation_id:opId,access_kind:'free'});outcome='granted';kind='free';
  }else{
   await update(`user_id=coalesce(?4,user_id),course_id=?5,status='active',activated_at=coalesce(activated_at,?3),expires_at=CASE WHEN expires_at IS NOT NULL AND expires_at>?6 THEN expires_at ELSE ?6 END`,[uid,s(a.p_course_id),expires],{provisioning_operation_id:opId,access_kind:'trial'});outcome='granted';kind='trial';
  }
  const fin=(await client.schema('crm_v2').from('enrollments').select('id,status,expires_at').eq('contact_id',contactId).eq('course_slug',s(a.p_course_slug)).limit(1).single()).data as ShimRow;
  return {id:fin.id,status:fin.status,expires_at:fin.expires_at,access_kind:kind,outcome,provisioning_operation_id:opId};
 },
};
