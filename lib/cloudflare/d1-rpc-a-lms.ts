// D1 ports of Supabase A LMS write RPCs. Each step is idempotent (lookup then
// insert-or-update), so a retry after a partial failure converges to the same
// state as the single Postgres transaction.
import {pgTimestamp,ShimFailure,type D1PostgrestClient,type ShimRow,type ShimRpc} from './d1-postgrest';

const P=(t:string)=>`"a_public__${t}"`,C=(t:string)=>`"a_crm_v2__${t}"`;
const iso=(ms:number)=>pgTimestamp(new Date(ms).toISOString())!;
const s=(v:unknown)=>v===null||v===undefined?'':String(v);
const fail=(code:string)=>new ShimFailure(code,'P0001');
const json=(v:unknown)=>JSON.stringify(v);
const merge=(raw:unknown,patch:ShimRow)=>{let base:ShimRow={};try{base=typeof raw==='string'?JSON.parse(raw):(raw as ShimRow)??{};}catch{base={};}return json({...base,...patch});};

// Same normalisation as the SQL original (Vietnamese numbers to +84...).
export function normalizeVnPhone(phone:unknown){
 const raw=s(phone).trim(),digits=raw.replace(/\D/g,'');if(!digits)return null;
 if(raw.startsWith('+')&&digits.startsWith('84'))return '+'+digits;
 if(digits.startsWith('84'))return '+'+digits;
 if(digits.startsWith('0'))return '+84'+digits.slice(1);
 if(digits.length>=9&&digits.length<=10)return '+84'+digits;
 if(raw.startsWith('+'))return '+'+digits;
 return digits;
}

async function upsertEnrollment(client:D1PostgrestClient,a:Record<string,unknown>,now:number){
 const email=s(a.p_email).trim().toLowerCase()||null,phone=s(a.p_phone).trim()||null,normalizedPhone=normalizeVnPhone(a.p_phone),stamp=iso(now);
 if(!email&&!normalizedPhone)throw fail('missing_student_identity');
 let contact=(await client.query(`SELECT * FROM ${C('contacts')} c WHERE (?1 IS NOT NULL AND c.normalized_email=?1) OR (?2 IS NOT NULL AND c.normalized_phone=?2) ORDER BY c.updated_at DESC LIMIT 1`,[email,normalizedPhone]))[0];
 if(!contact){
  const id=crypto.randomUUID(),name=s(a.p_student_name).trim()||email||normalizedPhone||'Hoc vien';
  const r=await client.schema('crm_v2').from('contacts').insert({id,full_name:name,email,phone,normalized_email:email,normalized_phone:normalizedPhone,lifecycle_stage:'student',source:'crm-v2-lms',metadata:{source:'crm-v2-lms'},updated_at:stamp}).select('*').single();
  if(r.error)throw new ShimFailure(r.error.message,r.error.code);contact=r.data as ShimRow;
 }
 const meta={source:'crm-v2-lms',course_title:a.p_course_title??null,course_slug:a.p_course_slug??null,student_email:email,student_name:s(a.p_student_name).trim()||contact.full_name};
 const existing=(await client.query(`SELECT id,metadata FROM ${C('enrollments')} WHERE contact_id=?1 AND course_slug=?2 LIMIT 1`,[s(contact.id),s(a.p_course_slug)]))[0];
 let id:string;
 if(!existing){
  id=crypto.randomUUID();
  const r=await client.schema('crm_v2').from('enrollments').insert({id,contact_id:contact.id,user_id:a.p_user_id??null,course_id:a.p_course_id??null,status:s(a.p_status)||'active',activated_at:stamp,expires_at:a.p_expires_at??null,last_seen_at:null,course_slug:a.p_course_slug??null,metadata:meta,updated_at:stamp});
  if(r.error)throw new ShimFailure(r.error.message,r.error.code);
 }else{
  id=s(existing.id);
  await client.query(`UPDATE ${C('enrollments')} SET user_id=coalesce(?2,user_id),course_id=?3,status=coalesce(nullif(?4,''),status),expires_at=coalesce(?5,expires_at),metadata=?6,updated_at=?7 WHERE id=?1`,
   [id,(a.p_user_id as string)??null,(a.p_course_id as string)??null,s(a.p_status),a.p_expires_at?pgTimestamp(a.p_expires_at):null,merge(existing.metadata,meta),stamp]);
 }
 return {id,contact_id:contact.id};
}

async function insertLead(client:D1PostgrestClient,row:ShimRow){const r=await client.from('leads').insert(row);if(r.error)throw new ShimFailure(r.error.message,r.error.code);}

