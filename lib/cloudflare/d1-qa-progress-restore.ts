// Tooling only: restore one existing QA row after a scoped hosted write test.
// No DELETE, upsert, credential mutation or production route uses this module.
type Row=Record<string,unknown>;
type Statement={sql:string;params:(string|number|null)[]};
export const qaRestoreColumns={
 enrollment:['id','contact_id','user_id','course_id','course_slug','status','expires_at','updated_at','metadata','last_seen_at'],
 progress:['id','enrollment_id','lesson_id','status','progress_percent','completed_at','updated_at','metadata'],
 operation:['id','user_id','normalized_email','course_slug','enrollment_id','lesson_id','completed','lesson_title','status','created_at','response_json'],
} as const;
function row(value:unknown):Row{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid QA restore state');return value as Row;}
function uuid(value:unknown){if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw Error('Invalid QA restore identity');return value;}
function ordered(value:unknown,columns:readonly string[]){const r=row(value);if(Object.keys(r).length!==columns.length||columns.some(c=>!(c in r)||!(r[c]===null||typeof r[c]==='string'||(typeof r[c]==='number'&&Number.isFinite(r[c])))))throw Error('Unexpected QA restore columns');return Object.fromEntries(columns.map(c=>[c,r[c]]));}
function canonical(value:unknown):string{if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Row)[k])).join(',')+'}';return JSON.stringify(value);}
function metadata(value:unknown){if(typeof value!=='string')throw Error('Invalid QA metadata');try{return row(JSON.parse(value))}catch{throw Error('Invalid QA metadata')}}
function jsonRow(columns:readonly string[],alias=''){return `json_object(${columns.map(c=>`'${c}',${alias}${c}`).join(',')})`;}
const enrollmentJson=`(SELECT ${jsonRow(qaRestoreColumns.enrollment)} FROM d1_lms_enrollments WHERE id=?3)`;
const progressJson=`(SELECT ${jsonRow(qaRestoreColumns.progress)} FROM d1_lms_progress WHERE id=?4)`;
const ledgerJson=`(SELECT json_group_array(json(o)) FROM (SELECT ${jsonRow(qaRestoreColumns.operation)} AS o FROM d1_lms_progress_operations ORDER BY id))`;
const scope=`(SELECT count(*) FROM d1_access_users)=1 AND EXISTS(SELECT 1 FROM d1_access_users WHERE id=?1 AND normalized_email=?2 AND admin_role IS NULL)
 AND (SELECT count(*) FROM d1_auth_accounts)=1 AND EXISTS(SELECT 1 FROM d1_auth_accounts WHERE user_id=?1)
 AND NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE revoked_at IS NULL)
 AND (SELECT count(*) FROM d1_lms_enrollments)=1 AND (SELECT count(*) FROM d1_lms_progress)=1
 AND EXISTS(SELECT 1 FROM d1_lms_enrollments e LEFT JOIN d1_lms_contacts c ON c.id=e.contact_id WHERE e.id=?3 AND (e.user_id=?1 OR c.normalized_email=?2))`;

