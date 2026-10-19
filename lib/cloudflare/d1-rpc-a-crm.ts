// D1 ports of the Supabase A CRM read RPCs (crm_v2_*_raw, LMS enrollment
// readers). Rows are read through the shim (decoded like PostgREST) and the
// ranking/filter/sort/paging of the SQL originals is done here, which also
// gives Unicode lower() for Vietnamese search like Postgres.
import {ShimFailure,type D1PostgrestClient,type ShimRow,type ShimRpc} from './d1-postgrest';

async function all(client:D1PostgrestClient,key:string,columns='*'){
 const [schema,table]=key.split('.');const r=await client.schema(schema).from(table).select(columns);
 if(r.error)throw new ShimFailure(r.error.message,r.error.code);return (r.data??[]) as ShimRow[];
}
const s=(v:unknown)=>v===null||v===undefined?'':String(v);
const lower=(v:unknown)=>s(v).toLocaleLowerCase('vi');
const day=(v:unknown)=>s(v).slice(0,10);
const today=(now:number)=>new Date(now).toISOString().slice(0,10);
const daysAgo=(now:number,n:number)=>new Date(now-n*86400000).toISOString().slice(0,10);
const num=(v:unknown)=>v===null||v===undefined||v===''?null:Number(v);
export function leadStageRank(stage:unknown){return ({paid:70,pending_payment:60,disqualified:50,high_intent:40,consulting:30,not_contacted:20,new:10} as Record<string,number>)[lower(stage||'new')]??0;}
const groupKey=(r:ShimRow)=>s(r.contact_id??r.id);
const cmp=(a:unknown,b:unknown)=>a===b?0:a===null||a===undefined?1:b===null||b===undefined?-1:(a as number|string)<(b as number|string)?-1:1;
// ORDER BY x ASC|DESC NULLS LAST
const by=(get:(r:ShimRow)=>unknown,asc:boolean)=>(x:ShimRow,y:ShimRow)=>{const a=get(x),b=get(y);if(a==null&&b==null)return 0;if(a==null)return 1;if(b==null)return -1;return asc?cmp(a,b):-cmp(a,b);};
function params(a:Record<string,unknown>,now:number,sortDefault:string){
 const page=Math.max(1,Number(a.p_page??1)||1),size=Math.max(1,Math.min(Number(a.p_page_size??20)||20,50));
 const filters=(a.p_filters&&typeof a.p_filters==='object'?a.p_filters:{}) as Record<string,unknown>;
 return {page,size,search:lower(a.p_search).trim(),sortBy:s(a.p_sort_by||sortDefault),dir:lower(a.p_sort_direction||'desc'),filters:(k:string)=>s(filters[k]),
  from:a.p_date_from?s(a.p_date_from).slice(0,10):daysAgo(now,29),to:a.p_date_to?s(a.p_date_to).slice(0,10):today(now),hasDates:'p_date_from' in a||'p_date_to' in a};
}
const like=(term:string,...values:unknown[])=>!term||values.some(v=>lower(v).includes(term));
// One effective lead per contact: highest stage rank, then newest.
function rankLeads(rows:ShimRow[]){
 const best=new Map<string,ShimRow>();
 for(const r of rows){const k=groupKey(r),cur=best.get(k);if(!cur||leadStageRank(r.stage)>leadStageRank(cur.stage)||(leadStageRank(r.stage)===leadStageRank(cur.stage)&&s(r.created_at)>s(cur.created_at)))best.set(k,r);}
 return best;
}
const isPaid=(status:unknown)=>['paid','success','completed'].includes(lower(status));