async function updateEnrollment(client:D1PostgrestClient,a:Record<string,unknown>,now:number){
 const status=s(a.p_status),stamp=iso(now);
 if(!['active','completed','paused','revoked'].includes(status))throw fail('invalid_enrollment_status');
 const e=(await client.query(`SELECT * FROM ${C('enrollments')} WHERE id=?1`,[s(a.p_enrollment_id)]))[0];
 if(!e)throw new ShimFailure('query returned no rows','P0002');
 const c=(await client.query(`SELECT email,full_name,phone FROM ${C('contacts')} WHERE id=?1`,[s(e.contact_id)]))[0];
 let meta:ShimRow={};try{meta=JSON.parse(s(e.metadata)||'{}');}catch{meta={};}
 const email=(s(c?.email).trim().toLowerCase()||s(meta.student_email).trim().toLowerCase())||null;
 const course=(await client.query(`SELECT slug FROM ${P('courses')} c WHERE c.id=?1 OR c.slug=?2 LIMIT 1`,[s(e.course_id),s(e.course_slug)]))[0];
 const slug=s(e.course_slug)||(course?s(course.slug):'');
 if(!course||!slug)throw fail('missing_enrollment_course');
 if(status==='paused'||status==='revoked'){
  if(!email)throw fail('missing_email_for_effective_access_revoke');
  // Revoke every effective enrollment of this student for the course.
  await client.query(`UPDATE ${C('enrollments')} AS e SET status=?1,updated_at=?2 WHERE (e.course_slug=?3 OR e.course_id=?4) AND (e.id=?5 OR e.contact_id=?6 OR (?7 IS NOT NULL AND e.user_id=?7) OR lower(json_extract(e.metadata,'$.student_email'))=?8 OR EXISTS(SELECT 1 FROM ${C('contacts')} c WHERE c.id=e.contact_id AND lower(trim(c.email))=?8))`,
   [status,stamp,slug,s(e.course_id)||null,s(e.id),s(e.contact_id)||null,(e.user_id as string)??null,email]);
  await insertLead(client,{name:c?.full_name??null,email,phone:c?.phone??null,source:'admin-access-revoke:'+slug,message:'Thu quyền học từ quản trị khóa học.'});
 }else if(['paused','revoked'].includes(s(e.status))&&a.p_expires_at==null&&email){
  await insertLead(client,{name:c?.full_name??null,email,phone:c?.phone??null,source:'admin-access-grant:'+slug,message:'Khôi phục quyền học từ quản trị khóa học.'});
 }
 await client.query(`UPDATE ${C('enrollments')} SET status=?2,expires_at=?3,user_id=coalesce(?4,user_id),updated_at=?5 WHERE id=?1`,[s(e.id),status,a.p_expires_at?pgTimestamp(a.p_expires_at):null,(a.p_user_id as string)??null,stamp]);
 return {ok:true};
}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const lmsRpcs:Record<string,ShimRpc>={
 crm_v2_lms_upsert_enrollment:async(a,{client,now})=>upsertEnrollment(client,a,now()),
 admin_lms_update_enrollment:async(a,{client,now})=>updateEnrollment(client,a,now()),
 crm_v2_lms_update_enrollment:async(a,{client,now})=>{
  const stamp=iso(now());
  const r=await client.query(`UPDATE ${C('enrollments')} SET status=coalesce(nullif(?2,''),status),expires_at=?3,user_id=coalesce(?4,user_id),updated_at=?5 WHERE id=?1 RETURNING id`,[s(a.p_enrollment_id),s(a.p_status),a.p_expires_at?pgTimestamp(a.p_expires_at):null,(a.p_user_id as string)??null,stamp]);
  return {ok:r.length>0};
 },
 admin_lms_set_student_access:async(a,{client,now})=>{
  const email=s(a.p_email).trim().toLowerCase(),slugs=Array.isArray(a.p_course_slugs)?a.p_course_slugs.map(String):[];
  if(!['grant','revoke'].includes(s(a.p_action))||!email||slugs.length<1||slugs.length>100||new Set(slugs).size!==slugs.length)throw fail('invalid_access_change');
  const t=now();
  for(const slug of slugs){
   const course=(await client.query(`SELECT id,title FROM ${P('courses')} WHERE slug=?1`,[slug]));
   if(course.length!==1)throw new ShimFailure('query returned no rows','P0002');
   const result=await upsertEnrollment(client,{p_course_id:course[0].id,p_course_slug:slug,p_course_title:course[0].title,p_student_name:a.p_name,p_email:email,p_phone:null,p_user_id:a.p_user_id??null,p_status:a.p_action==='grant'?'active':'revoked',p_expires_at:null},t);
   if(a.p_action==='revoke')await updateEnrollment(client,{p_enrollment_id:result.id,p_status:'revoked',p_expires_at:null,p_user_id:a.p_user_id??null},t);
   else{
    await client.query(`UPDATE ${C('enrollments')} SET expires_at=NULL,updated_at=?2 WHERE id=?1`,[result.id,iso(t)]);
    await insertLead(client,{name:a.p_name??null,email,phone:a.p_phone??null,source:'admin-access-grant:'+slug,message:'Cấp quyền học từ quản trị học viên.'});
   }
  }
  return {ok:true,changed:slugs.length};
 },
 admin_lms_reorder:async(a,{client,now})=>{
  const ids=Array.isArray(a.p_ids)?a.p_ids.map(String):[],kind=s(a.p_kind),parent=a.p_parent_id==null?null:s(a.p_parent_id);
  if(ids.length<1||ids.length>200||ids.some(x=>!UUID.test(x))||new Set(ids).size!==ids.length)throw fail('invalid_reorder_ids');
  const scope=kind==='courses'&&parent===null?{table:P('courses'),where:'1',error:'stale_course_list'}:kind==='modules'&&parent?{table:P('course_modules'),where:'course_id=?2',error:'stale_or_cross_course_modules'}:kind==='lessons'&&parent?{table:P('lessons'),where:'module_id=?2',error:'stale_or_cross_module_lessons'}:null;
  if(!scope)throw fail('invalid_reorder_scope');
  const list=json(ids),stamp=iso(now());
  // Check and write in one D1 batch: a concurrent add/move aborts the reorder.
  const guard=`SELECT CASE WHEN (SELECT count(*) FROM ${scope.table} WHERE ${scope.where})=json_array_length(?1) AND NOT EXISTS(SELECT 1 FROM json_each(?1) x WHERE NOT EXISTS(SELECT 1 FROM ${scope.table} r WHERE r.id=x.value AND ${scope.where==='1'?'1':'r.'+scope.where})) THEN 1 ELSE abs(-9223372036854775808) END AS ok`;
  const update=`UPDATE ${scope.table} SET sort_order=(SELECT x.key+1 FROM json_each(?1) x WHERE x.value=${scope.table}.id),updated_at=?3 WHERE ${scope.where} AND id IN (SELECT value FROM json_each(?1)) AND sort_order IS NOT (SELECT x.key+1 FROM json_each(?1) x WHERE x.value=${scope.table}.id) RETURNING id`;
  const params=[list,parent,stamp];
  // D1 rejects surplus bindings: give each statement exactly ?1..?max.
  const bind=(sql:string)=>params.slice(0,Math.max(...Array.from(sql.matchAll(/\?(\d+)/g),m=>Number(m[1]))));
  if(!client.db.batch){const check=await client.query(guard,bind(guard)).catch(()=>null);if(!check)throw fail(scope.error);const r=await client.query(update,bind(update));return {ok:true,changed:r.length};}
  try{const r=await client.db.batch([{sql:guard,params:bind(guard)},{sql:update,params:bind(update)}]);return {ok:true,changed:r[1]?.length??0};}
  catch{throw fail(scope.error);}
 },
 crm_v2_lms_mark_lesson_completed:async(a,{client,now})=>{
  const email=s(a.p_email).trim().toLowerCase(),uid=s(a.p_user_id),t=now(),stamp=iso(t),done=a.p_completed!==false;
  if(!email||!uid)throw fail('invalid_student_session');
  const e=(await client.query(`SELECT e.* FROM ${C('enrollments')} e LEFT JOIN ${C('contacts')} c ON c.id=e.contact_id WHERE e.course_slug=?1 AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at>?2) AND (e.user_id=?3 OR c.normalized_email=?4) ORDER BY e.updated_at DESC LIMIT 1`,[s(a.p_course_slug),stamp,uid,email]))[0];
  if(!e)throw fail('student_not_enrolled');
  const meta={source:'student-learning-room',course_slug:a.p_course_slug??null,lesson_title:a.p_lesson_title??null};
  const existing=(await client.query(`SELECT id,metadata FROM ${C('course_progress')} WHERE enrollment_id=?1 AND lesson_id=?2 LIMIT 1`,[s(e.id),s(a.p_lesson_id)]))[0];
  if(!existing){
   const r=await client.schema('crm_v2').from('course_progress').insert({enrollment_id:e.id,contact_id:e.contact_id,course_id:a.p_course_id??null,lesson_id:a.p_lesson_id,progress_percent:done?100:0,status:done?'completed':'in_progress',completed_at:done?stamp:null,last_activity_at:stamp,metadata:meta,updated_at:stamp});
   if(r.error)throw new ShimFailure(r.error.message,r.error.code);
  }else await client.query(`UPDATE ${C('course_progress')} SET progress_percent=?2,status=?3,completed_at=?4,last_activity_at=?5,metadata=?6,updated_at=?5 WHERE id=?1`,[s(existing.id),done?100:0,done?'completed':'in_progress',done?stamp:null,stamp,merge(existing.metadata,meta)]);
  const completed=(await client.query(`SELECT lesson_id FROM ${C('course_progress')} WHERE enrollment_id=?1 AND (status='completed' OR completed_at IS NOT NULL)`,[s(e.id)])).map(r=>r.lesson_id);
  const total=Number(a.p_total_lessons??0),percent=total>0?Math.round(completed.length/total*100):0;
  await client.query(`UPDATE ${C('enrollments')} SET last_seen_at=?2,status=CASE WHEN ?3>=100 THEN 'completed' ELSE status END,metadata=?4,updated_at=?2 WHERE id=?1`,[s(e.id),stamp,percent,merge(e.metadata,{progress_percent:percent,last_lesson_id:a.p_lesson_id??null,last_lesson_title:a.p_lesson_title??null})]);
  return {ok:true,enrollment_id:e.id,progress_percent:percent,completed_lesson_ids:completed};
 },
};