export function prepareQaProgressRestore(input:unknown){
 const request=row(input),qa=row(request.qa),uid=uuid(qa.userId),mail=qa.email;
 if(typeof mail!=='string'||!mail||mail!==mail.trim().toLowerCase())throw Error('Exact QA email required');
 const before=row(request.before),after=row(request.after);
 const e0=ordered(before.enrollment,qaRestoreColumns.enrollment),p0=ordered(before.progress,qaRestoreColumns.progress);
 const e1=ordered(after.enrollment,qaRestoreColumns.enrollment),p1=ordered(after.progress,qaRestoreColumns.progress);
 const enrollmentId=uuid(e0.id),progressId=uuid(p0.id),lessonId=uuid(p0.lesson_id);
 if(p0.enrollment_id!==enrollmentId||e0.status!=='active'||!['not_started','in_progress'].includes(String(p0.status))||p0.progress_percent!==0||p0.completed_at!==null)throw Error('Uncompleted existing QA progress required');
 if(!Number.isInteger(before.lessonCount)||Number(before.lessonCount)<1||after.lessonCount!==before.lessonCount)throw Error('Stable published lesson count required');
 const operations=(value:unknown)=>{if(!Array.isArray(value))throw Error('Invalid QA ledger');return value.map(v=>ordered(v,qaRestoreColumns.operation)).sort((a,b)=>String(a.id).localeCompare(String(b.id)))};
 const oldOps=operations(before.operations),allOps=operations(after.operations);
 if(oldOps.some(o=>o.user_id!==uid||o.normalized_email!==mail||o.status!=='applied'))throw Error('Only existing QA operation history allowed');
 if(!Array.isArray(request.plannedOperations)||request.plannedOperations.length!==2)throw Error('Two planned QA intents required');
 const plan=request.plannedOperations.map((v,i)=>{const o=row(v);if(o.completed!==(i===0))throw Error('QA completion/undo order required');return {id:uuid(o.id),completed:i===0?1:0}});
 if(plan[0].id===plan[1].id||oldOps.some(o=>plan.some(p=>p.id===o.id)))throw Error('Fresh QA operation IDs required');
 if(oldOps.some(old=>!allOps.some(current=>canonical(current)===canonical(old))))throw Error('Historical ledger changed');
 const changes=allOps.filter(o=>!oldOps.some(old=>old.id===o.id));
 if(changes.length<1||changes.length>2||allOps.length!==oldOps.length+changes.length)throw Error('Only planned QA changes allowed');
 for(const op of changes){
  const planned=plan.find(p=>p.id===op.id);
  if(!planned||op.completed!==planned.completed||op.user_id!==uid||op.normalized_email!==mail||op.course_slug!==e0.course_slug||op.enrollment_id!==enrollmentId||op.lesson_id!==lessonId||op.status!=='applied'||typeof op.lesson_title!=='string'||typeof op.created_at!=='string'||!Number.isFinite(Date.parse(op.created_at)))throw Error('Unrecognized QA write');
  const response=row(JSON.parse(String(op.response_json)));
  const expectedPercent=Math.round(Number(op.completed)*100/Number(before.lessonCount));
  if(response.ok!==true||response.enrollmentId!==enrollmentId||response.progressPercent!==expectedPercent||canonical(response.completedLessonIds)!==canonical(op.completed?[lessonId]:[]))throw Error('QA response does not match persisted intent');
 }
 if(!changes.some(o=>o.id===plan[0].id))throw Error('Initial QA completion missing');
 const last=changes.find(o=>o.id===plan[1].id)??changes.find(o=>o.id===plan[0].id)!;
 const previous=changes.find(o=>o.id===plan[0].id)!;
 if(Date.parse(String(last.created_at))<Date.parse(String(previous.created_at)))throw Error('QA ledger chronology changed');
 const percent=(JSON.parse(String(last.response_json)) as Row).progressPercent;
 const pExpected={...p0,status:last.completed?'completed':'in_progress',progress_percent:last.completed?100:0,completed_at:last.completed?last.created_at:null,updated_at:last.created_at,
  metadata:{...metadata(p0.metadata),source:'student-learning-room',course_slug:e0.course_slug,lesson_title:last.lesson_title}};
 const anyComplete=changes.some(o=>(JSON.parse(String(o.response_json)) as Row).progressPercent===100);
 const eExpected={...e0,status:anyComplete?'completed':e0.status,last_seen_at:last.created_at,updated_at:last.created_at,
  metadata:{...metadata(e0.metadata),progress_percent:percent,last_lesson_id:lessonId,last_lesson_title:last.lesson_title}};
 if(canonical({...p1,metadata:metadata(p1.metadata)})!==canonical(pExpected)||canonical({...e1,metadata:metadata(e1.metadata)})!==canonical(eExpected))throw Error('Current rows are not the planned QA mutation');
 const params=(e:Row,p:Row)=>[uid,mail,enrollmentId,progressId,JSON.stringify(e),JSON.stringify(p),JSON.stringify(allOps),Number(before.lessonCount)];
 const assertion=`SELECT CASE WHEN ${scope} AND ${enrollmentJson}=?5 AND ${progressJson}=?6 AND ${ledgerJson}=?7
 AND (SELECT count(*) FROM d1_lms_lessons l JOIN d1_lms_modules m ON m.id=l.module_id JOIN d1_lms_courses c ON c.id=m.course_id WHERE c.slug=(SELECT course_slug FROM d1_lms_enrollments WHERE id=?3) AND m.status='published' AND l.status='published' AND l.playable=1)=?8
 THEN 1 ELSE json('qa_restore_conflict') END AS matched`;
 const update=(table:string,target:Row,columns:readonly string[])=>({sql:`UPDATE ${table} SET ${columns.map((c,i)=>`${c}=?${i+1}`).join(',')} WHERE id=?${columns.length+1}`,params:[...columns.map(c=>target[c] as string|number|null),target.id as string]});
 const statements:Statement[]=[{sql:assertion,params:params(e1,p1)},update('d1_lms_progress',p0,['status','progress_percent','completed_at','updated_at','metadata']),update('d1_lms_enrollments',e0,['status','updated_at','metadata','last_seen_at']),{sql:assertion,params:params(e0,p0)}];
 return {statements,restoredRows:2,retainedOperations:allOps.length};
}