export const crmRpcs:Record<string,ShimRpc>={
 crm_v2_stage_counts_raw:async(_a,{client})=>{
  const leads=(await all(client,'crm_v2.leads','id,contact_id,stage,status,created_at')).filter(l=>s(l.status)!=='archived');
  const counts=new Map<string,number>();for(const l of rankLeads(leads).values()){const k=s(l.stage)||'new';counts.set(k,(counts.get(k)??0)+1);}
  return Array.from(counts,([stage,count])=>({stage,count})).sort((x,y)=>x.stage<y.stage?-1:1);
 },
 crm_v2_leads_list_raw:async(a,{client,now})=>{
  const p=params(a,now(),'createdAt');
  const contacts=new Map((await all(client,'crm_v2.contacts','id,full_name,email,phone,metadata')).map(c=>[s(c.id),c]));
  const leads=(await all(client,'crm_v2.leads','id,contact_id,stage,status,source,lead_score,email_status,potential_value,next_action,last_touch_at,metadata,course_id,course_slug,owner_id,created_at')).filter(l=>{
   const c=contacts.get(s(l.contact_id));
   return s(l.status)!=='archived'&&(!p.hasDates||(day(l.created_at)>=p.from&&day(l.created_at)<=p.to))
    &&(!p.filters('source')||l.source===p.filters('source'))&&(!p.filters('owner')||s(l.owner_id)===p.filters('owner'))&&(!p.filters('course')||l.course_slug===p.filters('course'))
    &&like(p.search,c?.full_name,c?.email,c?.phone,l.source,l.course_slug,(l.metadata as ShimRow|null)?.course_title);
  });
  // Effective values span every visible lead of the same contact (window max).
  const eff=new Map<string,{score:number;value:number;touch:string}>();
  for(const l of leads){const k=groupKey(l),e=eff.get(k)??{score:0,value:0,touch:''};e.score=Math.max(e.score,num(l.lead_score)??0);e.value=Math.max(e.value,num(l.potential_value)??0);const t=s(l.last_touch_at??l.created_at);if(t>e.touch)e.touch=t;eff.set(k,e);}
  const chosen=Array.from(rankLeads(leads).values()).filter(l=>(!p.filters('stage')||l.stage===p.filters('stage'))&&(!p.filters('status')||l.status===p.filters('status')));
  const asc=p.dir==='asc';chosen.sort(p.sortBy==='leadScore'?by(r=>eff.get(groupKey(r))!.score,asc):by(r=>r.created_at,asc));
  const page=chosen.slice((p.page-1)*p.size,p.page*p.size).map(l=>{const c=contacts.get(s(l.contact_id)),e=eff.get(groupKey(l))!;return {
   id:l.id,contact_id:l.contact_id,stage:l.stage,status:l.status,source:l.source,lead_score:e.score,email_status:l.email_status,potential_value:e.value,next_action:l.next_action,
   last_touch_at:e.touch||null,metadata:l.metadata,course_id:l.course_id,course_slug:l.course_slug,owner_id:l.owner_id,created_at:l.created_at,
   contact:{full_name:c?.full_name??null,email:c?.email??null,phone:c?.phone??null,metadata:c?.metadata??null}};});
  return {total:chosen.length,rows:page};
 },
 crm_v2_orders_list_raw:async(a,{client,now})=>{
  const p=params(a,now(),'created');
  const contacts=new Map((await all(client,'crm_v2.contacts','id,full_name,email,phone')).map(c=>[s(c.id),c]));
  const rows=(await all(client,'crm_v2.orders','id,contact_id,order_code,product_name,amount,discount_amount,net_amount,currency,status,payment_gateway,source,owner_id,due_at,created_at,course_slug,metadata')).filter(o=>{
   const c=contacts.get(s(o.contact_id));
   return (!p.hasDates||(day(o.created_at)>=p.from&&day(o.created_at)<=p.to))&&(!p.filters('status')||o.status===p.filters('status'))&&(!p.filters('source')||o.source===p.filters('source'))
    &&(!p.filters('owner')||s(o.owner_id)===p.filters('owner'))&&(!p.filters('course')||o.course_slug===p.filters('course'))
    &&like(p.search,o.order_code,o.product_name,o.status,o.source,o.course_slug,c?.full_name,c?.email,c?.phone);
  });
  const asc=p.dir==='asc';rows.sort(p.sortBy==='value'?by(r=>num(r.net_amount)??num(r.amount)??0,asc):by(r=>r.created_at,asc));
  return {total:rows.length,rows:rows.slice((p.page-1)*p.size,p.page*p.size).map(o=>{const c=contacts.get(s(o.contact_id));return {...o,contact:{full_name:c?.full_name??null,email:c?.email??null,phone:c?.phone??null}};})};
 },
 crm_v2_students_list_raw:async(a,{client,now})=>{
  const p=params(a,now(),'lastLearned');
  const contacts=new Map((await all(client,'crm_v2.contacts','id,full_name,email,phone')).map(c=>[s(c.id),c]));
  const orders=new Map((await all(client,'crm_v2.orders','id,product_name,order_code')).map(o=>[s(o.id),o]));
  const rows=(await all(client,'crm_v2.enrollments','id,contact_id,course_id,course_slug,order_id,status,activated_at,last_seen_at,owner_id,metadata,created_at')).filter(e=>{
   const c=contacts.get(s(e.contact_id)),o=orders.get(s(e.order_id));
   return (!p.hasDates||(day(e.created_at)>=p.from&&day(e.created_at)<=p.to))&&(!p.filters('status')||e.status===p.filters('status'))&&(!p.filters('owner')||s(e.owner_id)===p.filters('owner'))&&(!p.filters('course')||e.course_slug===p.filters('course'))
    &&like(p.search,c?.full_name,c?.email,c?.phone,e.course_slug,e.status,o?.product_name);
  });
  rows.sort(by(r=>r.last_seen_at??r.created_at,p.dir==='asc'));
  return {total:rows.length,rows:rows.slice((p.page-1)*p.size,p.page*p.size).map(e=>{const c=contacts.get(s(e.contact_id)),o=orders.get(s(e.order_id));return {...e,contact:{full_name:c?.full_name??null,email:c?.email??null,phone:c?.phone??null},order:{product_name:o?.product_name??null,order_code:o?.order_code??null}};})};
 },
 crm_v2_dashboard_raw:async(a,{client,now})=>{
  const t=now(),from=a.p_date_from?s(a.p_date_from).slice(0,10):daysAgo(t,29),to=a.p_date_to?s(a.p_date_to).slice(0,10):today(t),inRange=(v:unknown)=>day(v)>=from&&day(v)<=to;
  const daily=(await all(client,'crm_v2.crm_daily_metrics','metric_date,new_leads,mql,paid_orders,revenue,email_revenue,active_automation')).filter(r=>inRange(r.metric_date)).sort(by(r=>r.metric_date,true));
  const leadRows=(await all(client,'crm_v2.leads','id,contact_id,stage,status,source,potential_value,created_at,metadata')).filter(l=>s(l.status)!=='archived');
  const effective=Array.from(rankLeads(leadRows).values()).map(l=>({...l,stage:s(l.stage)||'new',source:s(l.source)||'unknown'}) as ShimRow&{stage:string;source:string});
  const count=<T,>(list:T[],key:(x:T)=>string)=>{const m=new Map<string,number>();for(const x of list)m.set(key(x),(m.get(key(x))??0)+1);return m;};
  const stages=Array.from(count(effective,l=>l.stage),([stage,c])=>({stage,count:c})).sort((x,y)=>x.stage<y.stage?-1:1);
  const sources=Array.from(count(effective.filter(l=>inRange(l.created_at)),l=>l.source),([source,c])=>({source,count:c})).sort((x,y)=>y.count-x.count).slice(0,8);
  const orders=(await all(client,'crm_v2.orders','id,status,net_amount,amount,product_name,course_slug,metadata,paid_at,created_at')).filter(o=>inRange(o.created_at)).map(o=>({...o,value:num(o.net_amount)??num(o.amount)??0}) as ShimRow&{value:number});
  const paid=orders.filter(o=>isPaid(o.status));
  const courseName=(o:ShimRow)=>s(o.product_name)||s((o.metadata as ShimRow|null)?.course_title)||s(o.course_slug)||'Legacy order';
  const courseMap=new Map<string,{name:string;paid:number;revenue:number}>();
  for(const o of orders){const n=courseName(o),c=courseMap.get(n)??{name:n,paid:0,revenue:0};if(isPaid(o.status)){c.paid++;c.revenue+=o.value;}courseMap.set(n,c);}
  const emailRows=(await all(client,'crm_v2.email_events','event_type,occurred_at')).filter(e=>inRange(e.occurred_at));
  const emailEvents=Array.from(count(emailRows,e=>lower(e.event_type||'unknown')),([event_type,c])=>({event_type,count:c})).sort((x,y)=>x.event_type<y.event_type?-1:1);
  const recent=(await all(client,'crm_v2.crm_events','id,event_type,event_source,occurred_at,metadata')).sort(by(r=>r.occurred_at,false)).slice(0,10);
  const workflows=(await all(client,'crm_v2.workflows','id,name,status,updated_at')).filter(w=>['active','published','running'].includes(s(w.status))).sort(by(r=>r.updated_at,false)).slice(0,5);
  const tasks=(await all(client,'crm_v2.tasks','title,status,due_at,metadata')).filter(x=>['open','in_progress'].includes(s(x.status))).sort(by(r=>r.due_at,true)).slice(0,5);
  const todayKey=today(t);
  const newToday=new Set(leadRows.filter(l=>day(l.created_at)===todayKey&&s((l.metadata as ShimRow|null)?.source_table||'public.leads')!=='public.orders').map(groupKey)).size;
  return {daily,lead_stages:stages,lead_sources:sources,orders:{paid_orders:paid.length,revenue:paid.reduce((n,o)=>n+o.value,0)},email_events:emailEvents,recent_events:recent,workflows,tasks,
   courses:Array.from(courseMap.values()).sort((x,y)=>y.revenue-x.revenue).slice(0,5),counts:{new_leads_today:newToday,mql:effective.filter(l=>['consulting','high_intent','pending_payment','paid'].includes(l.stage)).length}};
 },
 crm_v2_lms_enrollments_raw:async(_a,{client})=>{
  const contacts=new Map((await all(client,'crm_v2.contacts')).map(c=>[s(c.id),c]));
  return {enrollments:(await all(client,'crm_v2.enrollments')).map(e=>({...e,contacts:contacts.get(s(e.contact_id))??null})),progress:await all(client,'crm_v2.course_progress')};
 },
 crm_v2_command_center_enrollments_page:async(a,{client})=>{
  const from=s(a.p_analysis_from),to=s(a.p_analysis_to),offset=Number(a.p_offset),limit=Number(a.p_limit);
  if(!from||!to||Date.parse(from)>=Date.parse(to)||!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>500)throw new ShimFailure('invalid_command_center_page','P0001');
  const contacts=new Map((await all(client,'crm_v2.contacts','id,email,phone')).map(c=>[s(c.id),c]));
  const at=(e:ShimRow)=>s(e.activated_at??e.created_at);
  const rows=(await all(client,'crm_v2.enrollments')).filter(e=>['active','paused','completed'].includes(s(e.status))||(Date.parse(at(e))>=Date.parse(from)&&Date.parse(at(e))<Date.parse(to)))
   .sort((x,y)=>Date.parse(at(x))-Date.parse(at(y))||(s(x.id)<s(y.id)?-1:1));
  const page=rows.slice(offset,offset+limit).map(e=>{const m=(e.metadata??{}) as ShimRow,c=contacts.get(s(e.contact_id));return {id:e.id,contact_id:e.contact_id,user_id:e.user_id,course_slug:e.course_slug,status:e.status,activated_at:e.activated_at,created_at:e.created_at,expires_at:e.expires_at,order_id:e.order_id,
   metadata:{access_kind:m.access_kind??null,course_slug:m.course_slug??null,student_email:m.student_email??null,student_phone:m.student_phone??null},contacts:{email:c?.email??null,phone:c?.phone??null}};});
  return {rows:page,total_count:rows.length,has_more:offset+page.length<rows.length};
 },
 student_lms_enrollments_scoped:async(a,{client,now})=>{
  const email=lower(a.p_email).trim(),slug=a.p_course_slug==null?null:s(a.p_course_slug),uid=a.p_user_id==null?null:s(a.p_user_id),t=now();
  const contacts=new Map((await all(client,'crm_v2.contacts','id,email')).map(c=>[s(c.id),c]));
  const courses=await all(client,'public.courses','id,slug');const courseSlug=new Map(courses.map(c=>[s(c.id),s(c.slug)]));
  const matching=(await all(client,'crm_v2.enrollments')).filter(e=>{
   const c=contacts.get(s(e.contact_id)),m=(e.metadata??{}) as ShimRow;
   const who=(uid!==null&&s(e.user_id)===uid)||(email!==''&&lower(s(c?.email)||s(m.student_email)).trim()===email);
   const eslug=s(e.course_slug)||s(m.course_slug)||courseSlug.get(s(e.course_id))||'';
   return who&&(slug===null||eslug===slug)&&['active','completed'].includes(s(e.status))&&(e.expires_at==null||Date.parse(s(e.expires_at))>t);
  }).map(e=>({...e,contacts:{email:contacts.get(s(e.contact_id))?.email??null}}) as ShimRow);
  const modules=await all(client,'public.course_modules','id,course_id,status'),lessons=await all(client,'public.lessons','id,module_id,status,youtube_url,embed_url,content');
  const lessonCounts:Record<string,number>={};
  for(const c of courses.filter(c=>slug===null||c.slug===slug)){
   const mods=new Set(modules.filter(m=>m.course_id===c.id&&(s(m.status)||'published')==='published').map(m=>s(m.id)));
   lessonCounts[s(c.slug)]=lessons.filter(l=>mods.has(s(l.module_id))&&(s(l.status)||'published')==='published'&&(s(l.youtube_url).trim()||s(l.embed_url).trim()||s(l.content).trim())).length;
  }
  const ids=new Set(matching.map(e=>s(e.id)));
  const progress=(await all(client,'crm_v2.course_progress','enrollment_id,lesson_id,status,completed_at')).filter(p=>ids.has(s(p.enrollment_id)));
  return {lesson_counts:lessonCounts,enrollments:matching,progress};
 },
};
